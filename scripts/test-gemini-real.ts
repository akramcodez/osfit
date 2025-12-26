#!/usr/bin/env ts-node
/**
 * Test script for REAL Gemini API responses (not mock)
 * Run with: npx ts-node scripts/test-gemini-real.ts
 * 
 * ⚠️ This will make real API calls to Gemini and consume API quota!
 */
// Make this file a module
export {};

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  explanation?: string;
  flowchart?: string;
}

const results: TestResult[] = [];

// Sample TypeScript code for testing
const SAMPLE_CODE = `import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  );

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data });
}`;

async function testRealLineExplanation(lineNumber: number): Promise<TestResult> {
  const testName = `REAL API: Explain Line ${lineNumber}`;
  
  console.log(`\n🔄 Testing: ${testName}...`);
  
  try {
    const lines = SAMPLE_CODE.split('\n');
    const lineContent = lines[lineNumber - 1] || '';
    
    console.log(`   Line content: "${lineContent.trim()}"`);
    
    const response = await fetch(`${BASE_URL}/api/explain-line`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lineNumber,
        lineContent,
        fullFileContent: SAMPLE_CODE,
        language: 'typescript',
        filePath: 'app/api/users/route.ts',
        useMockData: false // Use REAL Gemini API
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        name: testName,
        passed: false,
        message: `API error: ${data.error || response.status}`
      };
    }

    if (!data.explanation) {
      return {
        name: testName,
        passed: false,
        message: 'No explanation returned'
      };
    }

    // Validate the explanation is meaningful
    const explanation = data.explanation;
    const hasContent = explanation.length > 50;
    const isMock = data.mock === true;
    
    if (isMock) {
      return {
        name: testName,
        passed: false,
        message: 'API returned mock data instead of real Gemini response',
        explanation
      };
    }

    return {
      name: testName,
      passed: hasContent,
      message: hasContent 
        ? `✓ Real Gemini explanation (${explanation.length} chars)` 
        : `✗ Explanation too short`,
      explanation: explanation.substring(0, 300) + (explanation.length > 300 ? '...' : '')
    };
  } catch (error) {
    return {
      name: testName,
      passed: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown'}`
    };
  }
}

async function testRealFlowchart(): Promise<TestResult> {
  const testName = `REAL API: Generate Flowchart`;
  
  console.log(`\n🔄 Testing: ${testName}...`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/generate-flowchart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileContent: SAMPLE_CODE,
        language: 'typescript',
        filePath: 'app/api/users/route.ts',
        useMockData: false // Use REAL Gemini API
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        name: testName,
        passed: false,
        message: `API error: ${data.error || response.status}`
      };
    }

    if (!data.flowchart) {
      return {
        name: testName,
        passed: false,
        message: 'No flowchart returned'
      };
    }

    const flowchart = data.flowchart;
    const isMock = data.mock === true;
    
    if (isMock) {
      return {
        name: testName,
        passed: false,
        message: 'API returned mock data instead of real Gemini response',
        flowchart
      };
    }

    // Validate Mermaid syntax
    const hasFlowchartDecl = flowchart.includes('flowchart') || flowchart.includes('graph');
    const hasNodes = flowchart.includes('[') && flowchart.includes(']');
    const hasConnections = flowchart.includes('-->');
    const isValidMermaid = hasFlowchartDecl && hasNodes && hasConnections;

    return {
      name: testName,
      passed: isValidMermaid,
      message: isValidMermaid 
        ? `✓ Valid Mermaid flowchart from Gemini (${flowchart.split('\n').length} lines)` 
        : `✗ Invalid Mermaid syntax from Gemini`,
      flowchart
    };
  } catch (error) {
    return {
      name: testName,
      passed: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown'}`
    };
  }
}

async function runTests() {
  console.log('🧪 Testing REAL Gemini API Responses');
  console.log('⚠️  This will consume API quota!\n');
  console.log('=' .repeat(60));

  // Test line explanations for key lines
  results.push(await testRealLineExplanation(1));   // import statement
  results.push(await testRealLineExplanation(4));   // async function
  results.push(await testRealLineExplanation(10));  // supabase query
  results.push(await testRealLineExplanation(15));  // error handling
  results.push(await testRealLineExplanation(19));  // return statement

  // Test flowchart generation
  results.push(await testRealFlowchart());

  // Print summary
  console.log('\n' + '=' .repeat(60));
  console.log('\n📊 REAL API Test Results:\n');
  
  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
    console.log(`   ${result.message}`);
    
    if (result.explanation) {
      console.log('\n   📝 Explanation:');
      console.log('   ' + '-'.repeat(40));
      console.log(result.explanation.split('\n').map(l => '   ' + l).join('\n'));
      console.log('   ' + '-'.repeat(40));
    }
    
    if (result.flowchart) {
      console.log('\n   📊 Flowchart:');
      console.log('   ' + '-'.repeat(40));
      console.log(result.flowchart.split('\n').map(l => '   ' + l).join('\n'));
      console.log('   ' + '-'.repeat(40));
    }
    
    console.log();
    
    if (result.passed) passed++;
    else failed++;
  }

  console.log('=' .repeat(60));
  console.log(`\n📈 Summary: ${passed}/${results.length} tests passed`);
  
  if (failed > 0) {
    console.log(`\n⚠️  ${failed} test(s) failed`);
    console.log('\nPossible reasons:');
    console.log('- GEMINI_API_KEY not set or invalid');
    console.log('- API quota exceeded');
    console.log('- Network issues');
    process.exit(1);
  } else {
    console.log('\n🎉 All real API tests passed!');
  }
}

runTests().catch(console.error);
