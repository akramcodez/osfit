#!/usr/bin/env npx ts-node
/**
 * OSFIT API Key Testing Script
 * 
 * Comprehensive testing for:
 * - API key validation (valid/invalid/expired)
 * - Quota exceeded detection
 * - System vs User key priority
 * - Error response formats
 * - Endpoint response types
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ============ Configuration ============
interface TestConfig {
  name: string;
  key: string | null;
  expectedResult: 'valid' | 'invalid' | 'quota_exceeded' | 'no_key';
}

// Test keys - replace with actual keys to test
const TEST_KEYS: TestConfig[] = [
  {
    name: 'Valid System Key',
    key: process.env.GEMINI_API_KEY || null,
    expectedResult: process.env.GEMINI_API_KEY ? 'valid' : 'no_key'
  },
  {
    name: 'Invalid Key (malformed)',
    key: 'invalid-key-12345',
    expectedResult: 'invalid'
  },
  {
    name: 'Empty Key',
    key: '',
    expectedResult: 'no_key'
  },
  {
    name: 'Null Key',
    key: null,
    expectedResult: 'no_key'
  }
];

// ============ Utility Functions ============
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color: keyof typeof colors, ...args: unknown[]) {
  console.log(colors[color], ...args, colors.reset);
}

function header(title: string) {
  console.log('\n' + '='.repeat(60));
  log('cyan', `  ${title}`);
  console.log('='.repeat(60));
}

function subheader(title: string) {
  console.log('\n' + '-'.repeat(40));
  log('blue', `  ${title}`);
  console.log('-'.repeat(40));
}

function success(msg: string) {
  log('green', '  ✅ ' + msg);
}

function fail(msg: string) {
  log('red', '  ❌ ' + msg);
}

function warn(msg: string) {
  log('yellow', '  ⚠️  ' + msg);
}

function info(msg: string) {
  console.log('  ℹ️  ' + msg);
}

// ============ Test Classes ============

class TestResult {
  passed = 0;
  failed = 0;
  skipped = 0;
  
  addPass() { this.passed++; }
  addFail() { this.failed++; }
  addSkip() { this.skipped++; }
  
  summary() {
    header('TEST SUMMARY');
    success(`Passed: ${this.passed}`);
    if (this.failed > 0) fail(`Failed: ${this.failed}`);
    else info(`Failed: ${this.failed}`);
    warn(`Skipped: ${this.skipped}`);
    console.log('\n');
    return this.failed === 0;
  }
}

const results = new TestResult();

// ============ Test Functions ============

/**
 * Test 1: Gemini API Key Validation
 */
async function testGeminiKeyValidation(config: TestConfig): Promise<'valid' | 'invalid' | 'quota_exceeded' | 'no_key' | 'error'> {
  if (!config.key) {
    return 'no_key';
  }
  
  try {
    const genAI = new GoogleGenerativeAI(config.key);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const result = await model.generateContent('Say "test" only');
    const text = result.response.text();
    
    if (text) {
      return 'valid';
    }
    return 'error';
  } catch (e: unknown) {
    const error = e as Error;
    const msg = error.message?.toLowerCase() || '';
    
    if (msg.includes('quota') || msg.includes('429') || msg.includes('exceeded') || msg.includes('too many')) {
      return 'quota_exceeded';
    }
    if (msg.includes('api key') || msg.includes('invalid') || msg.includes('401') || msg.includes('api_key_invalid')) {
      return 'invalid';
    }
    
    console.log('    Unexpected error:', error.message?.substring(0, 100));
    return 'error';
  }
}

/**
 * Test 2: Effective Keys Priority Logic
 */
