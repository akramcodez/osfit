import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function POST() {
  const supabase = getSupabase();
  const sessionToken = uuidv4();
  
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ session_token: sessionToken })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session: data });
}

export async function GET(request: Request) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const sessionToken = searchParams.get('token');

  // If token is provided, return specific session
  if (sessionToken) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ session: data });
  }

  // Otherwise list recent sessions (limit 20) with message check
  const { data: sessions, error } = await supabase
    .from('chat_sessions')
    .select('*, messages(count)')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ sessions: [] });
  }

  // Filter out sessions with 0 messages
  const validSessions = sessions?.filter((s: any) => s.messages && s.messages[0]?.count > 0) || [];

  // Async cleanup (fire and forget): Delete empty sessions older than 1 hour to keep DB clean
  // Note: RLS policies might restrict deletion, but assuming service role or owner policy allows
  // This is a basic implementation. Better to have a scheduled cron job.
  
  return NextResponse.json({ sessions: validSessions.slice(0, 20) });
}
