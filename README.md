# OSFIT

AI-powered tool for analyzing GitHub files and solving issues. Supports 20+ languages.

## Setup

```bash
git clone https://github.com/akramcodez/osfit.git
cd osfit
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ENCRYPTION_SECRET=your_32_character_secret_key

# Required: Choose ONE AI provider
GEMINI_API_KEY=your_gemini_key
# OR
GROQ_API_KEY=your_groq_key

# Optional: For better GitHub content fetching
APIFY_API_KEY=your_apify_key

# Optional: For translating app's content in multiple languages (fallback uses Gemini)
LINGO_API_KEY=your_lingo_key
```

Minimal setup requires Supabase + one AI key (Gemini or Groq). Add Apify for better file/issue analysis. Add Lingo for professional translations for app's every component.

### Database Setup

Run these SQL queries in your Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User API Keys table
CREATE TABLE user_api_keys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  gemini_key_encrypted TEXT,
  apify_key_encrypted TEXT,
  lingo_key_encrypted TEXT,
  groq_key_encrypted TEXT,
  ai_provider TEXT DEFAULT 'gemini',
  preferred_language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Chat Sessions table
CREATE TABLE chat_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_token UUID DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  mode TEXT DEFAULT 'mentor',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- File Explanations table
CREATE TABLE file_explanations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_path TEXT,
  role TEXT,
  language TEXT,
  explanation TEXT,
  flowchart TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Issue Solutions table
CREATE TABLE issue_solutions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  issue_url TEXT NOT NULL,
  issue_title TEXT,
  issue_body TEXT,
  explanation TEXT,
  solution_plan TEXT,
  pr_files_changed TEXT[],
  pr_title TEXT,
  pr_description TEXT,
  pr_solution TEXT,
  current_step TEXT,
  status TEXT,
  role TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_solutions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_api_keys
CREATE POLICY "Users can view own API keys" ON user_api_keys
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own API keys" ON user_api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own API keys" ON user_api_keys
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own API keys" ON user_api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for chat_sessions
CREATE POLICY "Users can view own sessions" ON chat_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for messages
CREATE POLICY "Users can view messages from own sessions" ON messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = messages.session_id AND chat_sessions.user_id = auth.uid())
  );
CREATE POLICY "Users can insert messages to own sessions" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = messages.session_id AND chat_sessions.user_id = auth.uid())
  );
CREATE POLICY "Users can delete messages from own sessions" ON messages
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = messages.session_id AND chat_sessions.user_id = auth.uid())
  );

-- RLS Policies for file_explanations
CREATE POLICY "Users can view explanations from own sessions" ON file_explanations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = file_explanations.session_id AND chat_sessions.user_id = auth.uid())
  );
CREATE POLICY "Users can insert explanations to own sessions" ON file_explanations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = file_explanations.session_id AND chat_sessions.user_id = auth.uid())
  );
CREATE POLICY "Users can delete explanations from own sessions" ON file_explanations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = file_explanations.session_id AND chat_sessions.user_id = auth.uid())
  );

-- RLS Policies for issue_solutions
CREATE POLICY "Users can view solutions from own sessions" ON issue_solutions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = issue_solutions.session_id AND chat_sessions.user_id = auth.uid())
  );
CREATE POLICY "Users can insert solutions to own sessions" ON issue_solutions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = issue_solutions.session_id AND chat_sessions.user_id = auth.uid())
  );
CREATE POLICY "Users can update solutions in own sessions" ON issue_solutions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = issue_solutions.session_id AND chat_sessions.user_id = auth.uid())
  );
CREATE POLICY "Users can delete solutions from own sessions" ON issue_solutions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = issue_solutions.session_id AND chat_sessions.user_id = auth.uid())
  );
```

Run:

```bash
npm run dev
```

## Stack

Next.js 16, TypeScript, Supabase, Gemini/Groq AI, Tailwind CSS

## License

MIT