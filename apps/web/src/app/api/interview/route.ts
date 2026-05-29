import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { auth } from '@clerk/nextjs/server';
import { db } from '@repo/db';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { messages, company, role, interviewId } = await req.json();

  const dbUser = await db.user.findUnique({ where: { clerkId: userId } });
  if (!dbUser) return new Response('User not found', { status: 404 });

  // Create interview record on first message, reuse on subsequent
  let interview;
  if (!interviewId) {
    interview = await db.mockInterview.create({
      data: {
        userId: dbUser.id,
        company,
        role,
        status: 'IN_PROGRESS',
        messages: messages ?? [],
      },
    });
  } else {
    interview = await db.mockInterview.update({
      where: { id: interviewId },
      data: { messages: messages ?? [] },
    });
  }

  const result = await streamText({
    model: openai('gpt-4o'),
    system: `You are conducting a ${role} technical interview at ${company}.
      Ask one focused technical question at a time.
      After the candidate answers, give brief constructive feedback in 2-3 sentences,
      then ask the next question. Keep all responses under 150 words.
      Start by introducing yourself and asking the first question.
      At the end of the interview (after 5-6 questions), provide a score from 0-100
      in the format: SCORE: <number>`,
    messages,
    onFinish: async ({ text }) => {
      // Extract score if present and mark complete
      const scoreMatch = text.match(/SCORE:\s*(\d+)/);
      const score = scoreMatch ? parseInt(scoreMatch[1]!, 10) : null;
      await db.mockInterview.update({
        where: { id: interview.id },
        data: {
          messages: [...(messages ?? []), { role: 'assistant', content: text }],
          ...(score !== null ? { score, status: 'COMPLETE' } : {}),
        },
      });
    },
  });

  // Return interview ID in header so client can track it
  const response = result.toTextStreamResponse();
  const headers = new Headers(response.headers);
  headers.set('X-Interview-Id', interview.id);

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}