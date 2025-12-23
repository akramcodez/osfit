import { NextRequest, NextResponse } from 'next/server';
import { fetchGitHubIssue, fetchGitHubFile } from '@/lib/apify-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, type }: { url: string; type: 'issue' | 'file' } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'GitHub URL is required' },
        { status: 400 }
      );
    }

    if (type === 'issue') {
      const issue = await fetchGitHubIssue(url);
      return NextResponse.json({ data: issue, type: 'issue' });
    } else if (type === 'file') {
      const file = await fetchGitHubFile(url);
      return NextResponse.json({ data: file, type: 'file' });
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "issue" or "file"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('GitHub API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GitHub data' },
      { status: 500 }
    );
  }
}
