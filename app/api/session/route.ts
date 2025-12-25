import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

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

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const sessionToken = uuidv4();
  
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ 
      session_token: sessionToken,
      user_id: user.id 
    })
    .select()
    .single();

  if (error) {
    console.error('Session create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session: data });
}

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ sessions: [] });
  }

  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const sessionToken = searchParams.get('token');

  // If token is provided, return specific session (must belong to user)
  if (sessionToken) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ session: data });
  }

  // Otherwise list user's recent sessions with message count
  const { data: sessions, error } = await supabase
    .from('chat_sessions')
    .select('*, messages(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ sessions: [] });
  }

  // Filter out sessions with 0 messages
  const validSessions = sessions?.filter((s: any) => s.messages && s.messages[0]?.count > 0) || [];

  return NextResponse.json({ sessions: validSessions.slice(0, 20) });
}
