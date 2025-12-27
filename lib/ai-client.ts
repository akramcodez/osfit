/**
 * Unified AI Client
 * Routes requests to Gemini or Groq based on provider setting
 */

import { analyzeWithContext as analyzeGemini, generateResponse as generateGemini } from './gemini-client';
import { analyzeWithGroq, generateGroqResponse } from './groq-client';

export type AIProvider = 'gemini' | 'groq';

export interface AIOptions {
  provider: AIProvider;
  geminiKey?: string | null;
  groqKey?: string | null;
}

/**
 * Generate AI response using the specified provider
 */
export async function generateAIResponse(
  prompt: string,
  options: AIOptions
): Promise<string> {
  const { provider, geminiKey, groqKey } = options;

  if (provider === 'groq') {
    if (!groqKey) throw new Error('Groq API key is required');
    return generateGroqResponse(prompt, groqKey);
  }

  // Default to Gemini
  return generateGemini(prompt, geminiKey);
}

/**
 * Analyze with context using the specified provider
 */
export async function analyzeWithAI(
  systemPrompt: string,
  userMessage: string,
  context: string | undefined,
  options: AIOptions
): Promise<string> {
  const { provider, geminiKey, groqKey } = options;

  if (provider === 'groq') {
    if (!groqKey) throw new Error('Groq API key is required');
    return analyzeWithGroq(systemPrompt, userMessage, context, groqKey);
  }

  // Default to Gemini
  return analyzeGemini(systemPrompt, userMessage, context, geminiKey);
}
