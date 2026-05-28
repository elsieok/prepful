import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { messages, company, role } = await req.json();

  const result = await streamText({
    model: openai('gpt-4o'),
    system: `You are conducting a ${role} technical interview at ${company}.
      Ask one focused technical question at a time.
      After the candidate answers, give brief constructive feedback in 2-3 sentences,
      then ask the next question. Keep all responses under 150 words.
      Start by introducing yourself and asking the first question.`,
    messages,
  });

  return result.toTextStreamResponse();
}