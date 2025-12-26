import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeWithContext } from '@/lib/gemini-client';
import { fetchGitHubIssue } from '@/lib/apify-client';
import { getUserApiKeys } from '@/app/api/user/keys/route';

// Get Supabase client with service role
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Helper to get user from auth header
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

// Verify session ownership
async function verifySessionOwnership(supabase: ReturnType<typeof getSupabase>, sessionId: string, userId: string) {
  const { data } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

// AI Prompts
const PROMPTS = {
  explanation: `You are OSFIT Issue Solver. Give a SHORT, DIRECT explanation of this issue.

RULES:
1. Maximum 80 words
2. Be direct - no fluff
3. Format as markdown

FORMAT:
**Problem:** [1-2 sentences]
**What to do:** [1 sentence]  
**Difficulty:** [Easy/Medium/Hard]`,

  solution: `You are OSFIT Issue Solver. Create a step-by-step solution plan.

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
- \`file.ts\` - what to change`,

  pr: `You are OSFIT Issue Solver. Generate a professional Pull Request.

RULES:
1. Clear conventional title (fix:, feat:, refactor:)
2. Concise description
3. List file changes from the diff

FORMAT:
## PR Title
\`fix: description\`

## Description
[2-3 sentences]

## Solution
[brief technical summary]

## Changes
- \`file1.ts\`: what changed

## Closes
#[issue_number]`
};

// Development: Use mock data when Gemini keys are exhausted
const USE_MOCK = process.env.NODE_ENV === 'development' && !process.env.GEMINI_API_KEY;

const MOCK_RESPONSES = {
  explanation: `**Problem:** This issue reports a bug that needs to be fixed. The user has identified an edge case.

**What to do:** Review the affected code and apply the suggested fix or implement a proper solution.

**Difficulty:** Medium`,

  solution: `### Solution Plan

1. **Step 1:** Locate the affected file mentioned in the issue
2. **Step 2:** Reproduce the bug locally to understand the root cause
3. **Step 3:** Implement the fix following the suggested approach
4. **Step 4:** Add unit tests to prevent regression
5. **Step 5:** Test the fix manually

### Files to Modify
- \`src/components/affected-file.ts\` - Fix the edge case handling
- \`tests/affected-file.test.ts\` - Add regression test`,

  pr: `## PR Title
\`fix: resolve edge case bug in component\`

## Description
This PR fixes the bug reported in the issue. The root cause was improper handling of edge cases. This fix adds proper validation and error handling.

## Solution
Added null checks and proper error handling to prevent the crash in edge cases.

## Changes
- \`src/components/affected-file.ts\`: Added null checks
- \`tests/affected-file.test.ts\`: Added regression tests

## Closes
#123`
};

// Helper to get AI response (mock or real)
async function getAIResponse(
  type: 'explanation' | 'solution' | 'pr',
  context: string,
  geminiKey: string | null
): Promise<string> {
  if (USE_MOCK || !geminiKey) {
    console.log('[Issue Solver] Using mock response for:', type);
    return MOCK_RESPONSES[type];
  }
  
  try {
    return await analyzeWithContext(PROMPTS[type], 'Analyze', context, geminiKey);
  } catch (error) {
    console.error('[Issue Solver] Gemini error, falling back to mock:', error);
    return MOCK_RESPONSES[type];
  }
}

/**
 * POST - Create new issue and run initial analysis
 * Body: { session_id, issue_url }
 */
export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const body = await request.json();
  const { session_id, issue_url } = body;

  if (!session_id || !issue_url) {
    return NextResponse.json({ error: 'session_id and issue_url required' }, { status: 400 });
  }

  // Verify session ownership
  const owns = await verifySessionOwnership(supabase, session_id, user.id);
  if (!owns) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  try {
    // Step 1: Create row with issue_url
    const { data: row, error: createError } = await supabase
      .from('issue_solutions')
      .insert({
        session_id,
        role: 'assistant',
        issue_url,
        current_step: 'fetching',
        status: 'in_progress'
      })
      .select()
      .single();

    if (createError) throw createError;

    // Step 2: Fetch issue from GitHub via Apify
    const issue = await fetchGitHubIssue(issue_url);

    // Update row with fetched data
    await supabase
      .from('issue_solutions')
      .update({
        issue_title: issue.title,
        issue_body: issue.body || '',
        issue_labels: issue.labels?.join(', ') || '',
        current_step: 'explaining'
      })
      .eq('id', row.id);

    // Step 3: Generate explanation with Gemini
    const userKeys = await getUserApiKeys(user.id);
    const geminiKey = userKeys.gemini_key || process.env.GEMINI_API_KEY || null;

    const context = `
Issue: ${issue.title}
#${issue.number}

${issue.body || 'No description'}

Labels: ${issue.labels?.join(', ') || 'None'}`;

    const explanation = await getAIResponse('explanation', context, geminiKey);

    // Update row with explanation, move to solution_step
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

/**
 * PATCH - Update issue based on action
 * Body: { issue_id, action: 'solution' | 'pr' | 'discard', git_diff?: string }
 */
export async function PATCH(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const body = await request.json();
  const { issue_id, action, git_diff } = body;

  if (!issue_id || !action) {
    return NextResponse.json({ error: 'issue_id and action required' }, { status: 400 });
  }

  try {
    // Get current issue
    const { data: issue, error: fetchError } = await supabase
      .from('issue_solutions')
      .select('*, chat_sessions!inner(user_id)')
      .eq('id', issue_id)
      .single();

    if (fetchError || !issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    // Verify ownership
    if (issue.chat_sessions.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Handle actions
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
      // Generate solution plan
      const userKeys = await getUserApiKeys(user.id);
      const geminiKey = userKeys.gemini_key || process.env.GEMINI_API_KEY || null;

      const context = `
Issue: ${issue.issue_title}
${issue.issue_body || 'No description'}

Previous Analysis:
${issue.explanation}`;

      const solutionPlan = await getAIResponse('solution', context, geminiKey);

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

      // Generate PR content
      const userKeys = await getUserApiKeys(user.id);
      const geminiKey = userKeys.gemini_key || process.env.GEMINI_API_KEY || null;

      const context = `
Issue: ${issue.issue_title}
Issue Number: #${issue.issue_url?.match(/\/issues\/(\d+)/)?.[1] || '?'}

Solution Plan:
${issue.solution_plan || 'N/A'}

Git Diff:
\`\`\`diff
${git_diff.substring(0, 5000)}
\`\`\``;

      const prSolution = await getAIResponse('pr', context, geminiKey);

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

/**
 * GET - Get active issue for session
 * Query: ?session_id=...
 */
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

  // Verify ownership
  const owns = await verifySessionOwnership(supabase, sessionId, user.id);
  if (!owns) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Get latest active issue for session
  const { data: issues } = await supabase
    .from('issue_solutions')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({ issues: issues || [] });
}
