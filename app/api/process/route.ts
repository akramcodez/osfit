import { NextResponse } from 'next/server';
import { analyzeWithAI, AIProvider } from '@/lib/ai-client';
import { fetchGitHubIssue, fetchGitHubFile, usingApifyFallback } from '@/lib/apify-client';
import { MOCK_RESPONSES } from '@/lib/mock-responses';
import { createClient } from '@supabase/supabase-js';
import { getUserApiKeys } from '@/app/api/user/keys/route';

import { getSupabase } from '@/lib/supabase';
import { getGeminiClient } from '@/lib/gemini-client';


const isDevelopment = process.env.NODE_ENV === 'development';
const forceRealAI = process.env.USE_REAL_AI === 'true';


const SYSTEM_LINGO_KEY = process.env.LINGO_API_KEY || '';


interface EffectiveKeys {
  gemini: { key: string | null; source: 'user' | 'none' };
  apify: { key: string | null; source: 'user' | 'none' };
  lingo: { key: string | null; source: 'user' | 'system' | 'none' };
  groq: { key: string | null; source: 'user' | 'none' };
}


function getEffectiveKeys(userKeys: { gemini_key: string | null; apify_key: string | null; lingo_key: string | null; groq_key: string | null }): EffectiveKeys {
  return {
    gemini: {
      key: userKeys.gemini_key || null,
      source: userKeys.gemini_key ? 'user' : 'none'
    },
    apify: {
      key: userKeys.apify_key || null,
      source: userKeys.apify_key ? 'user' : 'none'
    },
    lingo: {
      key: userKeys.lingo_key || SYSTEM_LINGO_KEY || null,
      source: userKeys.lingo_key ? 'user' : (SYSTEM_LINGO_KEY ? 'system' : 'none')
    },
    groq: {
      key: userKeys.groq_key || null,
      source: userKeys.groq_key ? 'user' : 'none'
    }
  };
}


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


function isQuotaError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('quota') || msg.includes('rate limit') || msg.includes('429') || 
           msg.includes('too many requests') || msg.includes('exceeded');
  }
  return false;
}


function userHasKeys(userKeys: { gemini_key: string | null; apify_key: string | null; lingo_key: string | null; groq_key: string | null }): boolean {
  return !!(userKeys.gemini_key || userKeys.apify_key || userKeys.lingo_key || userKeys.groq_key);
}


interface UserKeysWithProvider {
  apify_key: string | null;
  gemini_key: string | null;
  groq_key: string | null;
  ai_provider: 'gemini' | 'groq';
}

