export type MessageRole = 'user' | 'assistant' | 'system';
export type AssistantMode = 'issue_solver' | 'file_explainer' | 'mentor';

// Base message for Mentor mode (messages table)
export interface Message {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// File Explainer mode (file_explanations table)
export interface FileExplanation {
  id: string;
  session_id: string;
  role: MessageRole;
  file_url?: string;
  file_path?: string;
  file_content?: string;
  language?: string;
  explanation: string; // This is the main content (user question or AI response)
  metadata?: Record<string, unknown>;
  created_at: string;
}

// Issue Solver mode (issue_solutions table) - placeholder for future
export interface IssueSolution {
  id: string;
  session_id: string;
  created_at: string;
}

// Union type for all chat data types
export type ChatData = Message | FileExplanation | IssueSolution;

export interface ChatSession {
  id: string;
  session_token: string;
  title?: string;
  mode?: AssistantMode;
  created_at: string;
  last_active: string;
  user_id?: string;
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
