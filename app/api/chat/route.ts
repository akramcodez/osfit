import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const supabase = getSupabase();
  const body = await request.json();
  const { session_id, role, content, mode, metadata } = body;

  const { data, error } = await supabase
    .from('messages')
    .insert({
      session_id,
      role,
      content,
      mode: mode || 'idle',
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
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'No session_id provided' }, { status: 400 });
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