async function analyzeWithProvider(
  systemPrompt: string,
  userMessage: string,
  context: string | undefined,
  userKeys: UserKeysWithProvider,
  effectiveKeys: EffectiveKeys,
  targetLanguage: string = 'en'
): Promise<string> {
  const provider: AIProvider = userKeys.ai_provider || 'gemini';
  
  return analyzeWithAI(systemPrompt, userMessage, context, {
    provider,
    geminiKey: effectiveKeys.gemini.key,
    groqKey: effectiveKeys.groq.key,
    targetLanguage,
  });
}


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
    
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    
    const userKeys = await getUserApiKeys(user.id);
    
    
    const effectiveKeys = getEffectiveKeys(userKeys);
    
    
    const hasAIKey = effectiveKeys.gemini.key || effectiveKeys.groq.key;
    
    
    if (!hasAIKey && !isDevelopment) {
      return NextResponse.json({ 
        response: `## Welcome to OSFIT!

To get started, please add your API keys in **Settings**.

---

### Quick Setup

| Step | Action |
| :--- | :--- |
| 1 | Click your **profile avatar** in the sidebar |
| 2 | Add your **Gemini** or **Groq** API key |
| 3 | Add your **Apify** API key for GitHub features |

---

### Get Your Free API Keys

| Service | Link | Notes |
| :--- | :--- | :--- |
| **Gemini** | [ai.google.dev](https://ai.google.dev/) | Free tier available |
| **Groq** | [console.groq.com](https://console.groq.com/) | Free tier available |
| **Apify** | [apify.com](https://apify.com/) | Free tier for GitHub scraping |

---

> Once configured, you can analyze files, solve issues, and chat with AI!`,
        needsApiKey: true 
      });
    }
    
    
    const USE_MOCK_AI = isDevelopment && !forceRealAI && !userHasKeys(userKeys);

    const body = await request.json();
    const { message, mode, language = 'en', conversationHistory = [], sessionId, metadata } = body;

    
    

    
    if (USE_MOCK_AI) {
        
        if (mode === 'mentor' && message.trim() === 'hi===') {
             return NextResponse.json({ response: 'hi===' });
        }
        
        let mockResponse = '';
        let mockFileInfo = null;
        
        if (mode === 'mentor') mockResponse = MOCK_RESPONSES.mentor;
        else if (mode === 'issue_solver') mockResponse = MOCK_RESPONSES.issue_solver;
        else if (mode === 'file_explainer') {
          mockResponse = MOCK_RESPONSES.file_explainer;
          
          mockFileInfo = {
            content: 'console.log("Mock code");',
            language: 'typescript',
            url: 'https://github.com/example/repo/blob/main/src/utils/api-client.ts'
          };
        }
        else mockResponse = "Mock: Mode not recognized.";

        return NextResponse.json({ response: mockResponse, fileInfo: mockFileInfo });
    }

    let response = '';
    let fileInfo: { path?: string; content?: string; language?: string; url?: string } | null = null;

    
    try {
      switch (mode) {
        case 'idle':
          response = await handleIdleMode(message, conversationHistory, effectiveKeys, userKeys, language);
          break;
        case 'issue_solver':
          response = await handleIssueSolver(message, conversationHistory, effectiveKeys, metadata, userKeys, language);
          break;
        case 'file_explainer':
          const fileResult = await handleFileExplainer(message, conversationHistory, effectiveKeys, userKeys, language);
          response = fileResult.response;
          fileInfo = fileResult.fileInfo;
          break;
        case 'mentor':
          response = await handleMentor(message, conversationHistory, effectiveKeys, userKeys, language);
          break;
        default:
          response = 'Mode not recognized. Please select a valid mode.';
      }
    } catch (modeError) {
      
      if (isQuotaError(modeError)) {
        throw new ApiKeyError('gemini', effectiveKeys.gemini.source as 'user' | 'system', 
          modeError instanceof Error ? modeError.message : 'API quota exceeded');
      }
      throw modeError;
    }

    
    

    return NextResponse.json({ 
      response, 
      fileInfo,
      apifyWarning: (mode === 'issue_solver' || mode === 'file_explainer') && !userKeys.apify_key ? { show: true } : undefined
    });
  } catch (error: unknown) {
    console.error('Process error:', error);
    
    
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

async function handleIdleMode(message: string, history: unknown[], effectiveKeys: EffectiveKeys, userKeys: UserKeysWithProvider, targetLanguage: string = 'en'): Promise<string> {
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

  return await analyzeWithProvider(systemPrompt, message, formatHistory(history), userKeys, effectiveKeys, targetLanguage);
}

async function handleIssueSolver(
  message: string,
  history: unknown[],
  effectiveKeys: EffectiveKeys,
  metadata?: { currentStep?: string; issueData?: Record<string, unknown> },
  userKeys?: UserKeysWithProvider,
  targetLanguage: string = 'en'
): Promise<string> {
  const currentStep = metadata?.currentStep || 'issue_input';
  const issueData = metadata?.issueData || {};

  
  const issueUrlMatch = message.match(/github\.com\/[^\/]+\/[^\/]+\/issues\/\d+/);

  if (issueUrlMatch || currentStep === 'issue_input') {
    if (issueUrlMatch) {
      let issueUrl = issueUrlMatch[0];
      if (!issueUrl.startsWith('http')) {
        issueUrl = 'https://' + issueUrl;
      }

      try {
        
        const issue = await fetchGitHubIssue(issueUrl, userKeys?.apify_key);

        
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

        const explanation = await analyzeWithProvider(explanationPrompt, 'Analyze this issue', context, userKeys!, effectiveKeys, targetLanguage);

        
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

    
    return `Share a GitHub issue URL to get started!

**Example:** https://github.com/owner/repo/issues/123

I'll analyze it and help you create a solution.`;
  }

  
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

    const solutionPlan = await analyzeWithProvider(solutionPrompt, 'Create solution plan', context, userKeys!, effectiveKeys, targetLanguage);

    return JSON.stringify({
      type: 'solution_plan',
      solutionPlan,
      nextStep: 'awaiting_diff'
    });
  }

  
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

Closes #[issue_number]`;

    const context = `
Issue: ${issueData.issueTitle || 'Unknown'}
Issue Number: ${issueData.issueNumber || '?'}
Solution Plan: ${issueData.solutionPlan || 'N/A'}

Git Diff:
\`\`\`diff
${message.substring(0, 3000)}
\`\`\``;

    const prContent = await analyzeWithProvider(prPrompt, 'Generate PR', context, userKeys!, effectiveKeys, targetLanguage);

    return JSON.stringify({
      type: 'pr_generated',
      prContent,
      nextStep: 'completed'
    });
  }

  
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
  userKeys: UserKeysWithProvider,
  targetLanguage: string = 'en'
): Promise<FileExplainerResult> {
  
  const fileUrlMatch = message.match(/github\.com\/[^\/]+\/[^\/]+\/blob\/[^\s]+/);

    if (fileUrlMatch) {
      let fileUrl = fileUrlMatch[0];
      if (!fileUrl.startsWith('http')) {
        fileUrl = 'https://' + fileUrl;
      }

    try {
      
      const file = await fetchGitHubFile(fileUrl);

      
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

      const explanation = await analyzeWithProvider(systemPrompt, message, context, userKeys, effectiveKeys, targetLanguage);
      
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
  userKeys: UserKeysWithProvider,
  targetLanguage: string = 'en'
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

  return await analyzeWithProvider(systemPrompt, message, formatHistory(history), userKeys, effectiveKeys, targetLanguage);
}

function formatHistory(history: unknown[]): string {
  if (!history || history.length === 0) return '';
  
  return (history as Array<{role: string; content: string}>)
    .slice(-5)
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');
}
