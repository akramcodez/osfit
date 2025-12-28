
const WELCOME_MESSAGE = `## Welcome to OSFIT!

To get started, please add your AI API key in **Settings**.

### Quick Setup

1. Click the **API Keys** badge in the sidebar
2. Add your **Gemini API Key** (free from Google AI Studio)
3. Or add your **Groq API Key** (free tier available)

### Get Your Free API Key

- **Gemini**: [ai.google.dev](https://ai.google.dev/) - Free tier available
- **Groq**: [console.groq.com](https://console.groq.com/) - Free tier available

Once configured, you can analyze files, solve issues, and chat with AI!`;

export const MOCK_RESPONSES = {
  mentor: WELCOME_MESSAGE,
  issue_solver: WELCOME_MESSAGE,
  file_explainer: WELCOME_MESSAGE
};

export const MOCK_TITLES = {
  mentor: "Setup Required",
  issue_solver: "Setup Required",
  file_explainer: "Setup Required"
};
