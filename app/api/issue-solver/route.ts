import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeWithAI, AIProvider } from '@/lib/ai-client';
import { fetchGitHubIssue } from '@/lib/apify-client';
import { getUserApiKeys } from '@/app/api/user/keys/route';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  return error ? null : user;
}

async function verifySessionOwnership(supabase: ReturnType<typeof getSupabase>, sessionId: string, userId: string) {
  const { data } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

interface EffectiveKeys {
  gemini: string | null;
  groq: string | null;
  lingo: string | null;
  provider: AIProvider;
}

// Lingo is provided by the app
const SYSTEM_LINGO_KEY = process.env.LINGO_API_KEY || null;

function getEffectiveKeys(userKeys: { 
  gemini_key: string | null; 
  groq_key: string | null; 
  lingo_key: string | null;
  ai_provider: string;
}): EffectiveKeys {
  return {
    gemini: userKeys.gemini_key || null,
    groq: userKeys.groq_key || null,
    lingo: userKeys.lingo_key || SYSTEM_LINGO_KEY || null,
    provider: (userKeys.ai_provider as AIProvider) || 'gemini',
  };
}

const PROMPTS = {
  explanation: `You are OSFIT Issue Solver. Give a SHORT, DIRECT explanation.
RULES: Max 80 words. Be direct. Use Markdown.

FORMAT:
**PROBLEM**

> [1-3 sentences]

**WHAT TO DO**

> [1-3 sentence]

**DIFFICULTY**

> [Easy/Medium/Hard]`,

  solution: `You are OSFIT Issue Solver. Create a step-by-step solution plan.
RULES: Specific, actionable, practical.

FORMAT:
**SOLUTION PLAN**

1. **Step 1:** [action]
2. **Step 2:** [action]
3. **Step 3:** [action
...

**FILES TO MODIFY**

- \`file.ts\`: what to change`,

  pr: `You are OSFIT Issue Solver. Generate a professional Pull Request.

FORMAT:
**PR TITLE**

> \`fix: description\`

**DESCRIPTION**

> [2-4 sentences]

**SOLUTION**

> [brief technical summary]

**CHANGES**

- \`file1.ts\`: what changed

**CLOSES**

> #[issue_number]`
};

const WELCOME_MESSAGE = `## Welcome to OSFIT!

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

> Once configured, you can analyze files, solve issues, and chat with AI!`;

const MOCK_RESPONSES = {
  explanation: WELCOME_MESSAGE,
  solution: WELCOME_MESSAGE,
  pr: WELCOME_MESSAGE
};


async function getAIResponse(
  type: 'explanation' | 'solution' | 'pr',
  context: string,
  keys: EffectiveKeys,
  targetLanguage: string = 'en'
): Promise<string> {
  const hasAIKey = keys.gemini || keys.groq;
  
  if (!hasAIKey) {
    // Return mock response in English when no AI key available
    return MOCK_RESPONSES[type];
  }
  
  try {
    // AI generates directly in target language via targetLanguage parameter
    const response = await analyzeWithAI(PROMPTS[type], 'Analyze', context, {
      provider: keys.provider,
      geminiKey: keys.gemini,
      groqKey: keys.groq,
      targetLanguage,
    });
    
    return response;
  } catch (error) {
    console.error('Issue solver AI error:', error);
    // Return mock response on error
    return MOCK_RESPONSES[type];
  }
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const body = await request.json();
  const { session_id, issue_url, language = 'en' } = body;

  if (!session_id || !issue_url) {
    return NextResponse.json({ error: 'session_id and issue_url required' }, { status: 400 });
  }

  const owns = await verifySessionOwnership(supabase, session_id, user.id);
  if (!owns) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  try {
    const userKeys = await getUserApiKeys(user.id);
    const keys = getEffectiveKeys(userKeys);

    const { data: row, error: createError } = await supabase
      .from('issue_solutions')
      .insert({
        session_id,
        role: 'assistant',
        issue_url,
        current_step: 'fetching',
        status: 'in_progress',
        metadata: { language }
      })
      .select()
      .single();

    if (createError) throw createError;

    const issue = await fetchGitHubIssue(issue_url);

    await supabase
      .from('issue_solutions')
      .update({
        issue_title: issue.title,
        issue_body: issue.body || '',
        issue_labels: issue.labels?.join(', ') || '',
        current_step: 'explaining'
      })
      .eq('id', row.id);

    const context = `
Issue: ${issue.title}
#${issue.number}

${issue.body || 'No description'}

Labels: ${issue.labels?.join(', ') || 'None'}`;

    const explanation = await getAIResponse('explanation', context, keys, language);

    const { data: updated, error: updateError } = await supabase
      .from('issue_solutions')
      .update({
        explanation,
        current_step: 'solution_step'
      })
      .eq('id', row.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ 
      issue: updated,
      message: 'Issue analyzed successfully'
    });

  } catch (error) {
    console.error('Issue solver POST error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to analyze issue'
    }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const body = await request.json();
  const { issue_id, action, git_diff, language = 'en' } = body;

  if (!issue_id || !action) {
    return NextResponse.json({ error: 'issue_id and action required' }, { status: 400 });
  }

  try {
    const { data: issue, error: fetchError } = await supabase
      .from('issue_solutions')
      .select('*, chat_sessions!inner(user_id)')
      .eq('id', issue_id)
      .single();

    if (fetchError || !issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    if (issue.chat_sessions.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const userKeys = await getUserApiKeys(user.id);
    const keys = getEffectiveKeys(userKeys);
    const targetLanguage = language || issue.metadata?.language || 'en';

    if (action === 'discard') {
      const { data: updated } = await supabase
        .from('issue_solutions')
        .update({ status: 'completed', current_step: 'discarded' })
        .eq('id', issue_id)
        .select()
        .single();

      return NextResponse.json({ issue: updated, message: 'Issue discarded' });
    }

    if (action === 'solution') {
      const context = `
Issue: ${issue.issue_title}
${issue.issue_body || 'No description'}

Previous Analysis:
${issue.explanation}`;

      const solutionPlan = await getAIResponse('solution', context, keys, targetLanguage);

      const { data: updated } = await supabase
        .from('issue_solutions')
        .update({
          solution_plan: solutionPlan,
          current_step: 'pr_context'
        })
        .eq('id', issue_id)
        .select()
        .single();

      return NextResponse.json({ issue: updated, message: 'Solution plan generated' });
    }

    if (action === 'pr') {
      if (!git_diff) {
        return NextResponse.json({ error: 'git_diff required for PR generation' }, { status: 400 });
      }

      const context = `
Issue: ${issue.issue_title}
Issue Number: #${issue.issue_url?.match(/\/issues\/(\d+)/)?.[1] || '?'}

Solution Plan:
${issue.solution_plan || 'N/A'}

Git Diff:
\`\`\`diff
${git_diff.substring(0, 5000)}
\`\`\``;

      const prSolution = await getAIResponse('pr', context, keys, targetLanguage);

      const { data: updated } = await supabase
        .from('issue_solutions')
        .update({
          git_diff,
          pr_solution: prSolution,
          status: 'completed',
          current_step: 'completed'
        })
        .eq('id', issue_id)
        .select()
        .single();

      return NextResponse.json({ issue: updated, message: 'PR content generated' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Issue solver PATCH error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to process action'
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  }

  const owns = await verifySessionOwnership(supabase, sessionId, user.id);
  if (!owns) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const { data: issues } = await supabase
    .from('issue_solutions')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({ issues: issues || [] });
}
