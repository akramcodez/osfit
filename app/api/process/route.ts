import { NextResponse } from 'next/server';
import { analyzeWithContext } from '@/lib/gemini-client';
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

// Type for tracking which keys are being used and their source
interface EffectiveKeys {
  gemini: { key: string | null; source: 'user' | 'system' | 'none' };
  apify: { key: string | null; source: 'user' | 'system' | 'none' };
  lingo: { key: string | null; source: 'user' | 'system' | 'none' };
}

/**
 * Get effective keys with priority: user keys > system keys
 * Returns which key is being used and its source for proper error handling
 */
function getEffectiveKeys(userKeys: { gemini_key: string | null; apify_key: string | null; lingo_key: string | null }): EffectiveKeys {
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
function userHasKeys(userKeys: { gemini_key: string | null; apify_key: string | null; lingo_key: string | null }): boolean {
  return !!(userKeys.gemini_key || userKeys.apify_key || userKeys.lingo_key);
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
    const { message, mode, language = 'en', conversationHistory = [], sessionId } = body;

    // --- SMART TITLE GENERATION START ---
    if (sessionId) {
      console.log('[TITLE DEBUG] sessionId received:', sessionId);
      const supabase = getSupabase();
      // Check if session has a title
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('title')
        .eq('id', sessionId) 
        .single();
      
      console.log('[TITLE DEBUG] Session lookup result:', { session, error: sessionError?.message });
      
      // If no title, generate one
      if (session && !session.title) {
        console.log('[TITLE DEBUG] Generating title...');
        let title = '';
        
        if (USE_MOCK_AI) {
           // Mock Title
           title = message.length > 20 ? message.slice(0, 20) + '...' : message;
        } else {
           // Real AI Title Generation - use effective key
           try {
               const client = getGeminiClient(effectiveKeys.gemini.key);
               const model = client.getGenerativeModel({ model: "gemini-pro" });
               const titlePrompt = `Generate a very short chat title (max 4 words) for this initial message: "${message}". No quotes.`;
               const result = await model.generateContent(titlePrompt);
               title = result.response.text().trim().replace(/^["']|["']$/g, '');
               console.log('[TITLE DEBUG] Gemini generated title:', title);
           } catch (e) {
               console.error('[TITLE DEBUG] Title gen failed:', e);
               title = message.slice(0, 20) + '...';
           }
        }
        
        if (title) {
           console.log('[TITLE DEBUG] Saving title to DB...');
           const { error: updateError } = await supabase
            .from('chat_sessions')
            .update({ title: title })
            .eq('id', sessionId);
           
           if (updateError) {
               console.error('[TITLE DEBUG] DB update failed:', updateError);
           } else {
               console.log('[TITLE DEBUG] Title saved successfully!');
           }
        }
      } else {
        console.log('[TITLE DEBUG] Session already has title or not found');
      }
    } else {
      console.log('[TITLE DEBUG] No sessionId provided');
    }
    // --- SMART TITLE GENERATION END ---

    // Return mock response if enabled
    if (USE_MOCK_AI) {
        // specific check for hi=== request for mentor
        if (mode === 'mentor' && message.trim() === 'hi===') {
             return NextResponse.json({ response: 'hi===' });
        }
        
        let mockResponse = '';
        if (mode === 'mentor') mockResponse = MOCK_RESPONSES.mentor;
        else if (mode === 'issue_solver') mockResponse = MOCK_RESPONSES.issue_solver;
        else if (mode === 'file_explainer') mockResponse = MOCK_RESPONSES.file_explainer;
        else mockResponse = "Mock: Mode not recognized.";

        return NextResponse.json({ response: mockResponse });
    }

    let response = '';

    // Pass effective keys to handlers for proper key usage
    try {
      switch (mode) {
        case 'idle':
          response = await handleIdleMode(message, conversationHistory, effectiveKeys);
          break;
        case 'issue_solver':
          response = await handleIssueSolver(message, conversationHistory, effectiveKeys);
          break;
        case 'file_explainer':
          response = await handleFileExplainer(message, conversationHistory, effectiveKeys);
          break;
        case 'mentor':
          response = await handleMentor(message, conversationHistory, effectiveKeys);
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

    return NextResponse.json({ response });
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

async function handleIdleMode(message: string, history: unknown[], effectiveKeys: EffectiveKeys): Promise<string> {
  const systemPrompt = `You are OSFIT, a helpful multilingual assistant for open-source contributors. 
You help developers understand GitHub issues, explain code files, and provide mentorship.

Current mode: General Chat

Respond naturally and helpfully. If the user mentions a GitHub URL, suggest switching to the appropriate mode.`;

  return await analyzeWithContext(systemPrompt, message, formatHistory(history), effectiveKeys.gemini.key);
}

async function handleIssueSolver(
  message: string,
  history: unknown[],
  effectiveKeys: EffectiveKeys
): Promise<string> {
  // Check if message contains a GitHub issue URL
  const issueUrlMatch = message.match(/github\.com\/[^\/]+\/[^\/]+\/issues\/\d+/);

  if (issueUrlMatch) {
    let issueUrl = issueUrlMatch[0];
    if (!issueUrl.startsWith('http')) {
      issueUrl = 'https://' + issueUrl;
    }

    try {
      // Fetch the issue
      const issue = await fetchGitHubIssue(issueUrl);

      // Check what user is asking for
      const askingForSolution = message.toLowerCase().includes('solution') || 
                                message.toLowerCase().includes('how to solve') ||
                                message.toLowerCase().includes('approach') ||
                                message.toLowerCase().includes('fix');

      const askingForPR = message.toLowerCase().includes('pull request') || 
                          message.toLowerCase().includes('pr ') ||
                          message.toLowerCase().includes('commit message') ||
                          message.toLowerCase().includes('branch');

      let systemPrompt: string;
      
      if (askingForPR) {
        systemPrompt = `You are helping a developer prepare a pull request for this GitHub issue.

Generate:
1. **Branch Name**: Follow git-flow conventions (feature/, bugfix/, etc.)
2. **Commit Message**: Clear, conventional commit format
3. **PR Title**: Descriptive and professional
4. **PR Description Template**: Include problem, solution, testing

Be specific and ready-to-use.`;
      } else if (askingForSolution) {
        systemPrompt = `You are OSFIT's Issue Solver mode.
Provide a detailed solution approach including:
1. High-level strategy
2. Key files to modify (if identifiable)
3. Suggested implementation steps
4. Potential edge cases to consider

Be practical and specific.`;
      } else {
        systemPrompt = `You are OSFIT's Issue Solver mode. 
Analyze the GitHub issue and provide:
1. A clear summary of the problem
2. Key technical details
3. What the issue is asking for
4. Suggested approach to solve it

Be concise and focus on helping the developer understand and solve the issue.`;
      }

      const context = `
GitHub Issue: ${issue.title}
Issue Number: #${issue.number}
URL: ${issue.url}
State: ${issue.state}
Labels: ${issue.labels.join(', ') || 'None'}

Description:
${issue.body || 'No description provided'}

${issue.comments && issue.comments.length > 0 ? `Recent Comments (${issue.comments.length}):
${issue.comments.slice(0, 3).map(c => `- ${c.author}: ${c.body.substring(0, 300)}...`).join('\n\n')}` : ''}
`;

      const analysis = await analyzeWithContext(systemPrompt, message, context, effectiveKeys.gemini.key);
      
      if (!askingForSolution && !askingForPR) {
        return `${analysis}

---
💡 **Need more help?** Ask me to:
- Generate a **solution approach**
- Create a **PR template** (branch name, commit message, description)`;
      }

      return analysis;
    } catch (error) {
      console.error('Issue fetch error:', error);
      return `I found the URL but had trouble fetching the issue details. The issue is at: ${issueUrl}\n\nPlease make sure the repository is public and the issue exists.`;
    }
  }

  // If no URL, guide the user
  return `I'm in Issue Solver mode! Share a GitHub issue URL and I'll help you:

1. **Understand the issue** - Summary and technical details
2. **Plan the solution** - Step-by-step approach
3. **Prepare your PR** - Branch name, commit message, description

**Example:** https://github.com/owner/repo/issues/123`;
}

async function handleFileExplainer(
  message: string,
  history: unknown[],
  effectiveKeys: EffectiveKeys
): Promise<string> {
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
      const systemPrompt = `You are OSFIT's File Explainer mode.
Analyze this code file and provide:
1. Purpose of the file
2. Key components/functions
3. Main logic flow
4. Important patterns or design choices

Keep explanations clear and educational.`;

      const context = `
File: ${file.path}
Language: ${file.language}
URL: ${file.url}

Code Content:
\`\`\`${file.language}
${file.content.substring(0, 4000)}${file.content.length > 4000 ? '\n... (truncated)' : ''}
\`\`\`
`;

      return await analyzeWithContext(systemPrompt, message, context, effectiveKeys.gemini.key);
    } catch (error) {
      console.error('File fetch error:', error);
      return `I found the URL but had trouble fetching the file. Please make sure the repository is public and the file exists.`;
    }
  }

  // If no URL, guide the user
  return `I'm in File Explainer mode! Share a GitHub file URL and I'll explain:

1. **Purpose** - What the file does
2. **Components** - Key functions and classes
3. **Logic flow** - How it works
4. **Patterns** - Design choices made

**Example:** https://github.com/owner/repo/blob/main/src/file.js`;
}

async function handleMentor(
  message: string,
  history: unknown[],
  effectiveKeys: EffectiveKeys
): Promise<string> {
  const systemPrompt = `You are OSFIT's Open Source Mentor mode.
You provide guidance on:
- How to find good first issues
- How to approach maintainers
- Best practices for pull requests
- Open-source contribution etiquette
- Git workflows and collaboration

Be encouraging, practical, and specific. Share actionable advice.`;

  return await analyzeWithContext(systemPrompt, message, formatHistory(history), effectiveKeys.gemini.key);
}

function formatHistory(history: unknown[]): string {
  if (!history || history.length === 0) return '';
  
  return (history as Array<{role: string; content: string}>)
    .slice(-5)
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');
}
