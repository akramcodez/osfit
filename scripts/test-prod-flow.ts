/**
 * Production Flow Test Script
 * Tests both Mentor (messages) and File Explainer modes
 * 
 * Run: npx ts-node --skip-project scripts/test-prod-flow.ts
 */

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from project root
dotenv.config({ path: resolve(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GEMINI_KEY = process.env.GEMINI_API_KEY!;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(type: 'pass' | 'fail' | 'info' | 'section', message: string) {
  const prefix = {
    pass: `${colors.green}✓${colors.reset}`,
    fail: `${colors.red}✗${colors.reset}`,
    info: `${colors.cyan}ℹ${colors.reset}`,
    section: `\n${colors.yellow}▶${colors.reset}`,
  };
  console.log(`${prefix[type]} ${message}`);
}

// ============================================
// SUPABASE HELPERS
// ============================================

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function supabaseQuery<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error: ${error}`);
  }
  
  return response.json() as Promise<T>;
}

// ============================================
// TEST 1: MENTOR MODE (messages table)
// ============================================

async function testMentorMode() {
  log('section', 'Testing MENTOR MODE (messages table)');
  
  const testSessionId = generateUUID();
  
  try {
    // 0. Get an existing user from the database
    log('info', 'Fetching existing user for test...');
    const profiles = await supabaseQuery<any[]>('profiles?limit=1');
    
    if (!profiles || profiles.length === 0) {
      log('fail', 'No users found in database. Cannot run test.');
      return false;
    }
    
    const testUserId = profiles[0].id;
    log('pass', `Using existing user: ${testUserId.substring(0, 8)}...`);
    
    // 1. Create a test session
    log('info', 'Creating test session...');
    const [session] = await supabaseQuery('chat_sessions', {
      method: 'POST',
      body: JSON.stringify({
        id: testSessionId,
        session_token: `test-token-${Date.now()}`,
        user_id: testUserId,
        title: 'Test Mentor Session',
        mode: 'mentor',
      }),
    });
    log('pass', `Session created: ${session.id}`);
    
    // 2. Simulate user message
    log('info', 'Saving user message...');
    const userContent = 'How do I contribute to open source?';
    const [userMsg] = await supabaseQuery('messages', {
      method: 'POST',
      body: JSON.stringify({
        session_id: testSessionId,
        role: 'user',
        content: userContent,
        metadata: {},
      }),
    });
    
    // Verify user message
    if (userMsg.role === 'user' && userMsg.content === userContent) {
      log('pass', 'User message saved correctly');
    } else {
      log('fail', 'User message mismatch');
    }
    
    // 3. Generate AI response using Gemini
    log('info', 'Generating AI response via Gemini...');
    const aiResponse = await generateGeminiResponse(
      'You are an open source mentor. Be concise.',
      userContent
    );
    
    if (aiResponse && aiResponse.length > 50) {
      log('pass', `AI response generated (${aiResponse.length} chars)`);
    } else {
      log('fail', 'AI response too short or empty');
    }
    
    // 4. Check markdown format in AI response
    log('info', 'Checking markdown format...');
    const hasMarkdown = checkMarkdownFormat(aiResponse);
    if (hasMarkdown) {
      log('pass', 'Response contains proper markdown formatting');
    } else {
      log('info', 'Response may lack markdown (depends on AI)');
    }
    
    // 5. Save AI response
    log('info', 'Saving assistant message...');
    const [assistantMsg] = await supabaseQuery('messages', {
      method: 'POST',
      body: JSON.stringify({
        session_id: testSessionId,
        role: 'assistant',
        content: aiResponse,
        metadata: { language: 'en' },
      }),
    });
    
    // Verify assistant message
    if (assistantMsg.role === 'assistant' && assistantMsg.metadata?.language === 'en') {
      log('pass', 'Assistant message saved with metadata');
    } else {
      log('fail', 'Assistant message metadata mismatch');
    }
    
    // 6. Verify both messages in DB
    log('info', 'Verifying messages in database...');
    const messages = await supabaseQuery(
      `messages?session_id=eq.${testSessionId}&order=created_at.asc`
    );
    
    if (messages.length === 2) {
      log('pass', `Found ${messages.length} messages in session`);
      log('pass', `  [1] role: ${messages[0].role}, content: ${messages[0].content.substring(0, 50)}...`);
      log('pass', `  [2] role: ${messages[1].role}, content: ${messages[1].content.substring(0, 50)}...`);
    } else {
      log('fail', `Expected 2 messages, found ${messages.length}`);
    }
    
    // Cleanup
    await cleanupTestData(testSessionId);
    log('pass', 'Test data cleaned up');
    
    return true;
  } catch (error) {
    log('fail', `Mentor test error: ${error}`);
    await cleanupTestData(testSessionId);
    return false;
  }
}

// ============================================
// TEST 2: FILE EXPLAINER MODE
// ============================================

async function testFileExplainerMode() {
  log('section', 'Testing FILE EXPLAINER MODE (file_explanations table)');
  
  const testSessionId = generateUUID();
  const testFileUrl = 'https://github.com/vercel/next.js/blob/canary/packages/next/src/shared/lib/constants.ts';
  
  try {
    // 0. Get an existing user from the database
    log('info', 'Fetching existing user for test...');
    const profiles = await supabaseQuery<any[]>('profiles?limit=1');
    
    if (!profiles || profiles.length === 0) {
      log('fail', 'No users found in database. Cannot run test.');
      return false;
    }
    
    const testUserId = profiles[0].id;
    log('pass', `Using existing user: ${testUserId.substring(0, 8)}...`);
    
    // 1. Create a test session
    log('info', 'Creating test session...');
    const [session] = await supabaseQuery('chat_sessions', {
      method: 'POST',
      body: JSON.stringify({
        id: testSessionId,
        session_token: `test-token-${Date.now()}`,
        user_id: testUserId,
        title: 'Test File Explainer Session',
        mode: 'file_explainer',
      }),
    });
    log('pass', `Session created: ${session.id}`);
    
    // 2. Test URL validation
    log('info', 'Testing URL validation...');
    const validationTests = [
      { url: 'hello world', valid: false, reason: 'not github url' },
      { url: 'https://github.com/owner/repo/tree/main/src', valid: false, reason: 'folder url' },
      { url: 'https://github.com/owner/repo', valid: false, reason: 'repo root' },
      { url: testFileUrl, valid: true, reason: 'valid file url' },
    ];
    
    for (const test of validationTests) {
      const isValid = validateFileUrl(test.url);
      if (isValid === test.valid) {
        log('pass', `  "${test.reason}" → ${test.valid ? 'accepted' : 'rejected'}`);
      } else {
        log('fail', `  "${test.reason}" validation failed`);
      }
    }
    
    // 3. Fetch file content (testing Apify/direct fetch)
    log('info', `Fetching file content from GitHub...`);
    const fileData = await fetchGitHubFile(testFileUrl);
    
    if (fileData.content && fileData.content.length > 0) {
      log('pass', `File content fetched (${fileData.content.length} chars)`);
    } else {
      log('fail', 'File content is empty');
    }
    
    if (fileData.path && fileData.path.includes('/')) {
      log('pass', `File path extracted: ${fileData.path}`);
    } else {
      log('fail', `File path extraction issue: ${fileData.path}`);
    }
    
    if (fileData.language) {
      log('pass', `Language detected: ${fileData.language}`);
    } else {
      log('fail', 'Language not detected');
    }
    
    // 4. Generate explanation via Gemini
    log('info', 'Generating file explanation via Gemini...');
    const explanation = await generateFileExplanation(fileData);
    
    if (explanation && explanation.length > 100) {
      log('pass', `Explanation generated (${explanation.length} chars)`);
    } else {
      log('fail', 'Explanation too short or empty');
    }
    
    // 5. Check explanation markdown format
    log('info', 'Checking explanation format...');
    const hasProperFormat = checkFileExplanationFormat(explanation);
    if (hasProperFormat) {
      log('pass', 'Explanation has proper structure');
    } else {
      log('info', 'Explanation format may vary');
    }
    
    // 6. Save to file_explanations table
    log('info', 'Saving to file_explanations table...');
    const [fileExplanation] = await supabaseQuery('file_explanations', {
      method: 'POST',
      body: JSON.stringify({
        session_id: testSessionId,
        role: 'assistant',
        file_url: testFileUrl,
        file_path: fileData.path,
        file_content: fileData.content.substring(0, 5000), // Limit for test
        language: fileData.language,
        explanation: explanation,
        metadata: { language: 'en' },
      }),
    });
    
    // 7. Verify all fields saved correctly
    log('info', 'Verifying saved data...');
    const [savedRecord] = await supabaseQuery(
      `file_explanations?id=eq.${fileExplanation.id}`
    );
    
    const checks = [
      { field: 'role', expected: 'assistant', actual: savedRecord.role },
      { field: 'file_url', expected: testFileUrl, actual: savedRecord.file_url },
      { field: 'file_path', expected: fileData.path, actual: savedRecord.file_path },
      { field: 'language', expected: fileData.language, actual: savedRecord.language },
    ];
    
    for (const check of checks) {
      if (check.actual === check.expected) {
        log('pass', `  ${check.field}: ✓`);
      } else {
        log('fail', `  ${check.field}: expected "${check.expected}", got "${check.actual}"`);
      }
    }
    
    if (savedRecord.file_content && savedRecord.file_content.length > 0) {
      log('pass', `  file_content: ✓ (${savedRecord.file_content.length} chars)`);
    } else {
      log('fail', '  file_content: NULL or empty');
    }
    
    if (savedRecord.explanation && savedRecord.explanation.length > 0) {
      log('pass', `  explanation: ✓ (${savedRecord.explanation.length} chars)`);
    } else {
      log('fail', '  explanation: NULL or empty');
    }
    
    if (savedRecord.metadata?.language === 'en') {
      log('pass', '  metadata.language: ✓');
    } else {
      log('fail', `  metadata: ${JSON.stringify(savedRecord.metadata)}`);
    }
    
    // 8. Test Lingo translation (Spanish)
    log('info', 'Testing Lingo translation (to Spanish)...');
    const translatedExplanation = await translateText(explanation.substring(0, 500), 'es');
    
    if (translatedExplanation && translatedExplanation !== explanation.substring(0, 500)) {
      log('pass', `Translation successful (${translatedExplanation.length} chars)`);
      log('info', `  Preview: "${translatedExplanation.substring(0, 100)}..."`);
    } else {
      log('fail', 'Translation failed or unchanged');
    }
    
    // Cleanup
    await cleanupTestData(testSessionId);
    log('pass', 'Test data cleaned up');
    
    return true;
  } catch (error) {
    log('fail', `File Explainer test error: ${error}`);
    await cleanupTestData(testSessionId);
    return false;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function validateFileUrl(url: string): boolean {
  const trimmed = url.trim();
  const isGitHub = trimmed.includes('github.com');
  const isFile = trimmed.includes('/blob/');
  const isFolder = trimmed.includes('/tree/');
  
  return isGitHub && isFile && !isFolder;
}

async function fetchGitHubFile(fileUrl: string) {
  const rawUrl = fileUrl
    .replace('github.com', 'raw.githubusercontent.com')
    .replace('/blob/', '/');
  
  const response = await fetch(rawUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status}`);
  }
  
  const content = await response.text();
  
  // Extract path
  const urlParts = fileUrl.split('/blob/');
  let path = '';
  if (urlParts.length > 1) {
    const afterBlob = urlParts[1];
    const segments = afterBlob.split('/');
    path = segments.slice(1).join('/');
  }
  
  const fileName = path.split('/').pop() || '';
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  const languageMap: Record<string, string> = {
    'js': 'javascript', 'jsx': 'javascript',
    'ts': 'typescript', 'tsx': 'typescript',
    'py': 'python', 'rb': 'ruby', 'go': 'go',
    'rs': 'rust', 'java': 'java', 'kt': 'kotlin',
  };
  
  return {
    path,
    content: content.substring(0, 8000),
    language: languageMap[extension] || extension,
    url: fileUrl,
  };
}

