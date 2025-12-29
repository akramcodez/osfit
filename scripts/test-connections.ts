
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function testConnections() {
  console.log('🔍 Testing API connections...\n');

  
  console.log('1️⃣ Testing Supabase...');
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('   ❌ Supabase: Missing environment variables');
    } else {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { error } = await supabase.from('chat_sessions').select('id').limit(1);
      if (error) {
        console.log(`   ❌ Supabase: ${error.message}`);
      } else {
        console.log('   ✅ Supabase: Connected successfully!');
      }
    }
  } catch (e) {
    console.log(`   ❌ Supabase: ${e}`);
  }

  
  console.log('\n2️⃣ Testing Gemini...');
  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    
    if (!geminiKey) {
      console.log('   ❌ Gemini: Missing API key');
    } else {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
      const result = await model.generateContent('Say "connected" in one word');
      const text = result.response.text();
      console.log(`   ✅ Gemini: Connected! Response: "${text.trim().substring(0, 50)}"`);
    }
  } catch (e) {
    console.log(`   ❌ Gemini: ${e}`);
  }

  
  console.log('\n3️⃣ Testing Apify...');
  try {
    const apifyKey = process.env.APIFY_API_KEY;
    
    if (!apifyKey) {
      console.log('   ❌ Apify: Missing API key');
    } else {
      
      const { ApifyClient } = await import('apify-client');
      const client = new ApifyClient({ token: apifyKey });
      const user = await client.user().get();
      console.log(`   ✅ Apify: Connected! User: ${user?.username || 'verified'}`);
    }
  } catch (e) {
    console.log(`   ❌ Apify: ${e}`);
  }

  
  console.log('\n4️⃣ Testing Lingo.dev...');
  const lingoKey = process.env.LINGO_API_KEY;
  if (!lingoKey) {
    console.log('   ❌ Lingo: Missing API key');
  } else {
    console.log('   ✅ Lingo: API key is set (will test on first translation)');
  }

  console.log('\n✨ Connection tests complete!');
}

testConnections();
