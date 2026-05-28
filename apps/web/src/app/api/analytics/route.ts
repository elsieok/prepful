import { auth } from 'clerk/nextjs/server';
import { db } from '@repo/db';
import { NextResponse } from 'next/server';

export async function GET() {
    const { userId } = await auth();
    if (!userId) {
        return new Response('Unauthorized', { status: 401 });
    }

    const dbUser = await db.user.findUnique({ where: { clerkId: userId } });
    if (!dbUser) {
        return new Response('User not found', { status: 404 });
    }

    const thirtyDaysAgo = newDate(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [events, codingSessions, mockInterview] = await Promise.all([
    db.analyticsEvent.groupBy({
      by: ['eventType'],
      where: { userId: dbUser.id, createdAt: { gte: thirtyDaysAgo } },
      _count: { id: true }
    }),
    db.codingSession.findMany({
      where: { userId: dbUser.id, createdAt: { gte: thirtyDaysAgo } },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, passed: true, language: true }
    }),
    db.mockInterview.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { score: true, company: true, createdAt: true }
    })
  ]);

  return NextResponse.json({ events, codingSessions, mockInterviews });
}