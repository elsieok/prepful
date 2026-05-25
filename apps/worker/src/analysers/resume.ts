import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ResumeAnalysisSchema = z.object({
  atsScore: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  impactSuggestions: z.array(z.string()),
  overallFeedback: z.string(),
});

export type ResumeAnalysis = z.infer<typeof ResumeAnalysisSchema>;

export async function analyseResume(resumeText: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.2,
    response_format: { 
      type: 'json_object' 
    },
    messages: [{
      role: 'system',
      content: `
      You are a senior technical recruiter at a FAANG company.
      
      Analyse resumes and return ONLY valid JSON with exactly these keys:
      
      {
      "atsScore": number,
      "strengths": string[],
      "weaknesses": string[],
      "missingKeywords": string[],
      "impactSuggestions": string[],
      "overallFeedback": string
      }
      `.trim(),
  }, {
    role: 'user',
    content: `Analyse this resume:\n\n${resumeText}`
  }]
});

const content = response.choices?.[0]?.message?.content;

if (!content) {
  throw new Error('OpenAI returned an empty response');
}

let parsed: unknown;

try {
  parsed = JSON.parse(content);
} catch {
  throw new Error('Failed to parse OpenAI JSON response');
}

return ResumeAnalysisSchema.parse(parsed);
}
