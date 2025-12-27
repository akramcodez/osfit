/**
 * Hybrid UI Translator
 * 
 * Strategy:
 * 1. First, try static translations from translations.ts (instant)
 * 2. If not found, try lingo.dev for dynamic translation
 * 3. If lingo fails (quota/error), fall back to English
 * 
 * This is the CORRECT use of lingo.dev - for UI localization, not AI content.
 */

import { LingoDotDevEngine } from 'lingo.dev/sdk';
import { TRANSLATIONS, LanguageCode, t } from './translations';

// Cache for lingo translations to avoid repeated API calls
const translationCache = new Map<string, string>();

// System lingo key from environment
const LINGO_API_KEY = process.env.LINGO_API_KEY || '';

/**
 * Translate a UI string with fallback strategy
 * 
 * @param key - Translation key (must exist in translations.ts) or raw English text
 * @param lang - Target language code
 * @returns Translated string, falls back to English if all else fails
 */
export async function translateUI(
  key: keyof typeof TRANSLATIONS.en | string,
  lang: LanguageCode | string
): Promise<string> {
  // 1. Try static translations first (instant, no API call)
  if (isTranslationKey(key)) {
    const staticTranslation = t(key, lang as LanguageCode);
    if (staticTranslation && staticTranslation !== key) {
      return staticTranslation;
    }
  }

  // If English, return as-is (no translation needed)
  if (lang === 'en') {
    return isTranslationKey(key) ? t(key, 'en') : key;
  }

  // 2. Check cache
  const cacheKey = `${lang}:${key}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // 3. Try lingo.dev for dynamic translation
  const textToTranslate = isTranslationKey(key) ? t(key, 'en') : key;
  
  try {
    if (LINGO_API_KEY) {
      const lingoClient = new LingoDotDevEngine({
        apiKey: LINGO_API_KEY,
      });

      const content = { text: textToTranslate };
      const translated = await lingoClient.localizeObject(content, {
        sourceLocale: 'en',
        targetLocale: lang,
      });

      const result = translated.text || textToTranslate;
      
      // Cache the result
      translationCache.set(cacheKey, result);
      
      return result;
    }
  } catch (error) {
    console.warn('Lingo translation failed, falling back to English:', error);
  }

  // 4. Fallback to English
  return textToTranslate;
}

/**
 * Batch translate multiple UI strings at once
 * More efficient than calling translateUI for each string
 */
export async function translateUIBatch(
  strings: Record<string, string>,
  lang: LanguageCode | string
): Promise<Record<string, string>> {
  // If English, return as-is
  if (lang === 'en') {
    return strings;
  }

  // Try lingo.dev for batch translation
  try {
    if (LINGO_API_KEY) {
      const lingoClient = new LingoDotDevEngine({
        apiKey: LINGO_API_KEY,
      });

      const translated = await lingoClient.localizeObject(strings, {
        sourceLocale: 'en',
        targetLocale: lang,
      });

      return translated as Record<string, string>;
    }
  } catch (error) {
    console.warn('Lingo batch translation failed, falling back to English:', error);
  }

  // Fallback to English
  return strings;
}

/**
 * Check if a key exists in static translations
 */
function isTranslationKey(key: string): key is keyof typeof TRANSLATIONS.en {
  return key in TRANSLATIONS.en;
}

/**
 * Clear the translation cache
 * Useful when language changes or for testing
 */
export function clearTranslationCache(): void {
  translationCache.clear();
}
