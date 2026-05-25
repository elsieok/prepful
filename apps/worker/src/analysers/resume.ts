import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function analyseResume(resumeText: string) {
    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [{
            role: 'system',
            content: `You are a senior technical recruiter at a FAANG company. Analyse resumes and return a JSON object with exactly these keys: atsScore (0-100), strengths (string[]), weaknesses (string[]), missingKeywords (string[]), impactSuggestions (string[]), overallFeedback (string).`
      }, {
        role: 'user',
        content: `Analyse this resume:\n\n${resumeText}`
      }]
    });

    return JSON.parse(response.choices[0].message.content!);
}
