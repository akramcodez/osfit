// Quick test for apify-client in development mode
import { fetchGitHubIssue, fetchGitHubFile } from '../lib/apify-client';

async function test() {
  console.log('NODE_ENV:', process.env.NODE_ENV || 'development (default)');
  console.log('');
  
  console.log('🧪 Testing fetchGitHubIssue (dev mode - direct fetch)...');
  try {
    const issue = await fetchGitHubIssue('https://github.com/blackboxaicode/cli/issues/15');
    console.log('✅ Issue result:', JSON.stringify(issue, null, 2));
  } catch (err) {
    console.log('❌ Issue error:', err);
  }
  console.log('');
  
  console.log('🧪 Testing fetchGitHubFile...');
  try {
    const file = await fetchGitHubFile('https://github.com/facebook/react/blob/main/README.md');
    console.log('✅ File result:', { 
      path: file.path, 
      language: file.language, 
      contentLength: file.content.length 
    });
  } catch (err) {
    console.log('❌ File error:', err);
  }
}

test();
