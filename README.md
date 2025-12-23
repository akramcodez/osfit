# OSFIT - Open Source Fit

A multilingual open-source assistant that helps developers understand GitHub issues, explain code files, and receive contribution guidance through a chat-based interface.

Built for the **Multilingual Actors Hackathon** (Lingo.dev × Apify)

---

## Features

- **Issue Solver** - Understand and solve GitHub issues
- **File Explainer** - Explain code files
- **Open Source Mentor** - Contribution guidance

All outputs are multilingual via Lingo.dev.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 16 | App framework |
| TypeScript | Type safety |
| Supabase | Database |
| Gemini AI | Reasoning |
| Apify | GitHub scraping |
| Lingo.dev | Translation |

---

## Project Structure

```
osfit/
├── app/api/           # API routes (chat, github, session)
├── components/chat/   # Chat UI components
├── lib/               # API clients (supabase, apify, gemini, lingo)
├── types/             # TypeScript definitions
├── apify-actor/       # Custom Apify Actor
└── scripts/           # Test scripts
```

---

## Setup

```bash
git clone https://github.com/akramcodez/osfit.git
cd osfit
npm install
```

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
GEMINI_API_KEY=your_key
APIFY_API_KEY=your_key
LINGO_API_KEY=your_key
```

Run:
```bash
npm run dev
```

---

## Apify Actor

**Actor ID**: `sincere_spinner/osfit-github-scraper`

Deploy:
```bash
cd apify-actor
apify login
apify push
```

---

## Dev vs Prod

| Mode | Fetch Method | Cost |
|------|--------------|------|
| Development | Direct fetch | Free |
| Production | Apify Actor | Uses credits |

Controlled by `NODE_ENV` in `lib/apify-client.ts`.

---

## Database Schema

```sql
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token text unique not null,
  created_at timestamp default now(),
  last_active timestamp default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id) on delete cascade,
  role text check (role in ('user', 'assistant', 'system')) not null,
  content text not null,
  mode text check (mode in ('issue_solver', 'file_explainer', 'mentor', 'idle')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamp default now()
);
```