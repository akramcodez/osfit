import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encryptApiKey, decryptApiKey, isEncryptionConfigured } from '@/lib/encryption';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role for direct database access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper to get user from auth header
async function getUserFromAuth(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

/**
 * GET /api/user/keys
 * Returns key status (configured/not configured) - NEVER returns actual keys
 */
export async function GET(request: NextRequest) {
  const user = await getUserFromAuth(request);
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { data, error } = await supabase
    .from('user_api_keys')
    .select('gemini_key_encrypted, apify_key_encrypted, lingo_key_encrypted, groq_key_encrypted, ai_provider, preferred_language')
    .eq('user_id', user.id)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  
  // Return only boolean status, never actual keys
  return NextResponse.json({
    has_gemini: !!data?.gemini_key_encrypted,
    has_apify: !!data?.apify_key_encrypted,
    has_lingo: !!data?.lingo_key_encrypted,
    has_groq: !!data?.groq_key_encrypted,
    ai_provider: data?.ai_provider || 'gemini',
    preferred_language: data?.preferred_language || 'en',
  });
}

/**
 * POST /api/user/keys
 * Save or update user API keys (encrypted)
 * Body: { gemini_key?: string, apify_key?: string, lingo_key?: string }
 */
export async function POST(request: NextRequest) {
  const user = await getUserFromAuth(request);
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const body = await request.json();
  const { gemini_key, apify_key, lingo_key, groq_key, ai_provider, preferred_language } = body;
  
  // Check if any encrypted keys are being saved - only then require encryption
  const hasKeysToEncrypt = gemini_key !== undefined || apify_key !== undefined || 
                           lingo_key !== undefined || groq_key !== undefined;
  
  if (hasKeysToEncrypt && !isEncryptionConfigured()) {
    return NextResponse.json({ error: 'Encryption not configured' }, { status: 500 });
  }
  
  // Build update object with only provided keys
  const updateData: Record<string, string | null> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  };
  
  if (gemini_key !== undefined) {
    updateData.gemini_key_encrypted = gemini_key ? encryptApiKey(gemini_key) : null;
  }
  if (apify_key !== undefined) {
    updateData.apify_key_encrypted = apify_key ? encryptApiKey(apify_key) : null;
  }
  if (lingo_key !== undefined) {
    updateData.lingo_key_encrypted = lingo_key ? encryptApiKey(lingo_key) : null;
  }
  if (groq_key !== undefined) {
    updateData.groq_key_encrypted = groq_key ? encryptApiKey(groq_key) : null;
  }
  if (ai_provider !== undefined) {
    updateData.ai_provider = ai_provider;
  }
  if (preferred_language !== undefined) {
    updateData.preferred_language = preferred_language;
  }
  
  // Check if user already has a row
  const { data: existing } = await supabase
    .from('user_api_keys')
    .select('id')
    .eq('user_id', user.id)
    .single();
  
  let result;
  if (existing) {
    // Update existing row
    result = await supabase
      .from('user_api_keys')
      .update(updateData)
      .eq('user_id', user.id);
  } else {
    // Insert new row
    result = await supabase
      .from('user_api_keys')
      .insert(updateData);
  }
  
  if (result.error) {
    console.error('Error saving keys:', result.error);
    return NextResponse.json({ error: 'Failed to save keys' }, { status: 500 });
  }
  
  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/user/keys
 * Remove a specific key
 * Query param: key_type (gemini, apify, or lingo)
 */
export async function DELETE(request: NextRequest) {
  const user = await getUserFromAuth(request);
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { searchParams } = new URL(request.url);
  const keyType = searchParams.get('key_type');
  
  if (!keyType || !['gemini', 'apify', 'lingo', 'groq'].includes(keyType)) {
    return NextResponse.json({ error: 'Invalid key_type' }, { status: 400 });
  }
  
  const columnName = `${keyType}_key_encrypted`;
  
  const { error } = await supabase
    .from('user_api_keys')
    .update({ [columnName]: null, updated_at: new Date().toISOString() })
    .eq('user_id', user.id);
  
  if (error) {
    return NextResponse.json({ error: 'Failed to delete key' }, { status: 500 });
  }
  
  return NextResponse.json({ success: true });
}

/**
 * Helper function to get decrypted user keys (for use by other API routes)
 * Returns null for keys that aren't set
 */
export async function getUserApiKeys(userId: string): Promise<{
  gemini_key: string | null;
  apify_key: string | null;
  lingo_key: string | null;
  groq_key: string | null;
  ai_provider: 'gemini' | 'groq';
  preferred_language: string;
}> {
  const { data, error } = await supabase
    .from('user_api_keys')
    .select('gemini_key_encrypted, apify_key_encrypted, lingo_key_encrypted, groq_key_encrypted, ai_provider, preferred_language')
    .eq('user_id', userId)
    .single();
  
  if (error || !data) {
    return { gemini_key: null, apify_key: null, lingo_key: null, groq_key: null, ai_provider: 'gemini', preferred_language: 'en' };
  }
  
  return {
    gemini_key: data.gemini_key_encrypted ? decryptApiKey(data.gemini_key_encrypted) : null,
    apify_key: data.apify_key_encrypted ? decryptApiKey(data.apify_key_encrypted) : null,
    lingo_key: data.lingo_key_encrypted ? decryptApiKey(data.lingo_key_encrypted) : null,
    groq_key: data.groq_key_encrypted ? decryptApiKey(data.groq_key_encrypted) : null,
    ai_provider: (data.ai_provider as 'gemini' | 'groq') || 'gemini',
    preferred_language: data.preferred_language || 'en',
  };
}
