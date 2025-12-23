import axios from 'axios';

const LINGO_API_URL = 'https://api.lingo.dev/v1';

/**
 * Translate text using Lingo.dev API
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage: string = 'en'
): Promise<string> {
  const apiKey = process.env.LINGO_API_KEY;
  
  if (!apiKey) {
    // If no API key, return original text
    console.warn('LINGO_API_KEY not set, returning original text');
    return text;
  }

  try {
    const response = await axios.post(
      `${LINGO_API_URL}/translate`,
      {
        text,
        source_language: sourceLanguage,
        target_language: targetLanguage,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.translated_text || text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}

/**
 * Detect language of text
 */
export async function detectLanguage(text: string): Promise<string> {
  const apiKey = process.env.LINGO_API_KEY;
  
  if (!apiKey) {
    return 'en';
  }

  try {
    const response = await axios.post(
      `${LINGO_API_URL}/detect`,
      { text },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.language || 'en';
  } catch (error) {
    console.error('Language detection error:', error);
    return 'en';
  }
}

// Supported languages for the UI
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ru', name: 'Russian' },
  { code: 'tr', name: 'Turkish' },
] as const;