async function generateGeminiResponse(systemPrompt: string, userMessage: string): Promise<string> {
  // Try gemini-1.5-flash first (usually has more quota)
  const models = ['gemini-1.5-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'];
  
  for (const model of models) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { 
              role: 'user', 
              parts: [{ text: userMessage }] 
            }
          ],
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          generationConfig: { 
            maxOutputTokens: 800,
            temperature: 0.7,
          },
        }),
      }
    );
    
    if (response.ok) {
      const data = await response.json() as any;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (text) {
        log('info', `  (using ${model})`);
        return text;
      }
    }
    
    // If this model failed, try the next one
    const errorData = await response.json().catch(() => ({})) as any;
    if (errorData.error?.code !== 429) {
      // Not a quota error, so return empty
      console.error(`Gemini API error (${model}):`, errorData.error?.message || 'Unknown error');
      break;
    }
  }
  
  return '';
}

async function generateFileExplanation(fileData: { path: string; content: string; language: string }): Promise<string> {
  const systemPrompt = `You are OSFIT File Explainer. Analyze this code file and provide:
1. File Purpose (1-2 sentences)
2. Key Functions/Components (list with descriptions)
3. Logic Flow
4. Dependencies

Be concise, use markdown formatting.`;

  const context = `File: ${fileData.path}
Language: ${fileData.language}

Code:
\`\`\`${fileData.language}
${fileData.content.substring(0, 3000)}
\`\`\``;

  return generateGeminiResponse(systemPrompt, context);
}

