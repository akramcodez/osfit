// OSFIT GitHub Scraper Actor
// Fetches GitHub issues and file content for the OSFIT open-source assistant

import { CheerioCrawler, type CheerioCrawlingContext } from '@crawlee/cheerio';
import { Actor } from 'apify';

interface Input {
  url: string;
  type: 'issue' | 'file';
}

interface IssueComment {
  author: string;
  body: string;
  created_at: string;
}

interface IssueResult {
  type: 'issue';
  title: string;
  body: string;
  number: number;
  url: string;
  state: string;
  labels: string[];
  comments: IssueComment[];
}

interface FileResult {
  type: 'file';
  path: string;
  content: string;
  url: string;
  language: string;
}

// Wrap everything in an async main function
async function main(): Promise<void> {
  await Actor.init();

  const input = await Actor.getInput<Input>();

  if (!input?.url || !input?.type) {
    throw new Error('URL and type are required inputs');
  }

  const { url, type } = input;

  if (type === 'issue') {
    // Fetch GitHub issue
    const crawler = new CheerioCrawler({
      maxRequestsPerCrawl: 1,
      requestHandler: async (context: CheerioCrawlingContext): Promise<void> => {
        const { request, $, log } = context;
        log.info(`Fetching issue from ${request.url}`);

        // Extract issue number from URL
        const urlParts = request.url.split('/');
        const issueNumber = parseInt(urlParts[urlParts.length - 1], 10);

        // Extract issue data from the page
        const title = $('h1.gh-header-title .js-issue-title').text().trim() ||
                      $('[data-testid="issue-title"]').text().trim() ||
                      $('h1').first().text().trim();

        const bodyElement = $('.js-comment-body').first();
        const body = bodyElement.text().trim() || '';

        const state = $('.State').text().trim().toLowerCase() || 
                      $('[data-testid="state-label"]').text().trim().toLowerCase() || 'unknown';

        // Extract labels
        const labels: string[] = [];
        $('.IssueLabel, [data-testid="issue-label"]').each((_i, el) => {
          const labelText = $(el).text().trim();
          if (labelText) labels.push(labelText);
        });

        // Extract comments
        const comments: IssueComment[] = [];
        $('.timeline-comment, .js-timeline-item').each((index, el) => {
          if (index === 0) {
            return; // Skip the first one (issue body)
          }
          
          const $el = $(el);
          const author = $el.find('.author, [data-testid="author"]').text().trim() || 'unknown';
          const commentBody = $el.find('.comment-body, .js-comment-body').text().trim();
          const createdAt = $el.find('relative-time').attr('datetime') || '';
          
          if (commentBody) {
            comments.push({
              author,
              body: commentBody,
              created_at: createdAt,
            });
          }
        });

        const result: IssueResult = {
          type: 'issue',
          title,
          body,
          number: issueNumber,
          url: request.url,
          state,
          labels,
          comments,
        };

        await Actor.pushData(result);
        log.info(`Successfully extracted issue: ${title}`);
      },
    });

    await crawler.run([url]);

  } else if (type === 'file') {
    // Fetch GitHub file - convert to raw URL
    const rawUrl = url
      .replace('github.com', 'raw.githubusercontent.com')
      .replace('/blob/', '/');

    console.log(`Fetching file from ${rawUrl}`);

    // Use direct fetch for raw file content (not CheerioCrawler which rejects text/plain)
    const response = await fetch(rawUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }

    const content = await response.text();

    // Extract path and extension from original URL
    const urlParts = url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const extension = fileName.split('.').pop() || '';
    const filePath = urlParts.slice(urlParts.indexOf('blob') + 2).join('/');

    const result: FileResult = {
      type: 'file',
      path: filePath,
      content,
      url,
      language: extension,
    };

    await Actor.pushData(result);
    console.log(`Successfully extracted file: ${filePath}`);
  }

  await Actor.exit();
}

// Run the main function
main().catch((err: unknown) => {
  console.error('Actor failed:', err);
  process.exit(1);
});
