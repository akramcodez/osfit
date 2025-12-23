# OSFIT - Open Source Fit

**A multilingual open-source assistant that helps developers understand GitHub issues, explain code files, and receive contribution guidance through a single chat-based interface.**

🏆 Built for the **Multilingual Actors Hackathon** (Lingo.dev × Apify)

---

## 🎯 What is OSFIT?

OSFIT reduces friction in open-source contribution, especially for non-native English speakers. It provides a unified conversational interface that:

- **Issue Solver** - Understand and solve GitHub issues
- **File Explainer** - Explain code files 
- **Open Source Mentor** - Guidance on contributing

All outputs are multilingual, powered by Lingo.dev.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | App framework |
| **TypeScript** | Type safety |
| **Supabase** | Database (sessions, messages) |
| **Gemini AI** | Reasoning & summarization |
| **Apify** | GitHub data scraping |
| **Lingo.dev** | Multilingual translation |
| **Tailwind CSS** | Styling |

---

## 📁 Project Structure

```
osfit/
├── app/
│   ├── api/
│   │   ├── chat/route.ts      # Chat endpoint
│   │   ├── github/route.ts    # GitHub data fetching
│   │   └── session/route.ts   # Session management
│   ├── page.tsx               # Main page
│   └── globals.css
├── components/
│   ├── chat/
│   │   ├── ChatInterface.tsx  # Main chat component
│   │   ├── MessageList.tsx    # Message display
│   │   ├── MessageBubble.tsx  # Individual messages
│   │   ├── MessageInput.tsx   # User input
│   │   └── ModeSelector.tsx   # Mode switching
│   └── ui/                    # shadcn components
├── lib/
│   ├── supabase.ts            # Supabase client
│   ├── apify-client.ts        # Apify integration
│   ├── gemini-client.ts       # Gemini AI client
│   └── lingo-client.ts        # Lingo.dev translation
├── types/
│   └── index.ts               # TypeScript definitions
├── apify-actor/               # Custom Apify Actor
│   ├── .actor/
│   │   ├── actor.json         # Actor config
│   │   └── input_schema.json  # Input schema
│   ├── src/main.ts            # Actor logic
│   ├── package.json
│   └── Dockerfile
└── scripts/
    └── test-connections.ts    # API testing
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- Gemini API key
- Apify account & API key
- Lingo.dev API key

### Installation

```bash
# Clone repo
git clone https://github.com/akramcodez/osfit.git
cd osfit

# Install dependencies
npm install

# Create .env.local
cp .env.example .env.local
# Then fill in your API keys
```

### Environment Variables

Create `.env.local` with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# API Keys
GEMINI_API_KEY=your_gemini_key
APIFY_API_KEY=your_apify_key
LINGO_API_KEY=your_lingo_key
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🎭 Apify Actor

OSFIT includes a custom Apify Actor for fetching GitHub data:

**Actor ID**: `sincere_spinner/osfit-github-scraper`

### Features
- Fetches GitHub issue metadata (title, number, labels)
- Fetches file content from any public repo
- Handles both issue and file URLs

### Deploy Actor

```bash
cd apify-actor
apify login
apify push
```

---

## 🌍 Development vs Production

| Mode | GitHub Fetch | Cost |
|------|--------------|------|
| Development (`npm run dev`) | Direct fetch | Free |
| Production (`npm run build`) | Apify Actor | Uses credits |

This is controlled by `NODE_ENV` in `lib/apify-client.ts`.

---

## 📊 Database Schema (Supabase)

```sql
-- Sessions table
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token text unique not null,
  created_at timestamp default now(),
  last_active timestamp default now()
);

-- Messages table
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

---

## 🧪 Testing Connections

```bash
# Test all API connections
npx tsx scripts/test-connections.ts
```

---

## 📝 License

MIT

---

## 🙏 Acknowledgments

- [Apify](https://apify.com) - Web scraping platform
- [Lingo.dev](https://lingo.dev) - Multilingual translation
- [Google Gemini](https://ai.google.dev/) - AI reasoning
- [Supabase](https://supabase.com) - Backend database
