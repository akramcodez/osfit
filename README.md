# OSFIT - Open Source Fit

Your multilingual assistant for open-source contribution.

## Features

- 🔍 **Issue Solver**: Understand and solve GitHub issues
- 📄 **File Explainer**: Get clear explanations of code files
- 🎓 **Open Source Mentor**: Learn contribution best practices
- 🌍 **12+ Languages**: Full multilingual support

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- Google Gemini AI
- Apify
- Lingo.dev

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Create `.env.local` with your API keys
4. Setup Supabase database (see schema in docs)
5. Run development server: `npm run dev`

## Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
APIFY_API_KEY=
LINGO_API_KEY=
```