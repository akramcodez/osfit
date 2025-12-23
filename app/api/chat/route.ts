import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateResponse } from '@/lib/gemini-client';
import { translateText } from '@/lib/lingo-client';
import type { AssistantMode } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      session_id, 
      message, 
      mode = 'idle',
      language = 'en'
    }: {
      session_id: string;
      message: string;
      mode: AssistantMode;
      language: string;
    } = body;

    if (!session_id || !message) {
      return NextResponse.json(
        { error: 'session_id and message are required' },
        { status: 400 }
      );
    }

    // Save user message to database
    const { error: userMsgError } = await supabase
      .from('messages')
      .insert({
        session_id,
        role: 'user',
        content: message,
        mode,
      });

    if (userMsgError) {
      console.error('Error saving user message:', userMsgError);
    }

    // Generate AI response based on mode
    const systemPrompt = getSystemPrompt(mode);
    const response = await generateResponse(message, systemPrompt);

    // Translate response if not English
    const finalResponse = language !== 'en' 
      ? await translateText(response, language)
      : response;

    // Save assistant message to database
    const { data: assistantMsg, error: assistantMsgError } = await supabase
      .from('messages')
      .insert({
        session_id,
        role: 'assistant',
        content: finalResponse,
        mode,
      })
      .select()
      .single();

    if (assistantMsgError) {
      console.error('Error saving assistant message:', assistantMsgError);
    }

    // Update session last_active
    await supabase
      .from('chat_sessions')
      .update({ last_active: new Date().toISOString() })
      .eq('id', session_id);

    return NextResponse.json({
      message: assistantMsg || { content: finalResponse },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getSystemPrompt(mode: AssistantMode): string {
  switch (mode) {
    case 'issue_solver':
      return `You are OSFIT, a helpful open-source assistant specializing in understanding GitHub issues.
Your role is to:
- Explain issues clearly and concisely
- Break down the problem in a structured way
- Provide actionable guidance when asked
- Suggest potential solutions, branch names, commit messages, and PR descriptions when requested
Always be encouraging and helpful to new contributors.`;

    case 'file_explainer':
      return `You are OSFIT, a helpful open-source assistant specializing in explaining code files.
Your role is to:
- Explain the file's purpose clearly
- Break down key logic at a high level
- Highlight important functions and patterns
- Avoid refactoring suggestions unless asked
Keep explanations accessible to developers of all levels.`;

    case 'mentor':
      return `You are OSFIT, an open-source mentor helping developers contribute to open source.
Your role is to:
- Answer questions about open-source contribution
- Explain contribution etiquette and best practices
- Guide users on writing good pull requests
- Help find beginner-friendly repositories
Be friendly, patient, and encouraging.`;

    default:
      return `You are OSFIT, a multilingual open-source assistant.
You help developers with:
- Understanding GitHub issues (Issue Solver mode)
- Explaining code files (File Explainer mode)  
- Open-source contribution guidance (Mentor mode)

Ask the user what kind of help they need to get started.`;
  }
}
