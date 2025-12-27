import { NextResponse } from 'next/server';
import { analyzeWithContext } from '@/lib/gemini-client';
import { analyzeWithAI, AIProvider } from '@/lib/ai-client';
import { translateText } from '@/lib/lingo-client';
import { fetchGitHubIssue, fetchGitHubFile } from '@/lib/apify-client';
import { MOCK_RESPONSES } from '@/lib/mock-responses';
import { createClient } from '@supabase/supabase-js';
import { getUserApiKeys } from '@/app/api/user/keys/route';

import { getSupabase } from '@/lib/supabase';
import { geminiClient, getGeminiClient } from '@/lib/gemini-client';

// Helper to determine if we should use mock data
// In development: use mocks by default UNLESS user has configured their own keys
// In production: always use real AI
const isDevelopment = process.env.NODE_ENV === 'development';
const forceRealAI = process.env.USE_REAL_AI === 'true';

// System API keys from environment
const SYSTEM_GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const SYSTEM_APIFY_KEY = process.env.APIFY_API_KEY || '';
const SYSTEM_LINGO_KEY = process.env.LINGO_API_KEY || '';
const SYSTEM_GROQ_KEY = process.env.GROQ_API_KEY || '';

// Type for tracking which keys are being used and their source
interface EffectiveKeys {
  gemini: { key: string | null; source: 'user' | 'system' | 'none' };
  apify: { key: string | null; source: 'user' | 'system' | 'none' };
  lingo: { key: string | null; source: 'user' | 'system' | 'none' };
  groq: { key: string | null; source: 'user' | 'system' | 'none' };
}

/**
 * Get effective keys with priority: user keys > system keys
 * Returns which key is being used and its source for proper error handling
 */
function getEffectiveKeys(userKeys: { gemini_key: string | null; apify_key: string | null; lingo_key: string | null; groq_key: string | null }): EffectiveKeys {
  return {
    gemini: {
      key: userKeys.gemini_key || SYSTEM_GEMINI_KEY || null,
      source: userKeys.gemini_key ? 'user' : (SYSTEM_GEMINI_KEY ? 'system' : 'none')
    },
    apify: {
      key: userKeys.apify_key || SYSTEM_APIFY_KEY || null,
      source: userKeys.apify_key ? 'user' : (SYSTEM_APIFY_KEY ? 'system' : 'none')
    },
    lingo: {
      key: userKeys.lingo_key || SYSTEM_LINGO_KEY || null,
      source: userKeys.lingo_key ? 'user' : (SYSTEM_LINGO_KEY ? 'system' : 'none')
    },
    groq: {
      key: userKeys.groq_key || SYSTEM_GROQ_KEY || null,
      source: userKeys.groq_key ? 'user' : (SYSTEM_GROQ_KEY ? 'system' : 'none')
    }
  };
}

// Custom error class for API key failures
class ApiKeyError extends Error {
  service: 'gemini' | 'apify' | 'lingo';
  source: 'user' | 'system';
  
  constructor(service: 'gemini' | 'apify' | 'lingo', source: 'user' | 'system', originalMessage: string) {
    super(originalMessage);
    this.name = 'ApiKeyError';
    this.service = service;
    this.source = source;
  }
}

// Helper to check if error is a quota/rate limit error
function isQuotaError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('quota') || msg.includes('rate limit') || msg.includes('429') || 
           msg.includes('too many requests') || msg.includes('exceeded');
  }
  return false;
}

// Helper to check if user has any keys configured
function userHasKeys(userKeys: { gemini_key: string | null; apify_key: string | null; lingo_key: string | null; groq_key: string | null }): boolean {
  return !!(userKeys.gemini_key || userKeys.apify_key || userKeys.lingo_key || userKeys.groq_key);
}

// Helper to route AI calls to the correct provider based on user preference
interface UserKeysWithProvider {
  gemini_key: string | null;
  groq_key: string | null;
  ai_provider: 'gemini' | 'groq';
}