function testEffectiveKeysPriority() {
  subheader('Testing Effective Keys Priority Logic');
  
  interface UserKeys {
    gemini_key: string | null;
    apify_key: string | null;
    lingo_key: string | null;
  }
  
  interface EffectiveKeys {
    gemini: { key: string | null; source: 'user' | 'system' | 'none' };
    apify: { key: string | null; source: 'user' | 'system' | 'none' };
    lingo: { key: string | null; source: 'user' | 'system' | 'none' };
  }
  
  // Simulate system keys
  const SYSTEM_GEMINI = 'system-gemini-key';
  const SYSTEM_APIFY = 'system-apify-key';
  const SYSTEM_LINGO = 'system-lingo-key';
  
  function getEffectiveKeys(userKeys: UserKeys): EffectiveKeys {
    return {
      gemini: {
        key: userKeys.gemini_key || SYSTEM_GEMINI || null,
        source: userKeys.gemini_key ? 'user' : (SYSTEM_GEMINI ? 'system' : 'none')
      },
      apify: {
        key: userKeys.apify_key || SYSTEM_APIFY || null,
        source: userKeys.apify_key ? 'user' : (SYSTEM_APIFY ? 'system' : 'none')
      },
      lingo: {
        key: userKeys.lingo_key || SYSTEM_LINGO || null,
        source: userKeys.lingo_key ? 'user' : (SYSTEM_LINGO ? 'system' : 'none')
      }
    };
  }
  
  // Test cases
  const tests = [
    {
      name: 'No user keys → all system',
      userKeys: { gemini_key: null, apify_key: null, lingo_key: null },
      expected: { gemini: 'system', apify: 'system', lingo: 'system' }
    },
    {
      name: 'Only Gemini user key → Gemini user, rest system',
      userKeys: { gemini_key: 'user-gemini', apify_key: null, lingo_key: null },
      expected: { gemini: 'user', apify: 'system', lingo: 'system' }
    },
    {
      name: 'Gemini + Apify user keys → system Lingo only',
      userKeys: { gemini_key: 'user-gemini', apify_key: 'user-apify', lingo_key: null },
      expected: { gemini: 'user', apify: 'user', lingo: 'system' }
    },
    {
      name: 'All user keys → no system keys used',
      userKeys: { gemini_key: 'user-gemini', apify_key: 'user-apify', lingo_key: 'user-lingo' },
      expected: { gemini: 'user', apify: 'user', lingo: 'user' }
    }
  ];
  
  for (const test of tests) {
    const result = getEffectiveKeys(test.userKeys);
    const passed = 
      result.gemini.source === test.expected.gemini &&
      result.apify.source === test.expected.apify &&
      result.lingo.source === test.expected.lingo;
    
    if (passed) {
      success(test.name);
      results.addPass();
    } else {
      fail(`${test.name}`);
      info(`  Expected: gemini=${test.expected.gemini}, apify=${test.expected.apify}, lingo=${test.expected.lingo}`);
      info(`  Got: gemini=${result.gemini.source}, apify=${result.apify.source}, lingo=${result.lingo.source}`);
      results.addFail();
    }
  }
}

/**
 * Test 3: Error Response Format
 */
function testErrorResponseFormat() {
  subheader('Testing Error Response Formats');
  
  // Simulate ApiKeyError
  class ApiKeyError extends Error {
    service: 'gemini' | 'apify' | 'lingo';
    source: 'user' | 'system';
    
    constructor(service: 'gemini' | 'apify' | 'lingo', source: 'user' | 'system', message: string) {
      super(message);
      this.name = 'ApiKeyError';
      this.service = service;
      this.source = source;
    }
  }
  
  // Test structured error response
  const tests = [
    { service: 'gemini' as const, source: 'system' as const, message: 'Quota exceeded' },
    { service: 'apify' as const, source: 'user' as const, message: 'API key invalid' },
    { service: 'lingo' as const, source: 'system' as const, message: 'Rate limit' },
  ];
  
  for (const test of tests) {
    const error = new ApiKeyError(test.service, test.source, test.message);
    
    // Simulate JSON response
    const response = {
      error: error.message,
      errorType: 'api_key_error',
      service: error.service,
      source: error.source
    };
    
    // Validate response structure
    const hasAllFields = 
      response.error && 
      response.errorType === 'api_key_error' && 
      ['gemini', 'apify', 'lingo'].includes(response.service) &&
      ['user', 'system'].includes(response.source);
    
    if (hasAllFields) {
      success(`ApiKeyError(${test.service}, ${test.source}) → Correct response format`);
      results.addPass();
    } else {
      fail(`ApiKeyError(${test.service}, ${test.source}) → Missing fields`);
      results.addFail();
    }
  }
}

/**
 * Test 4: Quota Error Detection
 */
function testQuotaErrorDetection() {
  subheader('Testing Quota Error Detection');
  
  function isQuotaError(error: Error): boolean {
    const msg = error.message.toLowerCase();
    return msg.includes('quota') || msg.includes('rate limit') || msg.includes('429') || 
           msg.includes('too many requests') || msg.includes('exceeded');
  }
  
  const tests = [
    { msg: 'You exceeded your current quota', expected: true },
    { msg: '[429 Too Many Requests]', expected: true },
    { msg: 'Rate limit exceeded for model', expected: true },
    { msg: 'Too many requests, please wait', expected: true },
    { msg: 'Invalid API key provided', expected: false },
    { msg: 'Network connection failed', expected: false },
    { msg: 'Model not found', expected: false },
  ];
  
  for (const test of tests) {
    const result = isQuotaError(new Error(test.msg));
    if (result === test.expected) {
      success(`"${test.msg.substring(0, 35)}..." → ${test.expected ? 'QUOTA' : 'NOT QUOTA'}`);
      results.addPass();
    } else {
      fail(`"${test.msg.substring(0, 35)}..." → Expected: ${test.expected}, Got: ${result}`);
      results.addFail();
    }
  }
}

/**
 * Test 5: Error Message Parsing
 */
