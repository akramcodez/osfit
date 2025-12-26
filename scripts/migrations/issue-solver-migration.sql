-- Issue Solver Database Migration
-- Run this in Supabase SQL Editor

-- Expand issue_solutions table with all required columns
ALTER TABLE issue_solutions 
ADD COLUMN IF NOT EXISTS issue_url TEXT,
ADD COLUMN IF NOT EXISTS issue_title TEXT,
ADD COLUMN IF NOT EXISTS issue_body TEXT,
ADD COLUMN IF NOT EXISTS issue_labels TEXT,
ADD COLUMN IF NOT EXISTS explanation TEXT,
ADD COLUMN IF NOT EXISTS solution_plan TEXT,
ADD COLUMN IF NOT EXISTS git_diff TEXT,
ADD COLUMN IF NOT EXISTS pr_title TEXT,
ADD COLUMN IF NOT EXISTS pr_description TEXT,
ADD COLUMN IF NOT EXISTS pr_solution TEXT,
ADD COLUMN IF NOT EXISTS pr_files_changed TEXT,
ADD COLUMN IF NOT EXISTS current_step TEXT DEFAULT 'issue_input',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress',
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'assistant',
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_issue_solutions_session_id ON issue_solutions(session_id);
CREATE INDEX IF NOT EXISTS idx_issue_solutions_status ON issue_solutions(status);