async function analyzeWithProvider(
  systemPrompt: string,
  userMessage: string,
  context: string | undefined,
  userKeys: UserKeysWithProvider,
  effectiveKeys: EffectiveKeys
): Promise<string> {
  const provider: AIProvider = userKeys.ai_provider || 'gemini';
  
  return analyzeWithAI(systemPrompt, userMessage, context, {
    provider,
    geminiKey: effectiveKeys.gemini.key,
    groqKey: effectiveKeys.groq.key,
  });
}

// Helper to get user from auth header
async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  
  return user;
}

export async function POST(request: Request) {
  try {
    // Check auth
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's API keys (will use these if available, else system keys)
    const userKeys = await getUserApiKeys(user.id);
    
    // Get effective keys with priority: user > system
    const effectiveKeys = getEffectiveKeys(userKeys);
    
    // Determine if we should use mock AI
    // In dev: use mocks UNLESS user has their own keys configured OR USE_REAL_AI is set
    const USE_MOCK_AI = isDevelopment && !forceRealAI && !userHasKeys(userKeys);

    const body = await request.json();
    const { message, mode, language = 'en', conversationHistory = [], sessionId, metadata } = body;

    // Title is now generated when session is created (in ChatInterface.tsx)
    // No need to generate it here anymore

    // Return mock response if enabled
    if (USE_MOCK_AI) {
        // specific check for hi=== request for mentor
        if (mode === 'mentor' && message.trim() === 'hi===') {
             return NextResponse.json({ response: 'hi===' });
        }
        
        let mockResponse = '';
        let mockFileInfo = null;
        
        if (mode === 'mentor') mockResponse = MOCK_RESPONSES.mentor;
        else if (mode === 'issue_solver') mockResponse = MOCK_RESPONSES.issue_solver;
        else if (mode === 'file_explainer') {
          mockResponse = MOCK_RESPONSES.file_explainer;
          // Provide mock file info for file explainer mode
          mockFileInfo = {
            path: 'src/utils/api-client.ts',
            content: `// Mock API Client\nimport axios from 'axios';\n\nexport const apiClient = axios.create({\n  baseURL: '/api',\n  timeout: 10000,\n});\n\nexport async function fetchData(endpoint: string) {\n  const response = await apiClient.get(endpoint);\n  return response.data;\n}`,
            language: 'typescript',
            url: 'https://github.com/example/repo/blob/main/src/utils/api-client.ts'
          };
        }
        else mockResponse = "Mock: Mode not recognized.";

        return NextResponse.json({ response: mockResponse, fileInfo: mockFileInfo });
    }

    let response = '';
    let fileInfo: { path?: string; content?: string; language?: string; url?: string } | null = null;

    // Pass effective keys to handlers for proper key usage
    try {
      switch (mode) {
        case 'idle':
          response = await handleIdleMode(message, conversationHistory, effectiveKeys, userKeys);
          break;
        case 'issue_solver':
          response = await handleIssueSolver(message, conversationHistory, effectiveKeys, metadata, userKeys);
          break;
        case 'file_explainer':
          const fileResult = await handleFileExplainer(message, conversationHistory, effectiveKeys, userKeys);
          response = fileResult.response;
          fileInfo = fileResult.fileInfo;
          break;
        case 'mentor':
          response = await handleMentor(message, conversationHistory, effectiveKeys, userKeys);
          break;
        default:
          response = 'Mode not recognized. Please select a valid mode.';
      }
    } catch (modeError) {
      // Check if this is a Gemini API error and wrap it with source info
      if (isQuotaError(modeError)) {
        throw new ApiKeyError('gemini', effectiveKeys.gemini.source as 'user' | 'system', 
          modeError instanceof Error ? modeError.message : 'API quota exceeded');
      }
      throw modeError;
    }

    // Translate response if needed
    if (language !== 'en') {
      try {
        response = await translateText({
          text: response,
          targetLanguage: language,
          sourceLanguage: 'en'
        });
      } catch (translateError) {
        // Check if this is a Lingo API error
        if (isQuotaError(translateError)) {
          throw new ApiKeyError('lingo', effectiveKeys.lingo.source as 'user' | 'system',
            translateError instanceof Error ? translateError.message : 'Translation API quota exceeded');
        }
        // If translation fails, just return English response
        console.error('Translation failed, returning English:', translateError);
      }
    }

    return NextResponse.json({ response, fileInfo });
  } catch (error: unknown) {
    console.error('Process error:', error);
    
    // Handle ApiKeyError with specific error info
    if (error instanceof ApiKeyError) {
      return NextResponse.json({
        error: error.message,
        errorType: 'api_key_error',
        service: error.service,
        source: error.source
      }, { status: 500 });
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Processing failed';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

async function handleIdleMode(message: string, history: unknown[], effectiveKeys: EffectiveKeys, userKeys: UserKeysWithProvider): Promise<string> {
  const systemPrompt = `You are OSFIT, an AI assistant for open source developers.

Rules:
- Be concise and to the point
- No emojis ever
- Short, clear explanations
- Skip unnecessary pleasantries

MARKDOWN FORMAT (REQUIRED):
- Use ## for main headings (when needed)
- Use **bold** for key terms
- Use \`code\` for commands, file names, technical terms
- Use numbered lists (1. 2. 3.) for steps
- Use bullet lists (- item) for options/features
- Use \`\`\`language for code blocks with language specified
- Use > for tips or important notes

Current mode: General Chat
- Answer open source questions directly
- If user shares a GitHub issue URL, suggest Issue Solver mode
- If user shares a file URL, suggest File Explainer mode
- Keep responses focused and actionable`;

  return await analyzeWithProvider(systemPrompt, message, formatHistory(history), userKeys, effectiveKeys);
}

async function handleIssueSolver(
  message: string,
  history: unknown[],
  effectiveKeys: EffectiveKeys,
  metadata?: { currentStep?: string; issueData?: Record<string, unknown> },
  userKeys?: UserKeysWithProvider
): Promise<string> {
  const currentStep = metadata?.currentStep || 'issue_input';
  const issueData = metadata?.issueData || {};

  // Step 1: Check for GitHub issue URL (initial input)
  const issueUrlMatch = message.match(/github\.com\/[^\/]+\/[^\/]+\/issues\/\d+/);

  if (issueUrlMatch || currentStep === 'issue_input') {
    if (issueUrlMatch) {
      let issueUrl = issueUrlMatch[0];
      if (!issueUrl.startsWith('http')) {
        issueUrl = 'https://' + issueUrl;
      }

      try {
        // Fetch the issue
        const issue = await fetchGitHubIssue(issueUrl);

        // Generate short explanation (Step 2)
        const explanationPrompt = `You are OSFIT Issue Solver. Give a SHORT, DIRECT explanation of this issue.

RULES:
1. Maximum 80 words
2. Be direct - no fluff
3. Format as markdown

FORMAT:
**Problem:** [1-2 sentences]
**What to do:** [1 sentence]
**Difficulty:** [Easy/Medium/Hard]`;

        const context = `
Issue: ${issue.title}
#${issue.number}

${issue.body || 'No description'}

Labels: ${issue.labels.join(', ') || 'None'}`;

        const explanation = await analyzeWithProvider(explanationPrompt, 'Analyze this issue', context, userKeys!, effectiveKeys);

        // Return explanation with metadata for frontend to track step
        return JSON.stringify({
          type: 'issue_explanation',
          issueUrl,
          issueTitle: issue.title,
          issueNumber: issue.number,
          issueBody: issue.body,
          issueLabels: issue.labels,
          explanation,
          nextStep: 'awaiting_plan'
        });
      } catch (error) {
        console.error('Issue fetch error:', error);
        return `I found the URL but had trouble fetching the issue. Make sure the repository is public.`;
      }
    }

    // No URL provided - guide user
    return `Share a GitHub issue URL to get started!

**Example:** https://github.com/owner/repo/issues/123

I'll analyze it and help you create a solution.`;
  }

  // Step 3→4: User wants solution plan
  if (currentStep === 'awaiting_plan' || message.toLowerCase().includes('solution') || message.toLowerCase().includes('plan')) {
    const solutionPrompt = `You are OSFIT Issue Solver. Create a step-by-step solution plan.

RULES:
1. Be specific and actionable
2. Number each step
3. Include file paths when possible
4. Keep it practical

FORMAT:
### Solution Plan

1. **Step 1:** [action]
2. **Step 2:** [action]
3. **Step 3:** [action]

### Files to Modify
- \`file.ts\` - what to change`;

    const context = `
Issue: ${issueData.issueTitle || 'Unknown'}
Previous analysis: ${issueData.explanation || message}`;

    const solutionPlan = await analyzeWithProvider(solutionPrompt, 'Create solution plan', context, userKeys!, effectiveKeys);

    return JSON.stringify({
      type: 'solution_plan',
      solutionPlan,
      nextStep: 'awaiting_diff'
    });
  }

  // Step 5→6: User submitted git diff - generate PR
  if (currentStep === 'awaiting_diff' || message.includes('diff --git') || message.includes('@@')) {
    const prPrompt = `You are OSFIT Issue Solver. Generate a professional Pull Request.

RULES:
1. Clear conventional title (fix:, feat:, refactor:)
2. Concise description
3. List file changes

FORMAT:
## PR Title
\`fix: description\`

## Description
[2-3 sentences]

## Solution
[brief technical summary]

## Changes
- \`file1.ts\`: what changed
- \`file2.ts\`: what changed

## Closes
#[issue_number]`;

    const context = `
Issue: ${issueData.issueTitle || 'Unknown'}
Issue Number: ${issueData.issueNumber || '?'}
Solution Plan: ${issueData.solutionPlan || 'N/A'}

Git Diff:
\`\`\`diff
${message.substring(0, 3000)}
\`\`\``;

    const prContent = await analyzeWithProvider(prPrompt, 'Generate PR', context, userKeys!, effectiveKeys);

    return JSON.stringify({
      type: 'pr_generated',
      prContent,
      nextStep: 'completed'
    });
  }

  // Default: guide user
  return `I'm in Issue Solver mode! Share a GitHub issue URL and I'll help you:

1. **Understand the issue** - Quick summary
2. **Plan the solution** - Step-by-step approach  
3. **Generate PR** - Title, description, and changes

**Example:** https://github.com/owner/repo/issues/123`;
}

interface FileExplainerResult {
  response: string;
  fileInfo: { path?: string; content?: string; language?: string; url?: string } | null;
}

async function handleFileExplainer(
  message: string,
  history: unknown[],
  effectiveKeys: EffectiveKeys,
  userKeys: UserKeysWithProvider
): Promise<FileExplainerResult> {
  // Check if message contains a GitHub file URL
  const fileUrlMatch = message.match(/github\.com\/[^\/]+\/[^\/]+\/blob\/[^\s]+/);

  if (fileUrlMatch) {
    let fileUrl = fileUrlMatch[0];
    if (!fileUrl.startsWith('http')) {
      fileUrl = 'https://' + fileUrl;
    }

    try {
      // Fetch the file
      const file = await fetchGitHubFile(fileUrl);

      // Analyze with Gemini
      const systemPrompt = `You are OSFIT File Explainer.

Rules:
- Be concise, no emojis
- Clear, educational explanations

MARKDOWN FORMAT (REQUIRED):
- Use ## for section headings
- Use **bold** for function/class names
- Use \`code\` for variables, parameters, file paths
- Use \`\`\`language for code snippets (always specify language)
- Use numbered lists for steps/flow
- Use bullet lists for features/items
- Use > for important notes

STRUCTURE (follow exactly):
## File Purpose
[1-2 sentence overview]

## Key Functions/Components
- **functionName()** - description
- **ClassName** - description

## Logic Flow
1. First step
2. Second step

## Dependencies
- \`import\` - what it imports
- \`export\` - what it exports`;

      const context = `
File: ${file.path}
Language: ${file.language}
URL: ${file.url}

Code Content:
\`\`\`${file.language}
${file.content.substring(0, 4000)}${file.content.length > 4000 ? '\n... (truncated)' : ''}
\`\`\`
`;

      const explanation = await analyzeWithProvider(systemPrompt, message, context, userKeys, effectiveKeys);
      
      return {
        response: explanation,
        fileInfo: {
          path: file.path,
          content: file.content,
          language: file.language,
          url: file.url
        }
      };
    } catch (error) {
      console.error('File fetch error:', error);
      return {
        response: `I found the URL but had trouble fetching the file. Please make sure the repository is public and the file exists.`,
        fileInfo: null
      };
    }
  }

  // If no URL, guide the user
  return {
    response: `I'm in File Explainer mode! Share a GitHub file URL and I'll explain:

1. **Purpose** - What the file does
2. **Components** - Key functions and classes
3. **Logic flow** - How it works
4. **Patterns** - Design choices made

**Example:** https://github.com/owner/repo/blob/main/src/file.js`,
    fileInfo: null
  };
}

async function handleMentor(
  message: string,
  history: unknown[],
  effectiveKeys: EffectiveKeys,
  userKeys: UserKeysWithProvider
): Promise<string> {
  const systemPrompt = `You are OSFIT Open Source Mentor.

Rules:
- Be concise, no emojis
- Give practical, actionable advice
- Short answers, simple language

MARKDOWN FORMAT (REQUIRED):
- Use ## for main headings
- Use ### for sub-headings
- Use **bold** for key terms
- Use \`code\` for commands, file names, technical terms
- Use numbered lists (1. 2. 3.) for steps
- Use bullet lists (- item) for options
- Use \`\`\`language for code blocks with language specified
- Use > for important notes or tips
- Use --- for section breaks when needed

=== OPEN SOURCE KNOWLEDGE BASE ===

WHY CONTRIBUTE:
- Improve software you use (fix bugs you encounter)
- Practice skills (coding, design, writing, organizing)
- Meet like-minded people and build community
- Find mentors and teach others
- Build public portfolio for career growth
- Learn leadership and collaboration

WAYS TO CONTRIBUTE (not just code):
- Documentation: README, tutorials, translations
- Design: UI/UX improvements, logos, style guides
- Community: answer questions, organize events
- Learn from real production code
- Build real portfolio
- Network with professionals
- Give back to tools you use
- Some companies sponsor contributors

HOW TO START:
1. Pick a project you use and like
2. Read CONTRIBUTING.md
3. Look for "good first issue" labels
4. Start small (docs, typos, tests)
5. Understand the codebase first
6. Ask questions in discussions/issues

BEST PRACTICES:
- Read all relevant documentation
- Follow code style and conventions
- Write clear commit messages
- One change per pull request
- Test your changes locally
- Be responsive to feedback

COMMUNICATION:
- Be respectful and professional
- Give context (what you tried, what happened)
- Do homework first (search docs, issues, Stack Overflow)
- Keep requests short and direct
- Keep communication public (not private DMs)
- Be patient when asking questions

=== END KNOWLEDGE BASE ===

Answer user questions using this knowledge. Be direct and helpful.`;

  return await analyzeWithProvider(systemPrompt, message, formatHistory(history), userKeys, effectiveKeys);
}

function formatHistory(history: unknown[]): string {
  if (!history || history.length === 0) return '';
  
  return (history as Array<{role: string; content: string}>)
    .slice(-5)
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');
}
