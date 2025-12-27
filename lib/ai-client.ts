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
  targetLanguage?: string; // Language code for AI to respond in (e.g., 'hi', 'es', 'fr')
}

// Language name mapping for natural language instruction
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  hi: 'Hindi',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  pt: 'Portuguese',
  ru: 'Russian',
  ar: 'Arabic',
  bn: 'Bengali',
};

/**
 * Generate language instruction to append to system prompt
 * Returns empty string for English (no instruction needed)
 */
function getLanguageInstruction(lang?: string): string {
  if (!lang || lang === 'en') return '';
  const name = LANGUAGE_NAMES[lang] || lang;
  return `\n\n**CRITICAL LANGUAGE REQUIREMENT:** You MUST respond ENTIRELY in ${name}. All text, headings, code comments, and explanations must be written in ${name}. Do NOT use English except for code syntax, variable names, and technical terms that have no translation.`;
}

/**
 * Generate AI response using the specified provider
 */
export async function generateAIResponse(
  prompt: string,
  options: AIOptions
): Promise<string> {
  const { provider, geminiKey, groqKey, targetLanguage } = options;
  
  // Add language instruction if not English
  const langInstruction = getLanguageInstruction(targetLanguage);
  const enhancedPrompt = prompt + langInstruction;

  if (provider === 'groq') {
    if (!groqKey) throw new Error('Groq API key is required');
    return generateGroqResponse(enhancedPrompt, groqKey);
  }

  // Default to Gemini
  return generateGemini(enhancedPrompt, geminiKey);
}

/**
 * Analyze with context using the specified provider
 * Now supports targetLanguage for direct language generation
 */
export async function analyzeWithAI(
  systemPrompt: string,
  userMessage: string,
  context: string | undefined,
  options: AIOptions
): Promise<string> {
  const { provider, geminiKey, groqKey, targetLanguage } = options;
  
  // Add language instruction to system prompt if not English
  const langInstruction = getLanguageInstruction(targetLanguage);
  const enhancedSystemPrompt = systemPrompt + langInstruction;

  if (provider === 'groq') {
    if (!groqKey) throw new Error('Groq API key is required');
    return analyzeWithGroq(enhancedSystemPrompt, userMessage, context, groqKey);
  }

  // Default to Gemini
  return analyzeGemini(enhancedSystemPrompt, userMessage, context, geminiKey);
}
