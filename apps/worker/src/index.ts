import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { z } from 'zod';
import { db } from '@repo/db';
import { withRetry } from 'lib';
import { analyseResume } from './analysers/resume';

const pdf = require('pdf-parse');

const EnvSchema = z.object({
  AWS_REGION: z.string(),
  AWS_S3_BUCKET: z.string(),
  REDIS_URL: z.string().url(),
});

const env = EnvSchema.parse(process.env);

const ResumeJobSchema = z.object({
  resumeId: z.string(),
  s3Key: z.string(),
});

type ResumeJob = z.infer<typeof ResumeJobSchema>;

const s3 = new S3Client({
  region: env.AWS_REGION,
});

const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

const worker = new Worker<ResumeJob>(
  'resume-analysis',
  async (job) => {
    const { resumeId, s3Key } =
      ResumeJobSchema.parse(job.data);

    console.log(`[worker] Processing resume ${resumeId}`);

    try {
      await db.resume.update({
        where: { id: resumeId },
        data: {
          status: 'PROCESSING',
        },
      });

      const s3Response = await s3.send(
        new GetObjectCommand({
          Bucket: env.AWS_S3_BUCKET,
          Key: s3Key,
        })
      );

      if (!s3Response.Body) {
        throw new Error('S3 response body is empty');
      }

      const buffer = Buffer.from(
        await s3Response.Body.transformToByteArray()
      );

      const { text } = await pdf(buffer);

      if (!text.trim()) {
        throw new Error('No text extracted from PDF');
      }

      const analysis = await withRetry(() =>
        analyseResume(text)
      );

      await db.resume.update({
        where: {
          id: resumeId,
        },
        data: {
          status: 'COMPLETE',
          analysisRaw: analysis,
        },
      });

      console.log(`[worker] Completed ${resumeId}`);
    } catch (error: any) {
      console.error(
        `[worker] Failed processing ${resumeId}`,
        error
      );

      await db.resume.update({
        where: {
          id: resumeId,
        },
        data: {
          status: 'FAILED',
          analysisRaw: {
            error: error.message,
          },
        },
      });

      throw error;
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

worker.on('failed', (job, err) => {
  console.error(
    `[worker] Job failed ${job?.id}`,
    err
  );
});

worker.on('completed', (job) => {
  console.log(
    `[worker] Job completed ${job.id}`
  );
});