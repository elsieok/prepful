/**
 * apps/web/src/test/analytics.test.ts
 *
 * Tests the /api/analytics route handler in isolation.
 * We mock @clerk/nextjs/server and @repo/db so no real DB or auth is needed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- mock Clerk auth ---
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// --- mock Prisma db ---
vi.mock('@repo/db', () => ({
  db: {
    user: { findUnique: vi.fn() },
    analyticsEvent: { groupBy: vi.fn() },
    codingSession: { findMany: vi.fn() },
    mockInterview: { findMany: vi.fn() },
  },
}));

import { auth } from '@clerk/nextjs/server';
import { db } from '@repo/db';
import { GET } from '../app/api/analytics/route';

const mockAuth = vi.mocked(auth);
const mockFindUser = vi.mocked(db.user.findUnique);
const mockGroupBy = vi.mocked(db.analyticsEvent.groupBy);
const mockSessionMany = vi.mocked(db.codingSession.findMany);
const mockInterviewMany = vi.mocked(db.mockInterview.findMany);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/analytics', () => {
  it('returns 401 when not authenticated', async () => {
    // Simulates a request with no active Clerk session
    mockAuth.mockResolvedValue({ userId: null } as never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 404 when user is not in the database', async () => {
    // Clerk knows the user but they were never synced to our DB via webhook
    mockAuth.mockResolvedValue({ userId: 'clerk_123' } as never);
    mockFindUser.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it('returns analytics data for a valid user', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_123' } as never);
    mockFindUser.mockResolvedValue({ id: 'db_user_1' } as never);
    mockGroupBy.mockResolvedValue([]);
    mockSessionMany.mockResolvedValue([
      { createdAt: new Date('2026-01-01'), passed: true, language: 'javascript' } as never,
    ]);
    mockInterviewMany.mockResolvedValue([
      { score: 85, company: 'Google', createdAt: new Date('2026-01-02') } as never,
    ]);

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.codingSessions).toHaveLength(1);
    expect(body.mockInterviews).toHaveLength(1);
    expect(body.mockInterviews[0].score).toBe(85);
  });

  it('only fetches sessions from the last 30 days', async () => {
    // Verifies the date filter is applied — we inspect what was passed to findMany
    mockAuth.mockResolvedValue({ userId: 'clerk_123' } as never);
    mockFindUser.mockResolvedValue({ id: 'db_user_1' } as never);
    mockGroupBy.mockResolvedValue([]);
    mockSessionMany.mockResolvedValue([]);
    mockInterviewMany.mockResolvedValue([]);

    await GET();

    const callArgs = mockSessionMany.mock.calls[0][0] as { where: { createdAt: { gte: Date } } };
    const cutoff = callArgs.where.createdAt.gte;
    const msAgo = Date.now() - cutoff.getTime();
    const daysAgo = msAgo / (1000 * 60 * 60 * 24);

    // Allow a few seconds of drift in the test
    expect(daysAgo).toBeCloseTo(30, 0);
  });
});