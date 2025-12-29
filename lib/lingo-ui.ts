

import { LingoDotDevEngine } from 'lingo.dev/sdk';
import { TRANSLATIONS, LanguageCode, t } from './translations';


const translationCache = new Map<string, string>();


const LINGO_API_KEY = process.env.LINGO_API_KEY || '';


export async function translateUI(
  key: keyof typeof TRANSLATIONS.en | string,
  lang: LanguageCode | string
): Promise<string> {
  
  if (isTranslationKey(key)) {
    const staticTranslation = t(key, lang as LanguageCode);
    if (staticTranslation && staticTranslation !== key) {
      return staticTranslation;
    }
  }

  
  if (lang === 'en') {
    return isTranslationKey(key) ? t(key, 'en') : key;
  }

  
  const cacheKey = `${lang}:${key}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  
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
      
      
      translationCache.set(cacheKey, result);
      
      return result;
    }
  } catch (error) {
    console.warn('Lingo translation failed, falling back to English:', error);
  }

  
  return textToTranslate;
}


export async function translateUIBatch(
  strings: Record<string, string>,
  lang: LanguageCode | string
): Promise<Record<string, string>> {
  
  if (lang === 'en') {
    return strings;
  }

  
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

  
  return strings;
}


function isTranslationKey(key: string): key is keyof typeof TRANSLATIONS.en {
  return key in TRANSLATIONS.en;
}


export function clearTranslationCache(): void {
  translationCache.clear();
}