async function translateText(text: string, targetLang: string): Promise<string> {
  const LINGO_KEY = process.env.LINGO_API_KEY;
  if (!LINGO_KEY) {
    throw new Error('LINGO_API_KEY not set');
  }
  
  try {
    // Using Lingo.dev SDK
    const { LingoDotDevEngine } = await import('lingo.dev/sdk');
    const lingoDotDev = new LingoDotDevEngine({
      apiKey: LINGO_KEY,
    });
    
    const result = await lingoDotDev.localizeText(text, {
      sourceLocale: 'en',
      targetLocale: targetLang,
    });
    
    return result || text;
  } catch (error) {
    console.error('Translation error:', error);
    // Fallback: use Gemini for translation
    log('info', '  Falling back to Gemini for translation...');
    const translated = await generateGeminiResponse(
      `You are a translator. Translate the following text to ${targetLang}. Only output the translation, nothing else.`,
      text
    );
    return translated || text;
  }
}

function checkMarkdownFormat(text: string): boolean {
  // Check for common markdown elements
  const hasHeading = /^#{1,3}\s/m.test(text);
  const hasBold = /\*\*[^*]+\*\*/.test(text);
  const hasList = /^[-*]\s/m.test(text) || /^\d+\.\s/m.test(text);
  const hasCodeBlock = /```[\s\S]*```/.test(text);
  const hasInlineCode = /`[^`]+`/.test(text);
  
  return hasHeading || hasBold || hasList || hasCodeBlock || hasInlineCode;
}

function checkFileExplanationFormat(text: string): boolean {
  // Check for expected sections in file explanation
  const hasPurpose = /purpose|overview|about/i.test(text);
  const hasFunctions = /function|component|method|class/i.test(text);
  const hasFlow = /flow|logic|process|how/i.test(text);
  const hasDependencies = /depend|import|export|require/i.test(text);
  
  return hasPurpose || hasFunctions || hasFlow || hasDependencies;
}

async function cleanupTestData(sessionId: string) {
  try {
    // Delete file_explanations
    await fetch(`${SUPABASE_URL}/rest/v1/file_explanations?session_id=eq.${sessionId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });
    
    // Delete messages
    await fetch(`${SUPABASE_URL}/rest/v1/messages?session_id=eq.${sessionId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });
    
    // Delete session
    await fetch(`${SUPABASE_URL}/rest/v1/chat_sessions?id=eq.${sessionId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  OSFIT PRODUCTION FLOW TEST');
  console.log('='.repeat(60));
  
  // Check required env vars
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !GEMINI_KEY) {
    log('fail', 'Missing required environment variables');
    process.exit(1);
  }
  log('pass', 'Environment variables loaded');
  
  const results = {
    mentor: false,
    fileExplainer: false,
  };
  
  // Run tests
  results.mentor = await testMentorMode();
  results.fileExplainer = await testFileExplainerMode();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('  TEST SUMMARY');
  console.log('='.repeat(60));
  
  log(results.mentor ? 'pass' : 'fail', `Mentor Mode: ${results.mentor ? 'PASSED' : 'FAILED'}`);
  log(results.fileExplainer ? 'pass' : 'fail', `File Explainer Mode: ${results.fileExplainer ? 'PASSED' : 'FAILED'}`);
  
  const allPassed = Object.values(results).every(r => r);
  console.log('\n' + (allPassed ? colors.green : colors.red) + 
    `Overall: ${allPassed ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED ✗'}` + 
    colors.reset + '\n');
  
  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);
