/**
 * Test Apify Actor and Lingo Translation
 * Tests the actual cloud services (uses API credits)
 * 
 * Run: npx tsx scripts/test-apify-lingo.ts
 */

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { ApifyClient } from 'apify-client';
import { LingoDotDevEngine } from 'lingo.dev/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from project root
dotenv.config({ path: resolve(__dirname, '..', '.env.local') });

const APIFY_KEY = process.env.APIFY_API_KEY!;
const LINGO_KEY = process.env.LINGO_API_KEY!;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

function log(type: 'pass' | 'fail' | 'info' | 'section' | 'data', message: string) {
  const prefix = {
    pass: `${colors.green}✓${colors.reset}`,
    fail: `${colors.red}✗${colors.reset}`,
    info: `${colors.cyan}ℹ${colors.reset}`,
    section: `\n${colors.yellow}▶${colors.reset}`,
    data: `  ${colors.dim}│${colors.reset}`,
  };
  console.log(`${prefix[type]} ${message}`);
}

// ============================================
// TEST 1: APIFY ACTOR - File Fetching
// ============================================

async function testApifyActor() {
  log('section', 'Testing APIFY ACTOR (GitHub File Scraper)');
  
  const testFileUrl = 'https://github.com/vercel/next.js/blob/canary/packages/next/src/shared/lib/constants.ts';
  const ACTOR_NAME = 'sincere_spinner/osfit-github-scraper';
  
  try {
    // 1. Initialize Apify client
    log('info', 'Initializing Apify client...');
    const apifyClient = new ApifyClient({
      token: APIFY_KEY,
    });
    
    if (!APIFY_KEY) {
      log('fail', 'APIFY_API_KEY not set');
      return false;
    }
    log('pass', `Apify key configured: ${APIFY_KEY.substring(0, 15)}...`);
    
    // 2. Run the actor to fetch file
    log('info', `Running actor: ${ACTOR_NAME}`);
    log('info', `Fetching: ${testFileUrl}`);
    
    const startTime = Date.now();
    const run = await apifyClient.actor(ACTOR_NAME).call({
      url: testFileUrl,
      type: 'file',
    });
    const elapsed = Date.now() - startTime;
    
    log('pass', `Actor run completed in ${elapsed}ms`);
    log('data', `Run ID: ${run.id}`);
    log('data', `Status: ${run.status}`);
    
    // 3. Fetch results from dataset
    log('info', 'Fetching results from dataset...');
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    
    if (!items || items.length === 0) {
      log('fail', 'No items returned from actor');
      return false;
    }
    
    const fileData = items[0] as any;
    log('pass', `Got ${items.length} item(s) from dataset`);
    
    // 4. Verify file data structure
    log('info', 'Verifying file data structure...');
    
    const checks = [
      { field: 'type', value: fileData.type, expected: 'file' },
      { field: 'path', value: fileData.path, check: (v: any) => v && v.includes('/') },
      { field: 'content', value: fileData.content, check: (v: any) => v && v.length > 100 },
      { field: 'url', value: fileData.url, expected: testFileUrl },
      { field: 'language', value: fileData.language, check: (v: any) => !!v },
    ];
    
    let allPassed = true;
    for (const check of checks) {
      let passed = false;
      if (check.expected !== undefined) {
        passed = check.value === check.expected;
      } else if (check.check) {
        passed = check.check(check.value);
      }
      
      if (passed) {
        log('pass', `  ${check.field}: ${typeof check.value === 'string' && check.value.length > 50 ? `${check.value.substring(0, 50)}...` : check.value}`);
      } else {
        log('fail', `  ${check.field}: ${check.value}`);
        allPassed = false;
      }
    }
    
    // 5. Show content preview
    if (fileData.content) {
      log('info', 'Content preview (first 200 chars):');
      console.log(colors.dim + '  ┌' + '─'.repeat(60) + colors.reset);
      const lines = fileData.content.substring(0, 200).split('\n');
      for (const line of lines) {
        console.log(colors.dim + '  │ ' + colors.reset + line);
      }
      console.log(colors.dim + '  └' + '─'.repeat(60) + colors.reset);
    }
    
    // 6. Summary
    log('info', 'File Data Summary:');
    log('data', `Path: ${fileData.path}`);
    log('data', `Language: ${fileData.language}`);
    log('data', `Content length: ${fileData.content?.length || 0} chars`);
    
    return allPassed;
  } catch (error: any) {
    log('fail', `Apify test error: ${error.message}`);
    console.error(error);
    return false;
  }
}

// ============================================
// TEST 2: LINGO TRANSLATION
// ============================================

