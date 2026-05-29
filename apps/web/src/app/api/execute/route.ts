import { auth } from '@clerk/nextjs/server';
import { db } from '@repo/db';
import { NextResponse } from 'next/server';

// NOTE: The executeCode function lives in apps/worker/src/executors/executeCode.ts
// For the web app, we call the worker's execution endpoint over HTTP,
// OR we duplicate the lightweight executor here. Since the worker runs Docker,
// the cleanest approach for a monorepo is to expose an internal HTTP endpoint
// from the worker and proxy it here.
//
// This route calls the worker's /execute endpoint (WORKER_URL env var).
// If WORKER_URL is not set, it falls back to a direct implementation for local dev.

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const execFileAsync = promisify(execFile);

type Language = 'javascript' | 'python';

const LANGUAGE_CONFIG: Record<Language, { ext: string; image: string; command: (f: string) => string[] }> = {
  javascript: {
    ext: 'js',
    image: 'node:20-alpine',
    command: (f) => ['node', f],
  },
  python: {
    ext: 'py',
    image: 'python:3.12-alpine',
    command: (f) => ['python', f],
  },
};

async function runInDocker(code: string, language: Language) {
  const config = LANGUAGE_CONFIG[language];
  const tmpDir = path.join(os.tmpdir(), `exec-${crypto.randomUUID()}`);
  await fs.mkdir(tmpDir, { recursive: true });
  const filename = `solution.${config.ext}`;
  const filepath = path.join(tmpDir, filename);
  const start = performance.now();

  try {
    await fs.writeFile(filepath, code, 'utf8');
    const dockerArgs = [
      'run', '--rm',
      '--memory=256m', '--cpus=0.5', '--pids-limit=64',
      '--network=none', '--read-only',
      '--cap-drop=ALL', '--security-opt', 'no-new-privileges',
      '--tmpfs', '/tmp:size=64m',
      '-u', '1000:1000',
      '-v', `${tmpDir}:/code:ro`,
      '-w', '/code',
      '--stop-timeout=5',
      config.image,
      ...config.command(filename),
    ];
    const { stdout, stderr } = await execFileAsync('docker', dockerArgs, {
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
    });
    return { stdout, stderr, exitCode: 0, timeTaken: Math.round(performance.now() - start) };
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; message?: string; code?: number };
    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? err.message ?? 'Unknown error',
      exitCode: err.code ?? 1,
      timeTaken: Math.round(performance.now() - start),
    };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { code, language, problemId } = await req.json();

  if (!code || !language) {
    return NextResponse.json({ error: 'code and language are required' }, { status: 400 });
  }

  if (!['javascript', 'python'].includes(language)) {
    return NextResponse.json({ error: 'Unsupported language' }, { status: 400 });
  }

  // If a dedicated worker URL is configured, proxy to it
  if (process.env.WORKER_URL) {
    const res = await fetch(`${process.env.WORKER_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language }),
    });
    const result = await res.json();
    return NextResponse.json(result);
  }

  // Otherwise run directly (requires Docker on the Next.js host — fine for local dev)
  const result = await runInDocker(code, language as Language);

  // Persist the coding session so the dashboard has data
  try {
    const dbUser = await db.user.findUnique({ where: { clerkId: userId } });
    if (dbUser && problemId) {
      await db.codingSession.create({
        data: {
          userId: dbUser.id,
          problemId,
          language,
          code,
          passed: result.exitCode === 0,
          timeTaken: result.timeTaken,
        },
      });
    }
  } catch (e) {
    // Non-fatal — don't fail the execution response
    console.error('[execute] Failed to save coding session', e);
  }

  return NextResponse.json(result);
}