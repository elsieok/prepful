import crypto from 'crypto';
import { execFile } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export type ExecutionResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
  timeTaken: number;
};

type Language = 'javascript' | 'python' | 'java';

const LANGUAGE_CONFIG: Record<
  Language,
  { ext: string; image: string; command: (filename: string) => string[] }
> = {
  javascript: {
    ext: 'js',
    image: 'node:20-alpine',
    command: (filename) => ['node', filename],
  },
  python: {
    ext: 'py',
    image: 'python:3.12-alpine',
    command: (filename) => ['python', filename],
  },
  java: {
    ext: 'java',
    image: 'eclipse-temurin:21-alpine',
    command: (filename) => [
      'sh', '-c',
      `javac ${filename} && java ${path.parse(filename).name}`,
    ],
  },
};

export async function executeCode(code: string, language: Language): Promise<ExecutionResult> {
  const config = LANGUAGE_CONFIG[language];
  const tmpDir = path.join(os.tmpdir(), `exec-${crypto.randomUUID()}`);
  await fs.mkdir(tmpDir, { recursive: true });

  const filename = language === 'java' ? 'Main.java' : `solution.${config.ext}`;
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