async function testLingoTranslation() {
  log('section', 'Testing LINGO.DEV Translation SDK');
  
  const testText = `## How to Contribute
  
Here are some ways you can contribute:

1. **Fork the repository** - Create your own copy
2. **Create a branch** - Make your changes in a new branch
3. **Submit a PR** - Open a pull request with your changes

\`\`\`bash
git clone https://github.com/example/repo
git checkout -b my-feature
\`\`\``;

  const targetLanguages = ['es', 'fr', 'hi'];
  
  try {
    // 1. Initialize Lingo client
    log('info', 'Initializing Lingo.dev client...');
    
    if (!LINGO_KEY) {
      log('fail', 'LINGO_API_KEY not set');
      return false;
    }
    log('pass', `Lingo key configured: ${LINGO_KEY.substring(0, 15)}...`);
    
    const lingoDotDev = new LingoDotDevEngine({
      apiKey: LINGO_KEY,
    });
    
    log('pass', 'Lingo SDK initialized');
    
    // 2. Show original text
    log('info', 'Original text (English):');
    console.log(colors.dim + '  ┌' + '─'.repeat(60) + colors.reset);
    const origLines = testText.substring(0, 150).split('\n');
    for (const line of origLines) {
      console.log(colors.dim + '  │ ' + colors.reset + line);
    }
    console.log(colors.dim + '  └' + '─'.repeat(60) + colors.reset);
    
    // 3. Test translations
    let allPassed = true;
    
    for (const lang of targetLanguages) {
      log('info', `Translating to ${lang}...`);
      
      try {
        const startTime = Date.now();
        const content = { text: testText };
        const translated = await lingoDotDev.localizeObject(content, {
          sourceLocale: 'en',
          targetLocale: lang,
        });
        const elapsed = Date.now() - startTime;
        
        if (translated.text && translated.text !== testText) {
          log('pass', `${lang}: Translation successful (${elapsed}ms)`);
          
          // Show preview
          const preview = translated.text.substring(0, 100).replace(/\n/g, ' ');
          log('data', `Preview: "${preview}..."`);
          
          // Check that markdown is preserved
          const hasMarkdown = translated.text.includes('**') || 
                             translated.text.includes('##') || 
                             translated.text.includes('```');
          if (hasMarkdown) {
            log('pass', `  Markdown formatting preserved`);
          } else {
            log('info', `  Markdown may have been altered`);
          }
        } else {
          log('fail', `${lang}: Translation unchanged or empty`);
          allPassed = false;
        }
      } catch (langError: any) {
        log('fail', `${lang}: ${langError.message}`);
        allPassed = false;
      }
    }
    
    return allPassed;
  } catch (error: any) {
    log('fail', `Lingo test error: ${error.message}`);
    console.error(error);
    return false;
  }
}

// ============================================
// TEST 3: Direct File Fetch (fallback method)
// ============================================

async function testDirectFetch() {
  log('section', 'Testing DIRECT FETCH (Development Mode Fallback)');
  
  const testFileUrl = 'https://github.com/facebook/react/blob/main/packages/react/src/ReactClient.js';
  
  try {
    // 1. Convert to raw URL
    const rawUrl = testFileUrl
      .replace('github.com', 'raw.githubusercontent.com')
      .replace('/blob/', '/');
    
    log('info', `Fetching from: ${rawUrl}`);
    
    const startTime = Date.now();
    const response = await fetch(rawUrl);
    const elapsed = Date.now() - startTime;
    
    if (!response.ok) {
      log('fail', `HTTP ${response.status}: ${response.statusText}`);
      return false;
    }
    
    const content = await response.text();
    log('pass', `Fetched in ${elapsed}ms (${content.length} chars)`);
    
    // 2. Extract path from URL
    const urlParts = testFileUrl.split('/blob/');
    let path = '';
    if (urlParts.length > 1) {
      const afterBlob = urlParts[1];
      const segments = afterBlob.split('/');
      path = segments.slice(1).join('/');
    }
    
    log('pass', `Extracted path: ${path}`);
    
    // 3. Detect language
    const fileName = path.split('/').pop() || '';
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
    };
    
    const language = languageMap[extension] || extension;
    log('pass', `Detected language: ${language} (from .${extension})`);
    
    // 4. Show content preview
    log('info', 'Content preview:');
    console.log(colors.dim + '  ┌' + '─'.repeat(60) + colors.reset);
    const lines = content.substring(0, 300).split('\n');
    for (const line of lines.slice(0, 10)) {
      console.log(colors.dim + '  │ ' + colors.reset + line);
    }
    console.log(colors.dim + '  └' + '─'.repeat(60) + colors.reset);
    
    return true;
  } catch (error: any) {
    log('fail', `Direct fetch error: ${error.message}`);
    return false;
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('\n' + colors.bold + '═'.repeat(60) + colors.reset);
  console.log(colors.bold + '  APIFY + LINGO SERVICE TEST' + colors.reset);
  console.log(colors.bold + '═'.repeat(60) + colors.reset);
  
  // Check env vars
  log('info', 'Checking environment variables...');
  
  if (!APIFY_KEY) {
    log('fail', 'APIFY_API_KEY missing');
  } else {
    log('pass', 'APIFY_API_KEY present');
  }
  
  if (!LINGO_KEY) {
    log('fail', 'LINGO_API_KEY missing');
  } else {
    log('pass', 'LINGO_API_KEY present');
  }
  
  const results = {
    apify: false,
    lingo: false,
    directFetch: false,
  };
  
  // Run tests
  results.directFetch = await testDirectFetch();
  results.apify = await testApifyActor();
  results.lingo = await testLingoTranslation();
  
  // Summary
  console.log('\n' + colors.bold + '═'.repeat(60) + colors.reset);
  console.log(colors.bold + '  TEST SUMMARY' + colors.reset);
  console.log(colors.bold + '═'.repeat(60) + colors.reset);
  
  log(results.directFetch ? 'pass' : 'fail', `Direct Fetch (Dev Mode): ${results.directFetch ? 'PASSED' : 'FAILED'}`);
  log(results.apify ? 'pass' : 'fail', `Apify Actor (Prod Mode): ${results.apify ? 'PASSED' : 'FAILED'}`);
  log(results.lingo ? 'pass' : 'fail', `Lingo Translation: ${results.lingo ? 'PASSED' : 'FAILED'}`);
  
  const allPassed = Object.values(results).every(r => r);
  console.log('\n' + (allPassed ? colors.green : colors.yellow) + 
    `Overall: ${allPassed ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED'}` + 
    colors.reset + '\n');
  
  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);
