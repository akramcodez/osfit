export type MessageRole = 'user' | 'assistant' | 'system';
export type AssistantMode = 'idle' | 'issue_solver' | 'file_explainer' | 'mentor';

export interface Message {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  mode: AssistantMode;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface ChatSession {
  id: string;
  session_token: string;
  created_at: string;
  last_active: string;
}

export interface GitHubIssue {
  title: string;
  body: string;
  number: number;
  url: string;
  comments: Array<{
    author: string;
    body: string;
    created_at: string;
  }>;
}

export interface GitHubFile {
  path: string;
  content: string;
  url: string;
  language: string;
}
