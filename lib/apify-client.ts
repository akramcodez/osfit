import { ApifyClient } from 'apify-client';

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_KEY,
});

// Use cloud Actor only in production, direct fetch in development
const USE_CLOUD_ACTOR = process.env.NODE_ENV === 'production';
const ACTOR_NAME = 'sincere_spinner/osfit-github-scraper';

/**
 * Fetch GitHub issue data
 * - In production: uses cloud Actor (your Apify API key)
 * - In development: fetches directly (free, no Actor runs)
 */
export async function fetchGitHubIssue(issueUrl: string) {
  if (USE_CLOUD_ACTOR) {
    // Production: use cloud Actor
    const run = await apifyClient.actor(ACTOR_NAME).call({
      url: issueUrl,
      type: 'issue',
    });

    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    
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
    // Development: fetch directly from GitHub (no Apify cost)
    const response = await fetch(issueUrl, {
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'OSFIT-Dev'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch issue');
    }

    // Extract issue number from URL
    const urlParts = issueUrl.split('/');
    const issueNumber = parseInt(urlParts[urlParts.length - 1], 10);

    // For development, just return basic info (title would require HTML parsing)
    return {
      title: `Issue #${issueNumber}`,
      body: '(Development mode - full content available in production)',
      number: issueNumber,
      url: issueUrl,
      state: 'unknown',
      labels: [],
      comments: [],
    };
  }
}

/**
 * Fetch GitHub file content
 * - Uses direct fetch (free) - same in dev and production
 */
export async function fetchGitHubFile(fileUrl: string) {
  // Parse the GitHub file URL to get raw content
  const rawUrl = fileUrl
    .replace('github.com', 'raw.githubusercontent.com')
    .replace('/blob/', '/');
  
  const response = await fetch(rawUrl);
  
  if (!response.ok) {
    throw new Error('Failed to fetch file content');
  }

  const content = await response.text();
  const path = fileUrl.split('/').pop() || '';
  const extension = path.split('.').pop() || '';

  return {
    type: 'file' as const,
    path,
    content,
    url: fileUrl,
    language: extension,
  };
}

export { apifyClient, ACTOR_NAME };
