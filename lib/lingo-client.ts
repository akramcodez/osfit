import { LingoDotDevEngine } from 'lingo.dev/sdk';
import { generateResponse } from './gemini-client';

export interface TranslateRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
  userLingoKey?: string | null; // User-provided Lingo API key from DB
  userGeminiKey?: string | null; // User-provided Gemini key for fallback translation
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
 * - Uses Lingo.dev SDK if a Lingo key is available (user key or system key)
 * - Falls back to Gemini AI for translation if no Lingo key
 */
export async function translateText(request: TranslateRequest): Promise<string> {
  // Skip translation if target is English
  if (request.targetLanguage === 'en') {
    return request.text;
  }

  const targetLang = languageNames[request.targetLanguage] || request.targetLanguage;

  // Determine which Lingo key to use: user key > system key
  const effectiveLingoKey = request.userLingoKey || process.env.LINGO_API_KEY;

  try {
    if (effectiveLingoKey) {
      // Use Lingo.dev SDK with the effective key
      const lingoClient = new LingoDotDevEngine({
        apiKey: effectiveLingoKey,
      });
      
      const content = { text: request.text };
      const translated = await lingoClient.localizeObject(content, {
        sourceLocale: request.sourceLanguage || 'en',
        targetLocale: request.targetLanguage,
      });
      return translated.text || request.text;
    } else {
      // Fallback: use Gemini for translation
      const prompt = `Translate the following text to ${targetLang}. 
Maintain the same formatting (markdown, bullet points, code blocks, etc.).
Only output the translated text, nothing else.

Text:
${request.text}`;

      const translated = await generateResponse(prompt, request.userGeminiKey);
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
