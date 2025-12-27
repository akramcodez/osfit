import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeWithAI, AIProvider } from '@/lib/ai-client';
import { getUserApiKeys } from '@/app/api/user/keys/route';

interface EffectiveKeys {
  gemini: { key: string | null; source: 'user' | 'system' | 'none' };
  groq: { key: string | null; source: 'user' | 'system' | 'none' };
  lingo: { key: string | null; source: 'user' | 'system' | 'none' };
}

const SYSTEM_GEMINI_KEY = process.env.GEMINI_API_KEY || null;
const SYSTEM_LINGO_KEY = process.env.LINGO_API_KEY || null;

function getEffectiveKeys(userKeys: { gemini_key: string | null; groq_key: string | null; lingo_key: string | null; ai_provider: string }): EffectiveKeys {
  return {
    gemini: {
      key: userKeys.gemini_key || SYSTEM_GEMINI_KEY || null,
      source: userKeys.gemini_key ? 'user' : (SYSTEM_GEMINI_KEY ? 'system' : 'none')
    },
    groq: {
      key: userKeys.groq_key || null,
      source: userKeys.groq_key ? 'user' : 'none'
    },
    lingo: {
      key: userKeys.lingo_key || SYSTEM_LINGO_KEY || null,
      source: userKeys.lingo_key ? 'user' : (SYSTEM_LINGO_KEY ? 'system' : 'none')
    },
  };
}

async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  
  return user;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lineNumber, lineContent, fullFileContent, language: codeLang, filePath, useMockData, targetLanguage = 'en' } = body;

    if (!lineNumber || !fullFileContent) {
      return NextResponse.json(
        { error: 'Missing required fields: lineNumber and fullFileContent' },
        { status: 400 }
      );
    }

    const user = await getUserFromRequest(request);
    let userKeys = { gemini_key: null as string | null, groq_key: null as string | null, lingo_key: null as string | null, ai_provider: 'gemini' };
    if (user) {
      userKeys = await getUserApiKeys(user.id);
    }
    const effectiveKeys = getEffectiveKeys(userKeys);
    const provider: AIProvider = (userKeys.ai_provider as AIProvider) || 'gemini';

    const hasAIKey = effectiveKeys.gemini.key || effectiveKeys.groq.key;
    const useMock = useMockData === true || !hasAIKey;
    
    if (useMock) {
      // Return mock explanation in English (no translation for mocks)
      const explanation = `**Line ${lineNumber}: \`${(lineContent || '').trim()}\`**

This line ${getLineExplanation(lineContent || '', lineNumber)}.

### Context
This is part of the surrounding code block that ${getContextExplanation(codeLang)}.

> 💡 **Tip:** ${getTip(codeLang)}`;
      
      return NextResponse.json({ 
        explanation,
        lineNumber,
        mock: true
      });
    }

    const lines = fullFileContent.split('\n');
    const startLine = Math.max(0, lineNumber - 6);
    const endLine = Math.min(lines.length - 1, lineNumber + 5);
    const contextLines = lines.slice(startLine, endLine + 1);
    const contextWithLineNumbers = contextLines
      .map((line: string, idx: number) => {
        const num = startLine + idx + 1;
        const marker = num === lineNumber ? '>>> ' : '    ';
        return `${marker}${num}: ${line}`;
      })
      .join('\n');

    const systemPrompt = `You are a code explanation expert. Explain the specific line of code marked with ">>>" in context.

RULES:
1. Focus on what THIS specific line does
2. Explain its purpose in the context of surrounding code
3. If it's part of a larger construct (function, class, loop), explain its role
4. Keep explanations concise but clear (2-4 sentences max)
5. Use markdown formatting

FILE: ${filePath || 'unknown'}
LANGUAGE: ${codeLang || 'unknown'}`;

    const userMessage = `Explain line ${lineNumber}:\n\n\`\`\`${codeLang || 'code'}\n${contextWithLineNumbers}\n\`\`\``;

    // AI generates directly in target language via targetLanguage parameter
    const explanation = await analyzeWithAI(systemPrompt, userMessage, undefined, {
      provider,
      geminiKey: effectiveKeys.gemini.key,
      groqKey: effectiveKeys.groq.key,
      targetLanguage,
    });

    return NextResponse.json({ 
      explanation,
      lineNumber,
      context: {
        start: startLine + 1,
        end: endLine + 1
      }
    });
  } catch (error) {
    console.error('Line explanation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate explanation' },
      { status: 500 }
    );
  }
}

function getLineExplanation(line: string, num: number): string {
  if (line.includes('import')) return 'imports a module or library dependency';
  if (line.includes('export')) return 'exports this item for use in other files';
  if (line.includes('const ') || line.includes('let ') || line.includes('var ')) return 'declares a variable to store a value';
  if (line.includes('function') || line.includes('=>')) return 'defines a function that can be called later';
  if (line.includes('if') || line.includes('else')) return 'adds conditional logic to control flow';
  if (line.includes('return')) return 'returns a value from the function';
  if (line.includes('await')) return 'waits for an async operation to complete';
  if (line.includes('try') || line.includes('catch')) return 'handles potential errors safely';
  return 'is part of the program logic';
}

function getContextExplanation(lang: string): string {
  if (lang === 'typescript' || lang === 'ts') return 'provides type-safe code execution';
  if (lang === 'javascript' || lang === 'js') return 'handles dynamic functionality';
  if (lang === 'python' || lang === 'py') return 'processes data and logic';
  return 'implements the core functionality';
}

function getTip(lang: string): string {
  if (lang === 'typescript' || lang === 'ts') return 'TypeScript adds compile-time type checking for safer code.';
  if (lang === 'javascript' || lang === 'js') return 'Use modern ES6+ features for cleaner code.';
  if (lang === 'python' || lang === 'py') return 'Follow PEP8 style guidelines for consistent code.';
  return 'Read the surrounding code to understand the full context.';
}
