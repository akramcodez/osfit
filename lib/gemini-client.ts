import { GoogleGenerativeAI } from '@google/generative-ai';


const GEMINI_MODEL = 'gemini-2.5-flash';


export function createGeminiClient(apiKey: string): GoogleGenerativeAI {
  return new GoogleGenerativeAI(apiKey);
}


export function getGeminiClient(userApiKey?: string | null): GoogleGenerativeAI {
  if (!userApiKey) {
    throw new Error('Gemini API key is required');
  }
  return createGeminiClient(userApiKey);
}

export async function generateResponse(prompt: string, userApiKey?: string | null): Promise<string> {
  const client = getGeminiClient(userApiKey);
  const model = client.getGenerativeModel({ model: GEMINI_MODEL });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

export async function analyzeWithContext(
  systemPrompt: string,
  userMessage: string,
  context?: string,
  userApiKey?: string | null
): Promise<string> {
  const fullPrompt = `${systemPrompt}

${context ? `Context:\n${context}\n\n` : ''}User: ${userMessage}`;

  return await generateResponse(fullPrompt, userApiKey);
}
