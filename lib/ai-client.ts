

import { analyzeWithContext as analyzeGemini, generateResponse as generateGemini } from './gemini-client';
import { analyzeWithGroq, generateGroqResponse } from './groq-client';

export type AIProvider = 'gemini' | 'groq';

export interface AIOptions {
  provider: AIProvider;
  geminiKey?: string | null;
  groqKey?: string | null;
  targetLanguage?: string; 
}


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


function getLanguageInstruction(lang?: string): string {
  if (!lang || lang === 'en') return '';
  const name = LANGUAGE_NAMES[lang] || lang;
  return `\n\n**CRITICAL LANGUAGE REQUIREMENT:** You MUST respond ENTIRELY in ${name}. All text, headings, code comments, and explanations must be written in ${name}. Do NOT use English except for code syntax, variable names, and technical terms that have no translation.`;
}


export async function generateAIResponse(
  prompt: string,
  options: AIOptions
): Promise<string> {
  const { provider, geminiKey, groqKey, targetLanguage } = options;
  
  
  const langInstruction = getLanguageInstruction(targetLanguage);
  const enhancedPrompt = prompt + langInstruction;

  if (provider === 'groq') {
    if (!groqKey) throw new Error('Groq API key is required');
    return generateGroqResponse(enhancedPrompt, groqKey);
  }

  
  return generateGemini(enhancedPrompt, geminiKey);
}


export async function analyzeWithAI(
  systemPrompt: string,
  userMessage: string,
  context: string | undefined,
  options: AIOptions
): Promise<string> {
  const { provider, geminiKey, groqKey, targetLanguage } = options;
  
  
  const langInstruction = getLanguageInstruction(targetLanguage);
  const enhancedSystemPrompt = systemPrompt + langInstruction;

  if (provider === 'groq') {
    if (!groqKey) throw new Error('Groq API key is required');
    return analyzeWithGroq(enhancedSystemPrompt, userMessage, context, groqKey);
  }

  
  return analyzeGemini(enhancedSystemPrompt, userMessage, context, geminiKey);
}