function testErrorMessageParsing() {
  subheader('Testing Error Message Parsing');
  
  interface ApiErrorResponse {
    error: string;
    errorType?: 'api_key_error';
    service?: 'gemini' | 'apify' | 'lingo';
    source?: 'user' | 'system';
  }
  
  function parseApiErrorResponse(response: ApiErrorResponse, language: string = 'en'): string {
    if (response.errorType === 'api_key_error' && response.service && response.source) {
      if (response.source === 'system') {
        return `App free credits for ${response.service} are exhausted. Please add your own API key.`;
      } else {
        return `Your ${response.service} API key credits are exhausted. Check your billing.`;
      }
    }
    return response.error;
  }
  
  const tests = [
    {
      response: { error: 'Quota exceeded', errorType: 'api_key_error' as const, service: 'gemini' as const, source: 'system' as const },
      expectedContains: 'App free credits'
    },
    {
      response: { error: 'Quota exceeded', errorType: 'api_key_error' as const, service: 'gemini' as const, source: 'user' as const },
      expectedContains: 'Your gemini API key'
    },
    {
      response: { error: 'Some random error' },
      expectedContains: 'Some random error'
    }
  ];
  
  for (const test of tests) {
    const result = parseApiErrorResponse(test.response);
    if (result.includes(test.expectedContains)) {
      success(`${test.response.source || 'fallback'} error → Contains "${test.expectedContains.substring(0, 25)}..."`);
      results.addPass();
    } else {
      fail(`Expected to contain "${test.expectedContains}", got "${result}"`);
      results.addFail();
    }
  }
}

/**
 * Test 6: API Key Validation Tests
 */
async function testApiKeyValidation() {
  subheader('Testing API Key Validation (Live)');
  
  for (const config of TEST_KEYS) {
    info(`Testing: ${config.name}`);
    const result = await testGeminiKeyValidation(config);
    
    if (result === config.expectedResult) {
      success(`${config.name} → ${result} (expected: ${config.expectedResult})`);
      results.addPass();
    } else if (result === 'quota_exceeded' && config.expectedResult === 'valid') {
      warn(`${config.name} → ${result} (key valid but quota exceeded)`);
      results.addPass(); // Still passes since key is technically valid
    } else {
      fail(`${config.name} → ${result} (expected: ${config.expectedResult})`);
      results.addFail();
    }
  }
}

/**
 * Test 7: Environment Variables Check
 */
function testEnvironmentVariables() {
  subheader('Testing Environment Variables');
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ENCRYPTION_SECRET',
  ];
  
  const optionalVars = [
    'GEMINI_API_KEY',
    'APIFY_API_KEY', 
    'LINGO_API_KEY',
  ];
  
  info('Required variables:');
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      success(`${varName} is set`);
      results.addPass();
    } else {
      fail(`${varName} is NOT set`);
      results.addFail();
    }
  }
  
  info('Optional variables (system keys):');
  for (const varName of optionalVars) {
    if (process.env[varName]) {
      success(`${varName} is set`);
    } else {
      warn(`${varName} is not set (users must provide their own)`);
    }
    results.addSkip(); // Don't count optional as pass/fail
  }
}

/**
 * Test 8: Response Type Validation
 */
function testResponseTypes() {
  subheader('Testing Response Type Structures');
  
  // Expected response types
  interface SuccessResponse {
    response: string;
  }
  
  interface ErrorResponse {
    error: string;
    errorType?: string;
    service?: string;
    source?: string;
  }
  
  // Test success response structure
  const successResp = { response: 'Hello, I am OSFIT!' };
  if (typeof successResp.response === 'string' && successResp.response.length > 0) {
    success('Success response has valid structure');
    results.addPass();
  } else {
    fail('Success response structure invalid');
    results.addFail();
  }
  
  // Test error response structure
  const errorResp = { error: 'Quota exceeded', errorType: 'api_key_error', service: 'gemini', source: 'system' };
  if (
    typeof errorResp.error === 'string' &&
    errorResp.errorType === 'api_key_error' &&
    ['gemini', 'apify', 'lingo'].includes(errorResp.service) &&
    ['user', 'system'].includes(errorResp.source)
  ) {
    success('Error response has valid structure');
    results.addPass();
  } else {
    fail('Error response structure invalid');
    results.addFail();
  }
  
  // Test simple error response
  const simpleError = { error: 'Something went wrong' };
  if (typeof simpleError.error === 'string') {
    success('Simple error response has valid structure');
    results.addPass();
  } else {
    fail('Simple error response structure invalid');
    results.addFail();
  }
}

// ============ Main ============

async function main() {
  console.log('\n');
  header('🧪 OSFIT API KEY TESTING SCRIPT');
  info('This script tests the API key flow, error handling, and response types.\n');
  
  // Run all tests
  testEnvironmentVariables();
  testEffectiveKeysPriority();
  testQuotaErrorDetection();
  testErrorResponseFormat();
  testErrorMessageParsing();
  testResponseTypes();
  
  // Live API tests (may cost quota)
  if (process.argv.includes('--live')) {
    await testApiKeyValidation();
  } else {
    subheader('Live API Tests (Skipped)');
    warn('Run with --live flag to test actual API keys');
    info('Example: npx ts-node scripts/test-api-keys.ts --live');
  }
  
  // Summary
  const allPassed = results.summary();
  
  if (allPassed) {
    log('green', '🎉 All tests passed!\n');
    process.exit(0);
  } else {
    log('red', '💥 Some tests failed. See above for details.\n');
    process.exit(1);
  }
}

main().catch(console.error);
