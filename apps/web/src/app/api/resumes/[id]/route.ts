import { auth } from '@clerk/nextjs/server';
import { db } from '@repo/db';
import { NextResponse } from 'next/server';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;

  const dbUser = await db.user.findUnique({ where: { clerkId: userId } });
  if (!dbUser) return new Response('User not found', { status: 404 });

  const resume = await db.resume.findFirst({
    where: { id, userId: dbUser.id },
    select: { status: true, analysisRaw: true },
  });

  if (!resume) return new Response('Not found', { status: 404 });

  return NextResponse.json(resume);
}