import { Worker } from 'bullmq';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { PDFParse}  from 'pdf-parse';
import OpenAI from 'openai';
import { db } from '@repo/db';
import { Redis } from 'ioredis';
import { withRetry } from 'lib';
import { analyseResume } from './analysers/resume';

const s3 = new S3Client({ region: process.env.AWS_REGION });
const pdf = require('pdf-parse');
const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null
});

const worker = new Worker('resume-analysis', async (job) => {
    const { resumeId, s3Key } = job.data;

    // mark as processing
    await db.resume.update({ where: {id: resumeId },
        data: { status: 'PROCESSING' } 
    });

    // download pdf from s3
    const s3Response = await s3.send(new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET, Key: s3Key
    }));

    const buffer = Buffer.from(await s3Response.Body!.transformToByteArray());

    // parse pdf text
    const { text } = await pdf(buffer);

    // call openai
    const analysis = await withRetry(() => analyseResume(text));

    // save results
    await db.resume.update({ where: { id: resumeId },
        data: { status: 'COMPLETE', analysisRaw: analysis } });

}, { connection });
