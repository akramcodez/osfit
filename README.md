# OSFIT - Open Source File Intelligence Tool

A multilingual AI-powered web application for analyzing GitHub code files and solving GitHub issues. Built with Next.js 16, powered by Gemini/Groq AI, with real-time translation support via Lingo.dev.

## Features

### File Explainer
- Paste any GitHub file URL to get a detailed explanation
- AI analyzes the code structure, purpose, and logic flow
- Visual flowchart generation using Mermaid.js
- Supports 20+ languages including Hindi, Bengali, Spanish, French, Japanese, and more

### Issue Solver
- Paste a GitHub issue URL to get an actionable solution plan
- Automatically fetches and analyzes referenced files
- Generates step-by-step fix instructions
- Full multilingual support

### Chat Interface
- Conversational AI assistant for general coding questions
- Streaming responses with markdown rendering
- Session history with persistent storage

### Multilingual Support
- 20+ language options for output
- Optional Lingo.dev integration for professional-grade translations
- Language preference saved per user

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| AI Models | Google Gemini, Groq (Llama) |
| Translation | Lingo.dev SDK |
| Flowcharts | Mermaid.js |
| Styling | Tailwind CSS |
| UI Components | Radix UI |
| Deployment | Vercel |

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- API keys for Gemini and/or Groq

### Installation

```bash
git clone https://github.com/akramcodez/osfit.git
cd osfit
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Encryption for user API keys
ENCRYPTION_SECRET=your_32_character_secret_key

# AI API Keys (fallback when user has none)
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
LINGO_API_KEY=your_lingo_key
APIFY_API_KEY=your_apify_key
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
osfit/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   │   ├── chat/          # Chat endpoint
│   │   ├── explain-line/  # Line explanation
│   │   ├── generate-flowchart/  # Mermaid generation
│   │   ├── github/        # GitHub data fetching
│   │   ├── issue-solver/  # Issue analysis
│   │   ├── process/       # File processing
│   │   ├── session/       # Session management
│   │   ├── translate/     # Translation endpoint
│   │   └── user/          # User settings/keys
│   └── page.tsx           # Main page
├── components/
│   ├── chat/              # Chat UI components
│   │   ├── ChatInterface.tsx
│   │   ├── FileExplainerCard.tsx
│   │   ├── IssueSolverBanner.tsx
│   │   ├── MermaidRenderer.tsx
│   │   └── ...
│   ├── auth/              # Authentication
│   └── ui/                # Radix UI components
├── lib/                   # Utilities
│   ├── ai-client.ts       # AI provider abstraction
│   ├── gemini-client.ts   # Gemini integration
│   ├── groq-client.ts     # Groq integration
│   ├── lingo-client.ts    # Lingo.dev translation
│   ├── supabase.ts        # Database client
│   └── encryption.ts      # API key encryption
└── apify-actor/           # Standalone actor (separate)
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Chat with AI assistant |
| `/api/process` | POST | Analyze GitHub file |
| `/api/issue-solver` | POST | Analyze GitHub issue |
| `/api/generate-flowchart` | POST | Generate Mermaid flowchart |
| `/api/translate` | POST | Translate text via Lingo.dev |
| `/api/session` | GET/POST/DELETE | Manage chat sessions |

## Apify Actor

For programmatic access or standalone usage, a fully-featured Apify Actor is available:

[Multilingual GitHub Scraper on Apify](https://apify.com/sincere_spinner/multilingual-github-scraper)

The actor provides the same functionality with pay-per-event pricing.

## License

MIT