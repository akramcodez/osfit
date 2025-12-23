import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

/**
 * Generate a response using Gemini
 */
export async function generateResponse(prompt: string, context?: string): Promise<string> {
  const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;
  
  const result = await geminiModel.generateContent(fullPrompt);
  const response = await result.response;
  
  return response.text();
}

/**
 * Stream a response using Gemini
 */
export async function* streamResponse(prompt: string, context?: string) {
  const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;
  
  const result = await geminiModel.generateContentStream(fullPrompt);
  
  for await (const chunk of result.stream) {
    yield chunk.text();
  }
}

export { genAI };
