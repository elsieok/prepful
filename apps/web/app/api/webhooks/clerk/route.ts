import { Webhook } from 'svix';
import { db } from '@repo/db';

interface ClerkUserCreatedEvent {
  type: string;
  data: {
    id: string;
    email_addresses: { email_address: string }[];
    first_name: string;
    last_name: string;
    image_url: string;
  };
}

export async function POST(req: Request) {
    const body = await req.text();
    const headers = {
        'svix-id': req.headers.get('svix-id') ?? '',
        'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
        'svix-signature': req.headers.get('svix-signature') ?? '',
    };
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
    const event = wh.verify(body, headers) as ClerkUserCreatedEvent;

    if (event.type === 'user.created') {
        await db.user.create({
            data: {
                clerkId: event.data.id,
                email: event.data.email_addresses[0].email_address,
                name: event.data.first_name + ' ' + event.data.last_name,
                avatarUrl: event.data.image_url,
            }
        });
    }

    return new Response('OK', { status: 200 });
}