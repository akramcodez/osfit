import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const body = await request.json();
  const { session_id, role, content, mode, metadata } = body;

  // Verify user owns this session
  const ownsSession = await verifySessionOwnership(supabase, session_id, user.id);
  if (!ownsSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      session_id,
      role,
      content,
      mode: mode || 'mentor',
      metadata: metadata || {}
    })
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

  if (!sessionId) {
    return NextResponse.json({ error: 'No session_id provided' }, { status: 400 });
  }

  // Verify user owns this session
  const ownsSession = await verifySessionOwnership(supabase, sessionId, user.id);
  if (!ownsSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data });
}
