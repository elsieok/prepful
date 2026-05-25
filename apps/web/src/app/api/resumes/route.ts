import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { auth } from "@clerk/nextjs/server";
import { db } from '@repo/db'

const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null
});
const resumeQueue = new Queue('resume-analysis', { connection });

export async function POST(req: Request) {
    const { s3Key, fileName } = await req.json();
    const { userId } = await auth();

    if (!userId) {
        return new Response('Unauthorized', { status: 401 })
    }

    const dbUser = await db.user.findUnique({
        where: { ClerkId: userId }
    })

    if (!dbUser) {
        return new Response('User not found', { status: 404 })
    }

    // save to database
    const resume = await db.resume.create({
        data: { userId: dbUser.id, s3Key, fileName, status: 'PENDING' }
    })

    // enqueue analysis
    await resumeQueue.add('analyse', { resumeId: resume.id, s3Key });

    return Response.json({ resumeId: resume.id });
}