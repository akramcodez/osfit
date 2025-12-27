# Multilingual GitHub Scraper

A standalone, AI-powered Apify Actor designed to analyze GitHub repositories. It can explain code files, visually diagram logic with flowcharts, and create solution plans for GitHub issues. It supports multiple languages and two primary usage patterns: Standalone (AI-powered) and App Integration (Raw Data).

## Features

- **File Explainer**: Analyzes code files to explain their purpose, main functions, and logic flow.
- **Flowchart Generation**: Automatically creates Mermaid.js flowcharts to visualize the code's execution path.
- **Issue Solver**: Analyzes GitHub issues and fetches referenced files to propose actionable, step-by-step solution plans.
- **Multilingual Support**: Supports output in over 20 languages (English, Spanish, French, Hindi, Bengali, etc.).
- **High-Quality Translation**: Optional integration with Lingo.dev for superior translation accuracy.
- **App Integration Modes**: Includes raw data fetching modes ("file" and "issue") for external applications to build their own AI pipelines.

---

## 1. Standalone Modes (AI-Powered)

These modes are for users running the Actor directly on Apify to get AI insights.

### Mode: File Explainer (`file_explainer`)
Analyzes a single source code file and provides a technical breakdown with a visualization.

**Example Input JSON:**
```json
{
  "mode": "file_explainer",
  "url": "https://github.com/user/project/blob/main/calculate.js",
  "language": "ja",
  "includeFlowchart": true
}
```

**Example Output (Japanese With Flowchart):**

"## ファイルの目的
このファイルは、TypeScriptコンパイラの設定（tsconfig.json）を解析し、ビルドプロセスを初期化するためのロジックを含んでいます。

## フローチャート
<img width="1403" height="1027" alt="image" src="https://github.com/user-attachments/assets/dd969a79-00e3-41e8-97aa-5a6e212b925f" />

**Full Output JSON Structure:**
```json
{
  "success": true,
  "mode": "file_explainer",
  "file": {
    "path": "calculate.js",
    "content": "function calculateTotal(price, tax) { ... }",
    "detectedLanguage": "javascript"
  },
  "explanation": "## ファイルの目的\nこのファイルは...",
  "flowchart": "flowchart TD\n    A[開始] --> B{価格は0未満か？}..."
}
```

---

### Mode: Issue Solver (`issue_solver`)
Analyzes a GitHub issue, identifies mentioned files, and proposes a fix.

**Example Input JSON:**
```json
{
  "mode": "issue_solver",
  "url": "https://github.com/user/project/issues/123",
  "language": "hi",
  "includeSolutionPlan": true
}
```

**Example Output (Hindi Solution Plan):**

"## समस्या विवरण
मोनोरेपो के लिए Vitest टेस्टिंग कॉन्फ़िगरेशन में नए प्रोजेक्ट पाथ को जोड़ने की आवश्यकता है।

## समाधान योजना
1. **चरण 1:** `vitest.config.ts` फ़ाइल खोलें।
2. **चरण 2:** `test.projects` सरणी (array) में नए पैकेज का पाथ जोड़ें।
3. **चरण 3:** परिवर्तनों को सहेजें और `npm test` चलाकर पुष्टि करें।
"

**Full Output JSON Structure:**
```json
{
  "success": true,
  "mode": "issue_solver",
  "issue": {
    "title": "Config Update",
    "number": 123,
    "body": "Need to add new project path..."
  },
  "issueExplanation": "## समस्या विवरण...",
  "solutionPlan": "## समाधान योजना\n1. चरण 1: ..."
}
```

---

## 2. App Integration Modes (Raw Data)

These modes are used by the OSFIT App or other external tools. They perform no AI analysis on the Actor side, instead acting as high-speed data fetchers.

### Mode: File (`file`)
Specifically designed to fetch the raw content of a file from GitHub for app-side processing.

**Input:**
- `mode`: "file"
- `url`: GitHub file URL

**Output Example (JSON):**
```json
{
  "type": "file",
  "url": "...",
  "payload": {
    "content": "raw file content string...",
    "language": "typescript"
  }
}
```

### Mode: Issue (`issue`)
Scrapes GitHub issue data into a structured format for app-side AI processing.

**Input:**
- `mode`: "issue"
- `url`: GitHub issue URL

**Output Example (JSON):**
```json
{
  "type": "issue",
  "url": "...",
  "payload": {
    "title": "Issue Title",
    "number": "123",
    "state": "open",
    "body": "Description text...",
    "comments": ["HTML list of comments..."]
  }
}
```

---

## Input Parameters Table

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mode` | string | Yes | Operation mode: `file_explainer`, `issue_solver`, `file`, or `issue`. |
| `url` | string | Yes | The GitHub URL. Must match the mode (File URL for file modes, Issue URL for issue modes). |
| `language` | string | No | Target language code for AI output (e.g., `en`, `fr`, `hi`). Default: `en`. |
| `includeFlowchart` | boolean | No | (File Explainer only) If true, generates a Mermaid.js flowchart. Default: `true`. |
| `includeSolutionPlan` | boolean | No | (Issue Solver only) If true, generates a solution plan. Default: `true`. |
| `useLingoTranslation` | boolean | No | If true, uses Lingo.dev for professional-grade translation. Default: `false`. |

---

## Environment Variables

This Actor requires the following environment variables. In the hosted version, these are pre-configured.

- `GROQ_API_KEY`: Required. API key for Groq (used for AI analysis).
- `LINGO_API_KEY`: Optional. API key for Lingo.dev (used if `useLingoTranslation` is true).
