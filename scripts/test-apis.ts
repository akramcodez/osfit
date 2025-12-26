#!/usr/bin/env ts-node
/**
 * Test script for the explain-line and generate-flowchart APIs
 * Run with: npx ts-node scripts/test-apis.ts
 */
// Make this file a module
export {};

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  data?: unknown;
}

const results: TestResult[] = [];

// Sample code snippets for testing
const TEST_CODES = {
  typescript: `import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export async function fetchData(endpoint: string) {
  const response = await apiClient.get(endpoint);
  return response.data;
}`,
  
  javascript: `const express = require('express');
const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});`,

  python: `import requests
from typing import Dict, Any

def fetch_api_data(url: str) -> Dict[str, Any]:
    """Fetch data from an API endpoint."""
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"API error: {response.status_code}")`
};

async function testExplainLine(
  lineNumber: number,
  code: string,
  language: string,
  useMock: boolean
): Promise<TestResult> {
  const testName = `explain-line: Line ${lineNumber} (${language}, mock=${useMock})`;
  
  try {
    const lines = code.split('\n');
    const lineContent = lines[lineNumber - 1] || '';
    
    const response = await fetch(`${BASE_URL}/api/explain-line`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lineNumber,
        lineContent,
        fullFileContent: code,
        language,
        filePath: `test.${language === 'typescript' ? 'ts' : language === 'javascript' ? 'js' : 'py'}`,
        useMockData: useMock
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        name: testName,
        passed: false,
        message: `API returned ${response.status}: ${data.error || 'Unknown error'}`
      };
    }

    if (!data.explanation) {
      return {
        name: testName,
        passed: false,
        message: 'No explanation returned',
        data
      };
    }

    // Validate explanation contains expected content
    const explanation = data.explanation;
    const hasLineReference = explanation.includes(`${lineNumber}`) || explanation.includes('Line');
    
    return {
      name: testName,
      passed: true,
      message: `✓ Got explanation (${explanation.length} chars)`,
      data: {
        preview: explanation.substring(0, 150) + '...',
        hasLineReference
      }
    };
  } catch (error) {
    return {
      name: testName,
      passed: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function testGenerateFlowchart(
  code: string,
  language: string,
  useMock: boolean
): Promise<TestResult> {
  const testName = `generate-flowchart: ${language} (mock=${useMock})`;
  
  try {
    const response = await fetch(`${BASE_URL}/api/generate-flowchart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileContent: code,
        language,
        filePath: `test.${language === 'typescript' ? 'ts' : language === 'javascript' ? 'js' : 'py'}`,
        useMockData: useMock
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        name: testName,
        passed: false,
        message: `API returned ${response.status}: ${data.error || 'Unknown error'}`
      };
    }

    if (!data.flowchart) {
      return {
        name: testName,
        passed: false,
        message: 'No flowchart returned',
        data
      };
    }

    // Validate flowchart structure
    const flowchart = data.flowchart;
    const hasFlowchartDeclaration = flowchart.includes('flowchart') || flowchart.includes('graph');
    const hasNodes = flowchart.includes('[') && flowchart.includes(']');
    const hasConnections = flowchart.includes('-->');

    const isValidMermaid = hasFlowchartDeclaration && hasNodes && hasConnections;

    return {
      name: testName,
      passed: isValidMermaid,
      message: isValidMermaid 
        ? `✓ Valid Mermaid flowchart (${flowchart.split('\n').length} lines)`
        : `✗ Invalid Mermaid syntax`,
      data: {
        preview: flowchart.substring(0, 200) + (flowchart.length > 200 ? '...' : ''),
        hasFlowchartDeclaration,
        hasNodes,
        hasConnections,
        cached: data.cached,
        mock: data.mock
      }
    };
  } catch (error) {
    return {
      name: testName,
      passed: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function runAllTests() {
  console.log('🧪 Running API Tests...\n');
  console.log('=' .repeat(60));

  // Test 1: Explain Line - TypeScript import (mock)
  results.push(await testExplainLine(1, TEST_CODES.typescript, 'typescript', true));

  // Test 2: Explain Line - TypeScript export function (mock)
  results.push(await testExplainLine(3, TEST_CODES.typescript, 'typescript', true));

  // Test 3: Explain Line - TypeScript async function (mock)
  results.push(await testExplainLine(8, TEST_CODES.typescript, 'typescript', true));

  // Test 4: Explain Line - JavaScript require (mock)
  results.push(await testExplainLine(1, TEST_CODES.javascript, 'javascript', true));

  // Test 5: Explain Line - JavaScript middleware (mock)
  results.push(await testExplainLine(4, TEST_CODES.javascript, 'javascript', true));

  // Test 6: Explain Line - Python import (mock)
  results.push(await testExplainLine(1, TEST_CODES.python, 'python', true));

  // Test 7: Explain Line - Python function def (mock)
  results.push(await testExplainLine(4, TEST_CODES.python, 'python', true));

  // Test 8: Generate Flowchart - TypeScript (mock)
  results.push(await testGenerateFlowchart(TEST_CODES.typescript, 'typescript', true));

  // Test 9: Generate Flowchart - JavaScript (mock)
  results.push(await testGenerateFlowchart(TEST_CODES.javascript, 'javascript', true));

  // Test 10: Generate Flowchart - Python (mock)
  results.push(await testGenerateFlowchart(TEST_CODES.python, 'python', true));

  // Print results
  console.log('\n📊 Test Results:\n');
  
  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    console.log(`   ${result.message}`);
    if (result.data) {
      console.log(`   Data: ${JSON.stringify(result.data, null, 2).split('\n').map((l, i) => i > 0 ? '   ' + l : l).join('\n')}`);
    }
    console.log();
    
    if (result.passed) passed++;
    else failed++;
  }

  console.log('=' .repeat(60));
  console.log(`\n📈 Summary: ${passed}/${results.length} tests passed`);
  
  if (failed > 0) {
    console.log(`\n⚠️  ${failed} test(s) failed`);
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
  }
}

runAllTests().catch(console.error);
