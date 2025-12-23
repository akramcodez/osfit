import { NextResponse } from 'next/server';
import { analyzeWithContext } from '@/lib/gemini-client';
import { translateText } from '@/lib/lingo-client';
import { fetchGitHubIssue, fetchGitHubFile } from '@/lib/apify-client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, mode, language = 'en', conversationHistory = [] } = body;

    let response = '';

    switch (mode) {
      case 'idle':
        response = await handleIdleMode(message, conversationHistory);
        break;
      case 'issue_solver':
        response = await handleIssueSolver(message, conversationHistory);
        break;
      case 'file_explainer':
        response = await handleFileExplainer(message, conversationHistory);
        break;
      case 'mentor':
        response = await handleMentor(message, conversationHistory);
        break;
      default:
        response = 'Mode not recognized. Please select a valid mode.';
    }

    // Translate response if needed
    if (language !== 'en') {
      response = await translateText({
        text: response,
        targetLanguage: language,
        sourceLanguage: 'en'
      });
    }

    return NextResponse.json({ response });
  } catch (error: unknown) {
    console.error('Process error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Processing failed';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

async function handleIdleMode(message: string, history: unknown[]): Promise<string> {
  const systemPrompt = `You are OSFIT, a helpful multilingual assistant for open-source contributors. 
You help developers understand GitHub issues, explain code files, and provide mentorship.

Current mode: General Chat

Respond naturally and helpfully. If the user mentions a GitHub URL, suggest switching to the appropriate mode.`;

  return await analyzeWithContext(systemPrompt, message, formatHistory(history));
}

async function handleIssueSolver(
  message: string,
  history: unknown[]
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

      const analysis = await analyzeWithContext(systemPrompt, message, context);
      
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
  history: unknown[]
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

      return await analyzeWithContext(systemPrompt, message, context);
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
  history: unknown[]
): Promise<string> {
  const systemPrompt = `You are OSFIT's Open Source Mentor mode.
You provide guidance on:
- How to find good first issues
- How to approach maintainers
- Best practices for pull requests
- Open-source contribution etiquette
- Git workflows and collaboration

Be encouraging, practical, and specific. Share actionable advice.`;

  return await analyzeWithContext(systemPrompt, message, formatHistory(history));
}

function formatHistory(history: unknown[]): string {
  if (!history || history.length === 0) return '';
  
  return (history as Array<{role: string; content: string}>)
    .slice(-5)
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');
}
