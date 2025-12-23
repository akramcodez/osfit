import { LingoDotDevEngine } from 'lingo.dev/sdk';
import { generateResponse } from './gemini-client';

// Use Lingo.dev only in production, Gemini in development
const USE_LINGO = process.env.NODE_ENV === 'production';

let lingoDotDev: LingoDotDevEngine | null = null;
if (USE_LINGO && process.env.LINGO_API_KEY) {
  lingoDotDev = new LingoDotDevEngine({
    apiKey: process.env.LINGO_API_KEY,
  });
}

export interface TranslateRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
];

const languageNames: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German',
  pt: 'Portuguese', it: 'Italian', zh: 'Chinese', ja: 'Japanese',
  ko: 'Korean', hi: 'Hindi', ar: 'Arabic', ru: 'Russian', bn: 'Bengali',
};

/**
 * Translate text
 * - In production: uses Lingo.dev SDK (uses credits)
 * - In development: uses Gemini AI (free, uses your Gemini quota)
 */
export async function translateText(request: TranslateRequest): Promise<string> {
  // Skip translation if target is English
  if (request.targetLanguage === 'en') {
    return request.text;
  }

  const targetLang = languageNames[request.targetLanguage] || request.targetLanguage;

  try {
    if (USE_LINGO && lingoDotDev) {
      // Production: use Lingo.dev SDK
      const content = { text: request.text };
      const translated = await lingoDotDev.localizeObject(content, {
        sourceLocale: request.sourceLanguage || 'en',
        targetLocale: request.targetLanguage,
      });
      return translated.text || request.text;
    } else {
      // Development: use Gemini for translation (free)
      const prompt = `Translate the following text to ${targetLang}. 
Maintain the same formatting (markdown, bullet points, code blocks, etc.).
Only output the translated text, nothing else.

Text:
${request.text}`;

      const translated = await generateResponse(prompt);
      return translated.trim();
    }
  } catch (error) {
    console.error('Translation error:', error);
    return request.text;
  }
}

export async function detectLanguage(text: string): Promise<string> {
  return 'en';
}
