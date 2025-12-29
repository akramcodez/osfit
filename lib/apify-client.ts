import { ApifyClient } from 'apify-client';

const ACTOR_NAME = 'sincere_spinner/osfit-github-scraper';

// Track if using fallback (for warning purposes)
export let usingApifyFallback = false;

/**
 * Fetch GitHub issue data
 * @param issueUrl - The GitHub issue URL
 * @param userApifyKey - User's own Apify API key (optional). If not provided, uses fallback scraping.
 */
export async function fetchGitHubIssue(issueUrl: string, userApifyKey?: string | null) {
  // Only use Apify if user has provided their own key
  if (userApifyKey) {
    usingApifyFallback = false;
    
    const userClient = new ApifyClient({
      token: userApifyKey,
    });
    
    const run = await userClient.actor(ACTOR_NAME).call({
      url: issueUrl,
      type: 'issue',
    });

    const { items } = await userClient.dataset(run.defaultDatasetId).listItems();
    
    if (!items || items.length === 0) {
      throw new Error('Failed to fetch issue data');
    }

    return items[0] as {
      title: string;
      body: string;
      number: number;
      url: string;
      state: string;
      labels: string[];
      comments: Array<{ author: string; body: string; created_at: string }>;
    };
  } else {
    // Using fallback mode - user hasn't added their own Apify key
    usingApifyFallback = true;
    
    const response = await fetch(issueUrl, {
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0 (compatible; OSFIT/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch issue');
    }

    const html = await response.text();

    const urlParts = issueUrl.split('/');
    const issueNumber = parseInt(urlParts[urlParts.length - 1], 10);

    // Extract title
    let title = `Issue #${issueNumber}`;
    const titleMatch = html.match(/<bdi class="js-issue-title[^"]*">([^<]+)<\/bdi>/);
    if (titleMatch) {
      title = titleMatch[1].trim();
    } else {
      const pageTitleMatch = html.match(/<title>([^·]+)/);
      if (pageTitleMatch) {
        title = pageTitleMatch[1].trim();
      }
    }

    // Extract body
    let body = '';
    const bodyMatch = html.match(/<td class="d-block comment-body[^"]*">[\s\S]*?<p[^>]*>([^<]+)<\/p>/);
    if (bodyMatch) {
      body = bodyMatch[1].trim();
    } else {
      const mdBodyMatch = html.match(/class="markdown-body[^"]*"[^>]*>([\s\S]*?)<\/div>/);
      if (mdBodyMatch) {
        body = mdBodyMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 500);
      }
    }

    // Extract state
    let state = 'unknown';
    if (html.includes('State--open') || html.includes('status="open"')) {
      state = 'open';
    } else if (html.includes('State--closed') || html.includes('status="closed"')) {
      state = 'closed';
    }

    // Extract labels
    const labels: string[] = [];
    const labelMatches = html.matchAll(/class="[^"]*IssueLabel[^"]*"[^>]*>([^<]+)</g);
    for (const match of labelMatches) {
      const label = match[1].trim();
      if (label && !labels.includes(label)) {
        labels.push(label);
      }
    }

    return {
      title,
      body: body || `(Issue body could not be fully parsed. Title: ${title})`,
      number: issueNumber,
      url: issueUrl,
      state,
      labels,
      comments: [],
    };
  }
}

/**
 * Fetch GitHub file content
 * Files are always fetched directly from raw.githubusercontent.com (no Apify needed)
 */
export async function fetchGitHubFile(fileUrl: string) {
  // Files are always fetched directly - no Apify needed
  usingApifyFallback = true;
  
  const rawUrl = fileUrl
    .replace('github.com', 'raw.githubusercontent.com')
    .replace('/blob/', '/');
  
  const response = await fetch(rawUrl);
  
  if (!response.ok) {
    throw new Error('Failed to fetch file content');
  }

  const content = await response.text();
  
  // Extract path from URL
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

  // Language detection map
  const languageMap: Record<string, string> = {
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
    'dockerfile': 'dockerfile',
  };

  const language = languageMap[extension] || extension;

  return {
    type: 'file' as const,
    path,
    content: content.substring(0, 8000),
    url: fileUrl,
    language,
  };
}

export { ACTOR_NAME };
