import { GoogleGenerativeAI } from '@google/generative-ai';

// Default client using system API key
export const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Create a Gemini client with a specific API key
 * Used when user has their own key configured
 */
export function createGeminiClient(apiKey: string): GoogleGenerativeAI {
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Get the appropriate Gemini client
 * Uses user key if provided, falls back to system key
 */
export function getGeminiClient(userApiKey?: string | null): GoogleGenerativeAI {
  if (userApiKey) {
    return createGeminiClient(userApiKey);
  }
  return geminiClient;
}

export async function generateResponse(prompt: string, userApiKey?: string | null): Promise<string> {
  const client = getGeminiClient(userApiKey);
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });
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
