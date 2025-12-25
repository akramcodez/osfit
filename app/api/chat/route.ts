import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type Mode = 'mentor' | 'file_explainer' | 'issue_solver';

// Helper to get user from auth header
async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  
  return user;
}

// Get Supabase client with service role for DB operations
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Verify user owns the session
async function verifySessionOwnership(supabase: any, sessionId: string, userId: string) {
  const { data } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single();
  
  return !!data;
}

// Get table name based on mode
function getTableForMode(mode: Mode): string {
  switch (mode) {
    case 'mentor':
      return 'messages';
    case 'file_explainer':
      return 'file_explanations';
    case 'issue_solver':
      return 'issue_solutions';
    default:
      return 'messages';
  }
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const body = await request.json();
  const { session_id, role, content, mode = 'mentor', metadata, file_url, file_path, file_content, language, explanation } = body;

  // Verify user owns this session
  const ownsSession = await verifySessionOwnership(supabase, session_id, user.id);
  if (!ownsSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const table = getTableForMode(mode as Mode);
  
  let insertData: Record<string, any>;
  
  if (mode === 'file_explainer') {
    // File explanations table structure
    insertData = {
      session_id,
      role,
      file_url: file_url || null,
      file_path: file_path || null,
      file_content: file_content || null,
      language: language || null,
      explanation: explanation || content, // Use content as explanation if not provided separately
      metadata: metadata || {}
    };
  } else if (mode === 'issue_solver') {
    // Issue solutions - placeholder for now
    insertData = {
      session_id
    };
  } else {
    // Mentor messages table structure
    insertData = {
      session_id,
      role,
      content,
      metadata: metadata || {}
    };
  }

  const { data, error } = await supabase
    .from(table)
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: data });
}

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');
  const mode = (searchParams.get('mode') || 'mentor') as Mode;

  if (!sessionId) {
    return NextResponse.json({ error: 'No session_id provided' }, { status: 400 });
  }

  // Verify user owns this session
  const ownsSession = await verifySessionOwnership(supabase, sessionId, user.id);
  if (!ownsSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const table = getTableForMode(mode);

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data });
}
