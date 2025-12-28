
const WELCOME_MESSAGE = `## Welcome to OSFIT!

To get started, please add your API keys in **Settings**.

---

### Quick Setup

| Step | Action |
| :--- | :--- |
| 1 | Click your **profile avatar** in the sidebar |
| 2 | Add your **Gemini** or **Groq** API key |
| 3 | Add your **Apify** API key for GitHub features |

---

### Get Your Free API Keys

| Service | Link | Notes |
| :--- | :--- | :--- |
| **Gemini** | [ai.google.dev](https://ai.google.dev/) | Free tier available |
| **Groq** | [console.groq.com](https://console.groq.com/) | Free tier available |
| **Apify** | [apify.com](https://apify.com/) | Free tier for GitHub scraping |

---

> Once configured, you can analyze files, solve issues, and chat with AI!`;

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
