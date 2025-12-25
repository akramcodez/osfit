import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client for auth
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Sign up with username (uses username@example.com pattern)
export async function signUp(username: string, password: string) {
  const email = `${username.toLowerCase()}@example.com`;
  
  // Check if username already exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username.toLowerCase())
    .single();
  
  if (existingProfile) {
    return { error: { message: 'Username already exists' }, data: null };
  }
  
  // Create user with username in metadata
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username.toLowerCase()
      }
    }
  });
  
  return { data, error };
}

// Sign in with username
export async function signIn(username: string, password: string) {
  const email = `${username.toLowerCase()}@example.com`;
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  return { data, error };
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

// Get current user
export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

// Get current session
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
}

// Listen for auth state changes
export function onAuthStateChange(callback: (user: any) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
}

// Get username from user metadata
export function getUsername(user: any): string {
  return user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';
}
