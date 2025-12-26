/**
 * Issue Solver AI Prompts
 * Gemini prompts for each step of the issue solving workflow
 */

export const ISSUE_SOLVER_PROMPTS = {
  /**
   * Step 2: Issue Explanation
   * Short, direct explanation of the issue
   */
  EXPLANATION: `You are OSFIT Issue Solver. Analyze this GitHub issue and provide a SHORT, DIRECT explanation.

RULES:
1. Keep it under 100 words
2. Be direct and to the point
3. Identify: What's the problem? What needs to be done?
4. Mention affected files/components if obvious
5. Rate difficulty: Easy / Medium / Hard

FORMAT:
**Problem:** [1-2 sentences]
**What to do:** [1-2 sentences]
**Files likely affected:** [list or "Unknown"]
**Difficulty:** [Easy/Medium/Hard]`,

  /**
   * Step 4: Solution Plan
   * Step-by-step plan to fix the issue
   */
  SOLUTION_PLAN: `You are OSFIT Issue Solver. Based on the issue analysis, provide a step-by-step solution plan.

RULES:
1. Be specific and actionable
2. Number each step clearly
3. Mention exact file paths when possible
4. Include code snippets if helpful
5. Keep it practical - something a developer can follow

FORMAT:
### Solution Plan

1. **Step 1:** [Action]
   - Details...
   
2. **Step 2:** [Action]
   - Details...

### Expected Changes
- File 1: [what to change]
- File 2: [what to change]`,

  /**
   * Step 6: PR Generation
   * Generate PR content from issue + git diff
   */
  PR_GENERATION: `You are OSFIT Issue Solver. Generate a professional Pull Request based on the issue and git diff provided.

RULES:
1. Write a clear, conventional PR title (use prefixes: fix:, feat:, refactor:, docs:)
2. Write a concise but complete description
3. Summarize the solution approach
4. List file changes

FORMAT:
## PR Title
\`[prefix]: [short description]\`

## Description
[2-3 sentences about what this PR does and why]

## Solution
[Brief technical explanation of the fix]

## Changes
- \`file1.ts\`: [what changed]
- \`file2.ts\`: [what changed]

## Related Issue
Fixes #[issue_number]`
};

/**
 * Get prompt for a specific step with context
 */
export function getIssueSolverPrompt(
  step: 'explanation' | 'solution_plan' | 'pr_generation',
  context: {
    issueTitle?: string;
    issueBody?: string;
    issueLabels?: string[];
    explanation?: string;
    solutionPlan?: string;
    gitDiff?: string;
  }
): string {
  let systemPrompt = '';
  let userContext = '';

  switch (step) {
    case 'explanation':
      systemPrompt = ISSUE_SOLVER_PROMPTS.EXPLANATION;
      userContext = `
ISSUE TITLE: ${context.issueTitle || 'Unknown'}

ISSUE BODY:
${context.issueBody || 'No description provided'}

LABELS: ${context.issueLabels?.join(', ') || 'None'}`;
      break;

    case 'solution_plan':
      systemPrompt = ISSUE_SOLVER_PROMPTS.SOLUTION_PLAN;
      userContext = `
ISSUE TITLE: ${context.issueTitle || 'Unknown'}

ISSUE BODY:
${context.issueBody || 'No description provided'}

PREVIOUS ANALYSIS:
${context.explanation || 'No analysis available'}`;
      break;

    case 'pr_generation':
      systemPrompt = ISSUE_SOLVER_PROMPTS.PR_GENERATION;
      userContext = `
ISSUE TITLE: ${context.issueTitle || 'Unknown'}

ISSUE BODY:
${context.issueBody || 'No description provided'}

SOLUTION PLAN:
${context.solutionPlan || 'No plan available'}

GIT DIFF:
\`\`\`diff
${context.gitDiff || 'No diff provided'}
\`\`\``;
      break;
  }

  return `${systemPrompt}\n\n---\n\n${userContext}`;
}

/**
 * Step labels for UI
 */
export const STEP_LABELS: Record<string, string> = {
  'issue_input': 'Enter Issue URL',
  'explanation': 'Analyzing Issue...',
  'awaiting_plan': 'Want the solution plan?',
  'solution_plan': 'Generating Plan...',
  'awaiting_diff': 'Paste your git diff',
  'pr_generation': 'Generating PR...',
  'completed': 'PR Ready!'
};

/**
 * Get next step in the flow
 */
export function getNextStep(currentStep: string): string {
  const stepOrder = [
    'issue_input',
    'explanation',
    'awaiting_plan',
    'solution_plan',
    'awaiting_diff',
    'pr_generation',
    'completed'
  ];
  
  const currentIndex = stepOrder.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex >= stepOrder.length - 1) {
    return 'completed';
  }
  return stepOrder[currentIndex + 1];
}
