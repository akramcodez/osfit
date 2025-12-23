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

  if (!sessionToken) {
    return NextResponse.json({ error: 'No token provided' }, { status: 400 });
  }

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
