import { NextRequest, NextResponse } from 'next/server';
import { LingoDotDevEngine } from 'lingo.dev/sdk';
import { TRANSLATIONS, LanguageCode, t } from '@/lib/translations';

const LINGO_API_KEY = process.env.LINGO_API_KEY || '';

// Simple in-memory cache
const cache = new Map<string, string>();

export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguage } = await request.json();

    if (!text || !targetLanguage) {
      return NextResponse.json({ error: 'Missing text or targetLanguage' }, { status: 400 });
    }

    // Skip translation for English
    if (targetLanguage === 'en') {
      return NextResponse.json({ translated: text });
    }

    // Check cache first
    const cacheKey = `${targetLanguage}:${text}`;
    if (cache.has(cacheKey)) {
      return NextResponse.json({ translated: cache.get(cacheKey) });
    }

    // Try lingo.dev translation
    if (LINGO_API_KEY) {
      try {
        const lingoClient = new LingoDotDevEngine({
          apiKey: LINGO_API_KEY,
        });

        const content = { text };
        const translated = await lingoClient.localizeObject(content, {
          sourceLocale: 'en',
          targetLocale: targetLanguage,
        });

        const result = translated.text || text;
        cache.set(cacheKey, result);

        return NextResponse.json({ translated: result });
      } catch (lingoError) {
        console.warn('Lingo translation failed:', lingoError);
      }
    }

    // Fallback to original text
    return NextResponse.json({ translated: text });
  } catch (error) {
    console.error('Translation API error:', error);
    return NextResponse.json({ translated: '' }, { status: 500 });
  }
}
