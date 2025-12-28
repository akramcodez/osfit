// Multilingual GitHub Scraper
// Standalone AI-powered file explainer and issue solver with multilingual support
import { CheerioCrawler } from '@crawlee/cheerio';
import { Actor } from 'apify';
import Groq from 'groq-sdk';
// Language mapping
const LANGUAGE_MAP = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'java': 'java',
    'kt': 'kotlin',
    'swift': 'swift',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'cs': 'csharp',
    'php': 'php',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'bash',
    'bash': 'bash',
};
// Language names for prompts
const LANGUAGE_NAMES = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'bn': 'Bengali',
    'hi': 'Hindi',
    'ar': 'Arabic',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ru': 'Russian',
    'pt': 'Portuguese',
    'it': 'Italian',
    'nl': 'Dutch',
    'tr': 'Turkish',
    'vi': 'Vietnamese',
    'th': 'Thai',
    'id': 'Indonesian',
    'ms': 'Malay',
    'ta': 'Tamil',
    'te': 'Telugu',
};
// Fetch file content from GitHub
async function fetchGitHubFile(fileUrl) {
    const rawUrl = fileUrl
        .replace('github.com', 'raw.githubusercontent.com')
        .replace('/blob/', '/');
    const response = await fetch(rawUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
    }
    const content = await response.text();
    // Extract path
    const urlParts = fileUrl.split('/blob/');
    let path = '';
    if (urlParts.length > 1) {
        const afterBlob = urlParts[1];
        const segments = afterBlob.split('/');
        path = segments.slice(1).join('/');
    }
    if (!path) {
        path = fileUrl.split('/').pop() || 'unknown';
    }
    const fileName = path.split('/').pop() || '';
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const detectedLanguage = LANGUAGE_MAP[extension] || extension;
    return {
        path,
        content: content.substring(0, 8000), // Limit content size
        detectedLanguage,
        url: fileUrl,
    };
}
// Fetch issue data from GitHub
async function fetchGitHubIssue(issueUrl) {
    return new Promise((resolve, reject) => {
        const crawler = new CheerioCrawler({
            maxRequestsPerCrawl: 1,
            requestHandler: async (context) => {
                const { request, $ } = context;
                const urlParts = request.url.split('/');
                const issueNumber = parseInt(urlParts[urlParts.length - 1], 10);
                const title = $('h1.gh-header-title .js-issue-title').text().trim() ||
                    $('[data-testid="issue-title"]').text().trim() ||
                    $('h1').first().text().trim();
                const bodyElement = $('.js-comment-body').first();
                const body = bodyElement.text().trim() || '';
                const state = $('.State').text().trim().toLowerCase() ||
                    $('[data-testid="state-label"]').text().trim().toLowerCase() || 'unknown';
                const labels = [];
                $('.IssueLabel, [data-testid="issue-label"]').each((_i, el) => {
                    const labelText = $(el).text().trim();
                    if (labelText)
                        labels.push(labelText);
                });
                const comments = [];
                $('.timeline-comment, .js-timeline-item').each((index, el) => {
                    if (index === 0)
                        return;
                    const $el = $(el);
                    const author = $el.find('.author, [data-testid="author"]').text().trim() || 'unknown';
                    const commentBody = $el.find('.comment-body, .js-comment-body').text().trim();
                    const createdAt = $el.find('relative-time').attr('datetime') || '';
                    if (commentBody) {
                        comments.push({ author, body: commentBody, created_at: createdAt });
                    }
                });
                resolve({
                    title,
                    body,
                    number: issueNumber,
                    url: request.url,
                    state,
                    labels,
                    comments,
                });
            },
            failedRequestHandler: async ({ request }) => {
                reject(new Error(`Failed to fetch issue: ${request.url}`));
            },
        });
        crawler.run([issueUrl]).catch(reject);
    });
}
// Extract file links from issue body/comments
function extractFileLinks(issue) {
    const links = [];
    const regex = /github\.com\/[^\/]+\/[^\/]+\/blob\/[^\s\)\"]+/g;
    const findLinks = (text) => {
        const matches = text.match(regex) || [];
        matches.forEach(match => {
            if (!match.startsWith('http'))
                match = 'https://' + match;
            if (!links.includes(match) && links.length < 3) {
                links.push(match);
            }
        });
    };
    findLinks(issue.body);
    issue.comments.forEach(c => findLinks(c.body));
    return links;
}
// AI Analysis with Groq
async function analyzeWithGroq(systemPrompt, userMessage, targetLanguage = 'en') {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
        throw new Error('GROQ_API_KEY not configured in actor environment');
    }
    const groq = new Groq({ apiKey: groqKey });
    const langName = LANGUAGE_NAMES[targetLanguage] || 'English';
    const completion = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: [
            {
                role: 'system',
                content: `${systemPrompt}\n\nIMPORTANT: Respond ENTIRELY in ${langName}. All text must be in ${langName}.`
            },
            { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 2000,
    });
    return completion.choices[0]?.message?.content || '';
}
// Generate Flowchart using Groq
async function generateFlowchart(fileContent, language, targetLanguage = 'en') {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey)
        return '';
    const groq = new Groq({ apiKey: groqKey });
    const targetLangName = LANGUAGE_NAMES[targetLanguage] || 'English';
    const systemPrompt = `You are a code visualization expert. Generate a Mermaid.js flowchart that shows how this code file works.

RULES:
1. USE ONLY mermaid syntax. Start with \`\`\`mermaid and end with \`\`\`
2. Use top-down direction: flowchart TD
3. Keep it simple and high-level (max 15-20 nodes)
4. Focus on data flow and main logic steps
5. Use recognizable shapes:
   - [rect] for processes
   - {rhombus} for decisions
   - (circle) for start/end
   - [[subroutine]] for function calls
6. Return ONLY the mermaid code, nothing else

IMPORTANT LANGUAGE REQUIREMENT:
The flowchart syntax (graph TD, -->, etc.) MUST be in English.
But the LABELS inside nodes (e.g. [Process Data], {Is Valid?}) MUST be in ${targetLangName}.`;
    const userMessage = `Generate a flowchart for this ${language} file:\n\n${fileContent.substring(0, 3000)}`;
    try {
        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.2,
            max_tokens: 1000,
        });
        let code = completion.choices[0]?.message?.content || '';
        // Extract mermaid block
        const match = code.match(/```mermaid\n?([\s\S]*?)```/);
        if (match) {
            code = match[1].trim();
        }
        return code;
    }
    catch (error) {
        console.warn('Flowchart generation failed:', error);
        return '';
    }
}
// Translate with Lingo (optional high-quality translation)
async function translateWithLingo(text, targetLanguage) {
    const lingoKey = process.env.LINGO_API_KEY;
    if (!lingoKey || targetLanguage === 'en') {
        return text;
    }
    try {
        // Dynamic import to avoid issues if not installed
        const { LingoDotDevEngine } = await import('lingo.dev/sdk');
        const lingo = new LingoDotDevEngine({ apiKey: lingoKey });
        const result = await lingo.localizeObject({ text }, { sourceLocale: 'en', targetLocale: targetLanguage });
        return result.text || text;
    }
    catch (error) {
        console.warn('Lingo translation failed, using original:', error);
        return text;
    }
}
// File Explainer Mode
async function handleFileExplainer(url, language, useLingoTranslation, includeFlowchart) {
    console.log(`[File Explainer] Fetching file: ${url}`);
    const file = await fetchGitHubFile(url);
    const systemPrompt = `You are OSFIT File Explainer - an AI that explains code files clearly.

RULES:
- Be concise, no emojis
- Use markdown formatting
- Explain purpose, key functions, and logic flow

FORMAT:
## File Purpose
[1-2 sentences]

## Key Functions/Components
- **name** - description

## Logic Flow
1. First step
2. Second step

## Dependencies
- What it imports/exports`;
    const userMessage = `Explain this ${file.detectedLanguage} file:

File: ${file.path}

\`\`\`${file.detectedLanguage}
${file.content.substring(0, 4000)}
\`\`\``;
    console.log('[File Explainer] Analyzing with Groq...');
    let explanation;
    const usedLingo = useLingoTranslation && language !== 'en';
    if (usedLingo) {
        // Get English response, then translate
        explanation = await analyzeWithGroq(systemPrompt, userMessage, 'en');
        console.log('[File Explainer] Translating with Lingo...');
        explanation = await translateWithLingo(explanation, language);
    }
    else {
        // Direct response in target language
        explanation = await analyzeWithGroq(systemPrompt, userMessage, language);
    }
    let flowchart;
    if (includeFlowchart) {
        console.log('[File Explainer] Generating flowchart...');
        flowchart = await generateFlowchart(file.content, file.detectedLanguage, language);
    }
    // Record billing event based on combination of features
    if (flowchart && usedLingo) {
        await Actor.charge({ eventName: 'file_analysis_flowchart_generation_lingo', count: 1 });
    }
    else if (flowchart) {
        await Actor.charge({ eventName: 'file_analysis_flowchart_generation', count: 1 });
    }
    else {
        await Actor.charge({ eventName: 'file_analysis', count: 1 });
    }
    return {
        success: true,
        mode: 'file_explainer',
        file,
        explanation,
        flowchart,
    };
}
// Issue Solver Mode
async function handleIssueSolver(url, language, useLingoTranslation, includeSolutionPlan) {
    console.log(`[Issue Solver] Fetching issue: ${url}`);
    const issue = await fetchGitHubIssue(url);
    // Extract and fetch related files
    const fileLinks = extractFileLinks(issue);
    const relatedFiles = [];
    for (const link of fileLinks) {
        try {
            console.log(`[Issue Solver] Fetching related file: ${link}`);
            const file = await fetchGitHubFile(link);
            relatedFiles.push(file);
        }
        catch (e) {
            console.warn(`Failed to fetch ${link}:`, e);
        }
    }
    const systemPrompt = `You are OSFIT Issue Solver - an AI that analyzes GitHub issues and provides solutions.

RULES:
- Be direct and actionable
- Use markdown formatting
- Provide both explanation AND solution

FORMAT:
## Issue Explanation
[2-3 sentences explaining what the issue is about]

## Solution Plan
1. **Step 1:** [action]
2. **Step 2:** [action]
3. **Step 3:** [action]

## Files to Modify
- \`file.ts\`: what to change`;
    let userMessage = `Analyze this GitHub issue:

**Issue #${issue.number}: ${issue.title}**
State: ${issue.state}
Labels: ${issue.labels.join(', ') || 'None'}

**Description:**
${issue.body || 'No description provided'}`;
    if (relatedFiles.length > 0) {
        userMessage += '\n\n**Related Files:**\n';
        relatedFiles.forEach(f => {
            userMessage += `\n--- ${f.path} ---\n\`\`\`${f.detectedLanguage}\n${f.content.substring(0, 1500)}\n\`\`\`\n`;
        });
    }
    console.log('[Issue Solver] Analyzing with Groq...');
    let response;
    const usedLingo = useLingoTranslation && language !== 'en';
    if (usedLingo) {
        response = await analyzeWithGroq(systemPrompt, userMessage, 'en');
        console.log('[Issue Solver] Translating with Lingo...');
        response = await translateWithLingo(response, language);
    }
    else {
        response = await analyzeWithGroq(systemPrompt, userMessage, language);
    }
    // Parse response into explanation and solution
    const explanationMatch = response.match(/## Issue Explanation\n([\s\S]*?)(?=\n## |$)/);
    const solutionMatch = response.match(/## Solution Plan\n([\s\S]*?)(?=\n## Files|$)/);
    const filesMatch = response.match(/## Files to Modify\n([\s\S]*?)$/);
    const issueExplanation = explanationMatch?.[1]?.trim() || response;
    let solutionPlan = '';
    // Only include solution plan in output if requested
    if (includeSolutionPlan) {
        solutionPlan = (solutionMatch?.[1] || '') + (filesMatch ? '\n\n## Files to Modify\n' + filesMatch[1] : '');
        solutionPlan = solutionPlan.trim() || response;
    }
    // Record billing event based on combination of features
    if (includeSolutionPlan && usedLingo) {
        await Actor.charge({ eventName: 'issue_explanation_solution_plan_lingo', count: 1 });
    }
    else if (includeSolutionPlan) {
        await Actor.charge({ eventName: 'issue_explanation_solution_plan', count: 1 });
    }
    else {
        await Actor.charge({ eventName: 'issue_explanation', count: 1 });
    }
    return {
        success: true,
        mode: 'issue_solver',
        issue,
        relatedFiles,
        issueExplanation: issueExplanation.trim(),
        solutionPlan,
    };
}
// Legacy mode handlers (backward compatibility)
async function handleLegacyIssue(url) {
    return await fetchGitHubIssue(url);
}
async function handleLegacyFile(url) {
    return await fetchGitHubFile(url);
}
// Main entry point
async function main() {
    await Actor.init();
    const input = await Actor.getInput();
    if (!input?.url) {
        throw new Error('URL is required');
    }
    const { url, language = 'en', useLingoTranslation = false, includeFlowchart = true, // Default to true
    includeSolutionPlan = true // Default to true
     } = input;
    // Determine mode (support both new 'mode' and legacy 'type')
    const mode = input.mode || input.type || 'file_explainer';
    console.log(`[Actor] Mode: ${mode}, Language: ${language}, Lingo: ${useLingoTranslation}`);
    let result;
    switch (mode) {
        case 'file_explainer':
            result = await handleFileExplainer(url, language, useLingoTranslation, includeFlowchart);
            break;
        case 'issue_solver':
            result = await handleIssueSolver(url, language, useLingoTranslation, includeSolutionPlan);
            break;
        case 'issue':
            // Raw data mode - just fetch issue data
            result = { type: 'issue', ...(await handleLegacyIssue(url)) };
            await Actor.charge({ eventName: 'issue_fetcher', count: 1 });
            break;
        case 'file':
            // Raw data mode - just fetch file data
            const fileData = await handleLegacyFile(url);
            result = { type: 'file', ...fileData, language: fileData.detectedLanguage };
            await Actor.charge({ eventName: 'file_fetcher', count: 1 });
            break;
        default:
            throw new Error(`Unknown mode: ${mode}`);
    }
    await Actor.pushData(result);
    console.log('[Actor] Done!');
    await Actor.exit();
}
// Run
main().catch(async (err) => {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Actor failed:', errorMessage);
    try {
        // Push structured error to dataset
        await Actor.pushData({
            success: false,
            error: errorMessage,
        });
    }
    catch {
        // Ignore if pushData fails
    }
    await Actor.fail(errorMessage);
});
//# sourceMappingURL=main.js.map