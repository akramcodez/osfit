import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateResponse(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

export async function analyzeWithContext(
  systemPrompt: string,
  userMessage: string,
  context?: string
): Promise<string> {
  const fullPrompt = `${systemPrompt}

${context ? `Context:\n${context}\n\n` : ''}User: ${userMessage}`;

  return await generateResponse(fullPrompt);
}
