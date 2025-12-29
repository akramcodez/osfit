import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;


export const supabase = createClient(supabaseUrl, supabaseAnonKey);


export async function signUp(username: string, password: string) {
  const email = `${username.toLowerCase()}@example.com`;
  
  
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username.toLowerCase())
    .single();
  
  if (existingProfile) {
    return { error: { message: 'Username already exists' }, data: null };
  }
  
  
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


export async function signIn(username: string, password: string) {
  const email = `${username.toLowerCase()}@example.com`;
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  return { data, error };
}


export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}


export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}


export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
}


export function onAuthStateChange(callback: (user: any) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
}


export function getUsername(user: any): string {
  return user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';
}
