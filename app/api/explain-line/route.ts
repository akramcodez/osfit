import { NextResponse } from 'next/server';
import { analyzeWithContext } from '@/lib/gemini-client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lineNumber, lineContent, fullFileContent, language, filePath, useMockData } = body;

    if (!lineNumber || !fullFileContent) {
      return NextResponse.json(
        { error: 'Missing required fields: lineNumber and fullFileContent' },
        { status: 400 }
      );
    }

    // Force mock mode if requested or if API key is missing/empty
    const useMock = useMockData === true || !process.env.GEMINI_API_KEY?.trim();
    
    console.log('[explain-line] useMock:', useMock, 'lineNumber:', lineNumber);
    
    if (useMock) {
      // Mock response for development - return immediately
      const explanation = `**Line ${lineNumber}: \`${(lineContent || '').trim()}\`**

This line ${getLineExplanation(lineContent || '', lineNumber)}.

### Context
This is part of the surrounding code block that ${getContextExplanation(language)}.

> 💡 **Tip:** ${getTip(language)}`;
      
      return NextResponse.json({ 
        explanation,
        lineNumber,
        mock: true
      });
    }

    // Get context lines (5 before and after)
    const lines = fullFileContent.split('\n');
    const startLine = Math.max(0, lineNumber - 6);
    const endLine = Math.min(lines.length - 1, lineNumber + 5);
    const contextLines = lines.slice(startLine, endLine + 1);
    const contextWithLineNumbers = contextLines
      .map((line: string, idx: number) => {
        const num = startLine + idx + 1;
        const marker = num === lineNumber ? '>>> ' : '    ';
        return `${marker}${num}: ${line}`;
      })
      .join('\n');

    // Build the prompt
    const systemPrompt = `You are a code explanation expert. Explain the specific line of code marked with ">>>" in context.

RULES:
1. Focus on what THIS specific line does
2. Explain its purpose in the context of surrounding code
3. If it's part of a larger construct (function, class, loop), explain its role
4. Keep explanations concise but clear (2-4 sentences max)
5. Use markdown formatting

FILE: ${filePath || 'unknown'}
LANGUAGE: ${language || 'unknown'}`;

    const userMessage = `Explain line ${lineNumber}:\n\n\`\`\`${language || 'code'}\n${contextWithLineNumbers}\n\`\`\``;

    const explanation = await analyzeWithContext(systemPrompt, userMessage);

    return NextResponse.json({ 
      explanation,
      lineNumber,
      context: {
        start: startLine + 1,
        end: endLine + 1
      }
    });
  } catch (error) {
    console.error('Line explanation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate explanation' },
      { status: 500 }
    );
  }
}

// Helper functions for mock responses
function getLineExplanation(line: string, num: number): string {
  if (line.includes('import')) return 'imports a module or library dependency';
  if (line.includes('export')) return 'exports this item for use in other files';
  if (line.includes('const ') || line.includes('let ') || line.includes('var ')) return 'declares a variable to store a value';
  if (line.includes('function') || line.includes('=>')) return 'defines a function that can be called later';
  if (line.includes('if') || line.includes('else')) return 'adds conditional logic to control flow';
  if (line.includes('return')) return 'returns a value from the function';
  if (line.includes('await')) return 'waits for an async operation to complete';
  if (line.includes('try') || line.includes('catch')) return 'handles potential errors safely';
  return 'is part of the program logic';
}

function getContextExplanation(lang: string): string {
  if (lang === 'typescript' || lang === 'ts') return 'provides type-safe code execution';
  if (lang === 'javascript' || lang === 'js') return 'handles dynamic functionality';
  if (lang === 'python' || lang === 'py') return 'processes data and logic';
  return 'implements the core functionality';
}

function getTip(lang: string): string {
  if (lang === 'typescript' || lang === 'ts') return 'TypeScript adds compile-time type checking for safer code.';
  if (lang === 'javascript' || lang === 'js') return 'Use modern ES6+ features for cleaner code.';
  if (lang === 'python' || lang === 'py') return 'Follow PEP8 style guidelines for consistent code.';
  return 'Read the surrounding code to understand the full context.';
}
