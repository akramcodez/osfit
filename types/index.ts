export type MessageRole = 'user' | 'assistant' | 'system';
export type AssistantMode = 'issue_solver' | 'file_explainer' | 'mentor';


export interface Message {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}


export interface FileExplanation {
  id: string;
  session_id: string;
  role: MessageRole;
  file_url?: string;
  file_path?: string;
  file_content?: string;
  language?: string;
  explanation: string; 
  metadata?: Record<string, unknown>;
  created_at: string;
}


export interface IssueSolution {
  id: string;
  session_id: string;
  role: MessageRole;
  issue_url?: string;
  issue_title?: string;
  issue_body?: string;
  issue_labels?: string;
  explanation?: string;
  solution_plan?: string;
  git_diff?: string;
  pr_title?: string;
  pr_description?: string;
  pr_solution?: string;
  pr_files_changed?: string;
  current_step: 'issue_input' | 'explanation' | 'awaiting_plan' | 'solution_plan' | 'awaiting_diff' | 'pr_generation' | 'completed';
  status: 'in_progress' | 'completed';
  metadata?: Record<string, unknown>;
  created_at: string;
}


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
