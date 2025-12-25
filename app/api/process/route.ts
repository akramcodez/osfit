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
  const systemPrompt = `You are OSFIT, an AI assistant for open source developers.

Rules:
- Be concise and to the point
- No emojis ever
- Short, clear explanations
- Use markdown for structure (headers, lists, code blocks)
- Skip unnecessary pleasantries

Current mode: General Chat
- Answer open source questions directly
- If user shares a GitHub issue URL, suggest Issue Solver mode
- If user shares a file URL, suggest File Explainer mode
- Keep responses focused and actionable`;

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
        systemPrompt = `You are OSFIT Issue Solver - PR Mode.

Rules:
- Be concise, no emojis
- Provide copy-paste ready content

Generate:
1. Branch Name (feature/, bugfix/ convention)
2. Commit Message (conventional format)
3. PR Title
4. PR Description with: Problem, Solution, Testing sections`;
      } else if (askingForSolution) {
        systemPrompt = `You are OSFIT Issue Solver - Solution Mode.

Rules:
- Be concise, no emojis
- Focus on actionable steps

Provide:
1. Problem summary (1-2 sentences)
2. Implementation steps (numbered)
3. Files to modify
4. Edge cases to consider`;
      } else {
        systemPrompt = `You are OSFIT Issue Solver - Analysis Mode.

Rules:
- Be concise, no emojis
- Clear, simple language

Provide:
1. Issue Summary (what is the problem?)
2. Technical Details (key aspects)
3. Difficulty (Easy/Medium/Hard)
4. Suggested Approach (how to start)`;
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
      const systemPrompt = `You are OSFIT File Explainer.

Rules:
- Be concise, no emojis
- Clear, educational explanations
- Use code snippets when helpful

Provide:
1. File Purpose (1-2 sentences)
2. Key Functions/Components (list with one-line descriptions)
3. Logic Flow (how it works)
4. Dependencies (what it imports/exports)`;

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
  const systemPrompt = `You are OSFIT Open Source Mentor.

Rules:
- Be concise, no emojis
- Give practical, actionable advice
- Short answers, simple language
- Use markdown for structure

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
- Testing: find bugs, write test cases
- Triage: organize issues, close duplicates

ANATOMY OF A PROJECT:
- Author: created the project
- Owner: has admin access
- Maintainers: drive vision, manage project
- Contributors: anyone who contributed
- Key files: LICENSE, README, CONTRIBUTING, CODE_OF_CONDUCT

FINDING PROJECTS:
- Start with software you already use
- Look for "good first issue" or "help wanted" labels
- Use: GitHub Explore, First Timers Only, CodeTriage, Up For Grabs, OpenSauced
- Check /contribute page (e.g., github.com/facebook/react/contribute)

BEFORE CONTRIBUTING - CHECKLIST:
- Has a LICENSE file? (required for open source)
- Recent commits? (active project)
- Issues get responses? (maintainers engaged)
- PRs get reviewed and merged?
- Friendly community? (check issue discussions)

OPENING ISSUES:
- Report bugs you cannot solve yourself
- Discuss high-level ideas before implementing
- Propose new features
- Check if issue already exists first

OPENING PULL REQUESTS:
- Small fixes: typos, broken links, obvious errors
- Work already discussed in an issue
- Open as draft/WIP early for feedback
- Reference related issues (e.g., "Closes #37")
- Include screenshots for UI changes
- Test your changes

COMMUNICATION BEST PRACTICES:
- Give context (what you tried, what happened)
- Do homework first (search docs, issues, Stack Overflow)
- Keep requests short and direct
- Keep communication public (not private DMs)
- Be patient when asking questions
- Respect community decisions
- Assume good intentions

AFTER SUBMITTING:
- No response? Wait a week, then politely follow up
- Changes requested? Be responsive, don't abandon
- Not accepted? Ask for feedback, respect decision, consider forking
- Accepted? Celebrate and look for next contribution

GIT WORKFLOW FOR CONTRIBUTIONS:
1. Fork the repository
2. Clone locally: git clone <your-fork-url>
3. Add upstream: git remote add upstream <original-repo-url>
4. Create branch: git checkout -b feature/your-feature
5. Make changes and commit
6. Push to your fork: git push origin feature/your-feature
7. Open Pull Request from your fork to upstream
8. Respond to review feedback
9. Get merged!

=== END KNOWLEDGE BASE ===

Answer user questions using this knowledge. Be direct and helpful.`;

  return await analyzeWithContext(systemPrompt, message, formatHistory(history), effectiveKeys.gemini.key);
}

function formatHistory(history: unknown[]): string {
  if (!history || history.length === 0) return '';
  
  return (history as Array<{role: string; content: string}>)
    .slice(-5)
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');
}
