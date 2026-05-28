import { auth } from '@clerk/nextjs/server';
import { db } from '@repo/db';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';

const StudyPlanSchema = z.object({
  weeks: z.array(z.object({
    weekNumber: z.number(),
    focus: z.string(),
    topics: z.array(z.string()),
    leetcodeProblems: z.array(z.string()),
    resources: z.array(z.string()),
  })),
  keyAreasToImprove: z.array(z.string()),
  estimatedReadiness: z.string(),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const dbUser = await db.user.findUnique({ where: { clerkId: userId } });
  if (!dbUser) return new Response('User not found', { status: 404 });

  const { targetCompany, targetRole, timelineWeeks, currentSkillLevel } = await req.json();

  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: StudyPlanSchema,
    prompt: `Create a ${timelineWeeks}-week study plan for a ${currentSkillLevel} engineer 
      targeting a ${targetRole} role at ${targetCompany}. 
      Be specific about LeetCode problem types and real resources.`,
  });

  const plan = await db.studyPlan.create({
    data: {
      userId: dbUser.id,
      targetCompany,
      targetRole,
      timelineWeeks,
      planJson: object,
    }
  });

  return NextResponse.json({ planId: plan.id, plan: object });
}