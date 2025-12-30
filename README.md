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

**Note:** This app uses:
- [multilingual-github-scraper](https://apify.com/sincere_spinner/multilingual-github-scraper) Apify actor for fetching GitHub content
- [Lingo](https://lingo.dev/) for localizing app text in multiple languages

### Database Setup

Run these SQL queries in your Supabase SQL Editor:

<details>
<summary>Show SQL schema</summary>

```sql
-- Enable gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tables (unchanged)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  username text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_token text NOT NULL UNIQUE,
  created_at timestamp without time zone DEFAULT now(),
  last_active timestamp without time zone DEFAULT now(),
  title text,
  user_id uuid,
  mode text DEFAULT 'mentor'::text,
  CONSTRAINT chat_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid,
  role text NOT NULL CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id)
);

CREATE TABLE IF NOT EXISTS public.file_explanations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid,
  role text NOT NULL CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text])),
  file_url text,
  file_path text,
  file_content text,
  language text,
  explanation text,
  created_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  flowchart text,
  CONSTRAINT file_explanations_pkey PRIMARY KEY (id),
  CONSTRAINT file_explanations_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id)
);

CREATE TABLE IF NOT EXISTS public.issue_solutions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  issue_url text,
  issue_title text,
  issue_body text,
  explanation text,
  solution_plan text,
  git_diff text,
  pr_title text,
  pr_description text,
  current_step text DEFAULT 'issue_input'::text,
  issue_labels text,
  pr_solution text,
  pr_files_changed text,
  status text DEFAULT 'in_progress'::text,
  role text DEFAULT 'assistant'::text,
  metadata jsonb,
  CONSTRAINT issue_solutions_pkey PRIMARY KEY (id),
  CONSTRAINT issue_solutions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id)
);

CREATE TABLE IF NOT EXISTS public.user_api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  gemini_key_encrypted text,
  apify_key_encrypted text,
  lingo_key_encrypted text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  openai_key_encrypted text,
  claude_key_encrypted text,
  grok_key_encrypted text,
  selected_ai_provider text DEFAULT 'gemini'::text,
  groq_key text,
  ai_provider text DEFAULT 'gemini'::text,
  groq_key_encrypted text,
  preferred_language text DEFAULT 'en'::text,
  CONSTRAINT user_api_keys_pkey PRIMARY KEY (id),
  CONSTRAINT user_api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

-- Idempotent policy creation: check pg_policies then CREATE if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'users_can_view_own_profile'
  ) THEN
    CREATE POLICY users_can_view_own_profile ON public.profiles
      FOR SELECT
      USING ((SELECT auth.uid()) = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'users_can_insert_own_profile'
  ) THEN
    CREATE POLICY users_can_insert_own_profile ON public.profiles
      FOR INSERT
      WITH CHECK ((SELECT auth.uid()) = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'users_can_update_own_profile'
  ) THEN
    CREATE POLICY users_can_update_own_profile ON public.profiles
      FOR UPDATE
      USING ((SELECT auth.uid()) = id)
      WITH CHECK ((SELECT auth.uid()) = id);
  END IF;

  -- chat_sessions
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_sessions' AND policyname = 'users_can_view_own_sessions'
  ) THEN
    CREATE POLICY users_can_view_own_sessions ON public.chat_sessions
      FOR SELECT
      USING ((SELECT auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_sessions' AND policyname = 'users_can_insert_own_sessions'
  ) THEN
    CREATE POLICY users_can_insert_own_sessions ON public.chat_sessions
      FOR INSERT
      WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_sessions' AND policyname = 'users_can_delete_own_sessions'
  ) THEN
    CREATE POLICY users_can_delete_own_sessions ON public.chat_sessions
      FOR DELETE
      USING ((SELECT auth.uid()) = user_id);
  END IF;

  -- messages
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'users_can_view_own_messages'
  ) THEN
    CREATE POLICY users_can_view_own_messages ON public.messages
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.chat_sessions cs
          WHERE cs.id = messages.session_id AND cs.user_id = (SELECT auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'users_can_insert_own_messages'
  ) THEN
    CREATE POLICY users_can_insert_own_messages ON public.messages
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.chat_sessions cs
          WHERE cs.id = messages.session_id AND cs.user_id = (SELECT auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'users_can_delete_own_messages'
  ) THEN
    CREATE POLICY users_can_delete_own_messages ON public.messages
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.chat_sessions cs
          WHERE cs.id = messages.session_id AND cs.user_id = (SELECT auth.uid())
        )
      );
  END IF;

  -- file_explanations
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'file_explanations' AND policyname = 'users_can_view_own_file_explanations'
  ) THEN
    CREATE POLICY users_can_view_own_file_explanations ON public.file_explanations
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.chat_sessions cs
          WHERE cs.id = file_explanations.session_id AND cs.user_id = (SELECT auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'file_explanations' AND policyname = 'users_can_insert_own_file_explanations'
  ) THEN
    CREATE POLICY users_can_insert_own_file_explanations ON public.file_explanations
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.chat_sessions cs
          WHERE cs.id = file_explanations.session_id AND cs.user_id = (SELECT auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'file_explanations' AND policyname = 'users_can_delete_own_file_explanations'
  ) THEN
    CREATE POLICY users_can_delete_own_file_explanations ON public.file_explanations
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.chat_sessions cs
          WHERE cs.id = file_explanations.session_id AND cs.user_id = (SELECT auth.uid())
        )
      );
  END IF;

  -- issue_solutions
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'issue_solutions' AND policyname = 'users_can_view_own_issue_solutions'
  ) THEN
    CREATE POLICY users_can_view_own_issue_solutions ON public.issue_solutions
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.chat_sessions cs
          WHERE cs.id = issue_solutions.session_id AND cs.user_id = (SELECT auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'issue_solutions' AND policyname = 'users_can_insert_own_issue_solutions'
  ) THEN
    CREATE POLICY users_can_insert_own_issue_solutions ON public.issue_solutions
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.chat_sessions cs
          WHERE cs.id = issue_solutions.session_id AND cs.user_id = (SELECT auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'issue_solutions' AND policyname = 'users_can_update_own_issue_solutions'
  ) THEN
    CREATE POLICY users_can_update_own_issue_solutions ON public.issue_solutions
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.chat_sessions cs
          WHERE cs.id = issue_solutions.session_id AND cs.user_id = (SELECT auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'issue_solutions' AND policyname = 'users_can_delete_own_issue_solutions'
  ) THEN
    CREATE POLICY users_can_delete_own_issue_solutions ON public.issue_solutions
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.chat_sessions cs
          WHERE cs.id = issue_solutions.session_id AND cs.user_id = (SELECT auth.uid())
        )
      );
  END IF;

  -- user_api_keys
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_api_keys' AND policyname = 'users_can_view_own_api_keys'
  ) THEN
    CREATE POLICY users_can_view_own_api_keys ON public.user_api_keys
      FOR SELECT
      USING ((SELECT auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_api_keys' AND policyname = 'users_can_insert_own_api_keys'
  ) THEN
    CREATE POLICY users_can_insert_own_api_keys ON public.user_api_keys
      FOR INSERT
      WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_api_keys' AND policyname = 'users_can_update_own_api_keys'
  ) THEN
    CREATE POLICY users_can_update_own_api_keys ON public.user_api_keys
      FOR UPDATE
      USING ((SELECT auth.uid()) = user_id)
      WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
END
$$;
```

</details>

Run:

```bash
npm run dev
```

## Stack

Next.js 16, TypeScript, Supabase, Gemini/Groq AI, Tailwind CSS

## License

MIT
