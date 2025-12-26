import { NextResponse } from 'next/server';
import { analyzeWithContext } from '@/lib/gemini-client';
import { createClient } from '@supabase/supabase-js';

// Get Supabase client for DB operations
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fileContent, language, filePath, explanationId, useMockData } = body;

    if (!fileContent) {
      return NextResponse.json(
        { error: 'Missing fileContent' },
        { status: 400 }
      );
    }

    // Force mock mode if requested or if API key is missing/empty
    const useMock = useMockData === true || !process.env.GEMINI_API_KEY?.trim();
    
    console.log('[generate-flowchart] useMock:', useMock, 'hasApiKey:', !!process.env.GEMINI_API_KEY?.trim());
    
    if (useMock) {
      // Mock flowchart for development - return immediately
      const mockFlowchart = `flowchart TD
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

    // Generate flowchart using Gemini
    const systemPrompt = `You are a code visualization expert. Generate a Mermaid.js flowchart that shows how this code file works.

RULES:
1. Create a clear flowchart showing the main logic flow
2. Use "flowchart TD" (top-down direction)
3. Include main functions, conditions, and data flow
4. Keep it simple - max 10-15 nodes
5. Use descriptive but short node labels
6. Return ONLY the mermaid code, nothing else

EXAMPLE OUTPUT:
flowchart TD
    A[Start] --> B{Check condition}
    B -->|Yes| C[Do something]
    B -->|No| D[Do other thing]
    C --> E[End]
    D --> E`;

    const userMessage = `Generate a flowchart for this ${language || 'code'} file (${filePath || 'unknown'}):

\`\`\`${language || 'code'}
${fileContent.substring(0, 6000)}
\`\`\``;

    const flowchart = await analyzeWithContext(systemPrompt, userMessage);

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
