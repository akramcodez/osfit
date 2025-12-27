import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeWithAI, AIProvider } from '@/lib/ai-client';
import { getUserApiKeys } from '@/app/api/user/keys/route';

// Language names for prompt
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German',
  pt: 'Portuguese', it: 'Italian', zh: 'Chinese', ja: 'Japanese',
  ko: 'Korean', hi: 'Hindi', ar: 'Arabic', ru: 'Russian', bn: 'Bengali',
};

// Get effective keys with priority: user > system
interface EffectiveKeys {
  gemini: { key: string | null; source: 'user' | 'system' | 'none' };
  groq: { key: string | null; source: 'user' | 'system' | 'none' };
}

const SYSTEM_GEMINI_KEY = process.env.GEMINI_API_KEY || null;

function getEffectiveKeys(userKeys: { gemini_key: string | null; groq_key: string | null; ai_provider: string }): EffectiveKeys {
  return {
    gemini: {
      key: userKeys.gemini_key || SYSTEM_GEMINI_KEY || null,
      source: userKeys.gemini_key ? 'user' : (SYSTEM_GEMINI_KEY ? 'system' : 'none')
    },
    groq: {
      key: userKeys.groq_key || null,
      source: userKeys.groq_key ? 'user' : 'none'
    },
  };
}

// Get Supabase client for DB operations
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
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
    const { fileContent, language: codeLang, filePath, explanationId, useMockData, targetLanguage = 'en' } = body;

    if (!fileContent) {
      return NextResponse.json(
        { error: 'Missing fileContent' },
        { status: 400 }
      );
    }

    // Get user and their API keys
    const user = await getUserFromRequest(request);
    let userKeys = { gemini_key: null as string | null, groq_key: null as string | null, ai_provider: 'gemini' };
    if (user) {
      userKeys = await getUserApiKeys(user.id);
    }
    const effectiveKeys = getEffectiveKeys(userKeys);
    const provider: AIProvider = (userKeys.ai_provider as AIProvider) || 'gemini';

    // Force mock mode if requested or if no AI key available
    const hasAIKey = effectiveKeys.gemini.key || effectiveKeys.groq.key;
    const useMock = useMockData === true || !hasAIKey;
    
    console.log('[generate-flowchart] useMock:', useMock, 'provider:', provider, 'targetLanguage:', targetLanguage);
    
    // Get target language name for prompt
    const targetLangName = LANGUAGE_NAMES[targetLanguage] || 'English';
    
    if (useMock) {
      // Mock flowchart for development - generate in target language
      const mockFlowchart = targetLanguage === 'en' 
        ? `flowchart TD
    A[File Start] --> B[Import Dependencies]
    B --> C[Configure Client]
    C --> D{API Calls}
    D -->|GET| E[Fetch Data]
    D -->|POST| F[Send Data]
    E --> G[Process Response]
    F --> G
    G --> H{Success}
    H -->|Yes| I[Return Data]
    H -->|No| J[Handle Error]
    J --> K[Log Error]
    I --> L[End]
    K --> L`
        : `flowchart TD
    A[ফাইল শুরু] --> B[নির্ভরতা আমদানি]
    B --> C[ক্লায়েন্ট কনফিগার]
    C --> D{API কল}
    D -->|GET| E[ডাটা আনুন]
    D -->|POST| F[ডাটা পাঠান]
    E --> G[প্রতিক্রিয়া প্রক্রিয়া]
    F --> G
    G --> H{সাফল্য}
    H -->|হ্যাঁ| I[ডাটা ফেরত]
    H -->|না| J[ত্রুটি পরিচালনা]
    J --> K[ত্রুটি লগ]
    I --> L[শেষ]
    K --> L`;
      
      return NextResponse.json({ 
        flowchart: mockFlowchart,
        cached: false,
        mock: true
      });
    }

    // Check if we already have a cached flowchart
    if (explanationId) {
      try {
        const supabase = getSupabase();
        const { data } = await supabase
          .from('file_explanations')
          .select('flowchart')
          .eq('id', explanationId)
          .single();

        if (data?.flowchart) {
          return NextResponse.json({ 
            flowchart: data.flowchart,
            cached: true 
          });
        }
      } catch (dbError) {
        console.log('Flowchart cache check skipped:', dbError);
      }
    }

    // Generate flowchart using AI - with node labels in target language
    const systemPrompt = `You are a code visualization expert. Generate a Mermaid.js flowchart that shows how this code file works.

RULES:
1. Create a clear flowchart showing the main logic flow
2. Use "flowchart TD" (top-down direction)
3. Include main functions, conditions, and data flow
4. Keep it simple - max 10-15 nodes
5. Use descriptive but short node labels
6. Return ONLY the mermaid code, nothing else
7. IMPORTANT: Write all node labels in ${targetLangName} language

EXAMPLE OUTPUT (in English):
flowchart TD
    A[Start] --> B{Check condition}
    B -->|Yes| C[Do something]
    B -->|No| D[Do other thing]
    C --> E[End]
    D --> E

Remember: Mermaid syntax (flowchart, -->, TD) stays in English, but node labels inside [] and {} must be in ${targetLangName}.`;

    const userMessage = `Generate a flowchart for this ${codeLang || 'code'} file (${filePath || 'unknown'}). 
Write all node labels in ${targetLangName}:

\`\`\`${codeLang || 'code'}
${fileContent.substring(0, 6000)}
\`\`\``;

    const flowchart = await analyzeWithAI(systemPrompt, userMessage, undefined, {
      provider,
      geminiKey: effectiveKeys.gemini.key,
      groqKey: effectiveKeys.groq.key,
    });

    // Clean up the response
    const cleanFlowchart = flowchart
      .replace(/```mermaid\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Save to database if we have an explanationId
    if (explanationId) {
      try {
        const supabase = getSupabase();
        await supabase
          .from('file_explanations')
          .update({ flowchart: cleanFlowchart })
          .eq('id', explanationId);
      } catch (dbError) {
        console.log('Flowchart save skipped:', dbError);
      }
    }

    return NextResponse.json({ 
      flowchart: cleanFlowchart,
      cached: false 
    });
  } catch (error) {
    console.error('Flowchart generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate flowchart' },
      { status: 500 }
    );
  }
}
