/**
 * apps/web/src/test/webhook-clerk.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// The verify fn is shared so we can control it per-test
const mockVerify = vi.fn();

vi.mock('svix', () => ({
  // Must use `function` (not arrow) so `new Webhook()` works as a constructor
  Webhook: vi.fn().mockImplementation(function () {
    return { verify: mockVerify };
  }),
}));

vi.mock('@repo/db', () => ({
  db: {
    user: {
      create: vi.fn(),
    },
  },
}));

import { db } from '@repo/db';
import { POST } from '../app/api/webhooks/clerk/route';

const mockCreate = vi.mocked(db.user.create);

function makeRequest(body: object) {
  return new Request('http://localhost/api/webhooks/clerk', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'svix-id': 'test-id',
      'svix-timestamp': '12345',
      'svix-signature': 'test-sig',
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/webhooks/clerk', () => {
  it('creates a user in the DB on user.created event', async () => {
    const payload = {
      type: 'user.created',
      data: {
        id: 'clerk_abc',
        email_addresses: [{ email_address: 'test@example.com' }],
        first_name: 'Jane',
        last_name: 'Doe',
        image_url: 'https://example.com/avatar.png',
      },
    };

    mockVerify.mockReturnValue(payload);
    mockCreate.mockResolvedValue({} as never);

    const res = await POST(makeRequest(payload));
    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        clerkId: 'clerk_abc',
        email: 'test@example.com',
        name: 'Jane Doe',
        avatarUrl: 'https://example.com/avatar.png',
      },
    });
  });

  it('does not create a user for unrecognised event types', async () => {
    mockVerify.mockReturnValue({ type: 'user.updated', data: {} });

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(200);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('throws when svix verification fails', async () => {
    mockVerify.mockImplementation(() => { throw new Error('Invalid signature'); });

    await expect(POST(makeRequest({}))).rejects.toThrow('Invalid signature');
  });
});