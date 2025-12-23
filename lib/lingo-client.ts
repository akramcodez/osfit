import axios from 'axios';

const LINGO_API_URL = 'https://api.lingo.dev/v1/translate';
const LINGO_API_KEY = process.env.LINGO_API_KEY!;

export interface TranslateRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ru', name: 'Russian' },
];

export async function translateText(request: TranslateRequest): Promise<string> {
  // Skip translation if target is English
  if (request.targetLanguage === 'en') {
    return request.text;
  }

  try {
    const response = await axios.post(
      LINGO_API_URL,
      {
        text: request.text,
        target_language: request.targetLanguage,
        source_language: request.sourceLanguage || 'en'
      },
      {
        headers: {
          'Authorization': `Bearer ${LINGO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.translated_text || response.data.translation || request.text;
  } catch (error) {
    console.error('Lingo translation error:', error);
    // Return original text on error instead of failing
    return request.text;
  }
}

export async function detectLanguage(text: string): Promise<string> {
  return 'en';
}
