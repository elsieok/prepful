import {S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { auth } from "@clerk/nextjs/server";

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) {
        return new Response('Unauthorized', { status: 401 });
    }

    const { fileName, contentType } = await req.json();
    const key = `resumes/${userId}/${Date.now()}-${fileName}`;

    const url = await getSignedUrl(
        s3,
        new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
            ContentType: contentType,
        }),
        { expiresIn: 300 }  // URL invalid after 5 minutes

    );

    return Response.json({ url, key });
}
