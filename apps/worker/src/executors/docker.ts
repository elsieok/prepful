import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export const IMAGES = [
  'node:20-alpine',
  'python:3.12-alpine',
  'eclipse-temurin:21-alpine',
] as const;

export async function pullImages(): Promise<void> {
  await Promise.all(
    IMAGES.map(async (image) => {
      console.log(`[docker] Pulling ${image}...`);

      try {
        await execFileAsync('docker', ['pull', image], {
          timeout: 10 * 60 * 1000,
        });

        console.log(`[docker] Pulled ${image}`);
      } catch (error) {
        console.error(`[docker] Failed to pull ${image}`, error);
        throw error;
      }
    })
  );
}