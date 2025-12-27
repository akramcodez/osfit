# Multilingual GitHub Scraper

A standalone, AI-powered Apify Actor designed to analyze GitHub repositories. It provides detailed file explanations, flowchart visualizations, and issue solution plans in multiple languages.

## Features

- **File Explainer**: Analyzes code files to explain their purpose, logic, and dependencies.
- **Flowchart Generation**: Automatically creates Mermaid.js flowcharts to visualize code logic.
- **Issue Solver**: Analyzes GitHub issues and related files to propose actionable solution plans.
- **Multilingual Support**: Supports output in over 20 languages (English, Spanish, French, Hindi, Bengali, etc.).
- **High-Quality Translation**: Optional integration with Lingo.dev for superior translation accuracy.
- **AI-Powered**: Utilizes the openai/gpt-oss-120b model via Groq for deep technical analysis.

## Modes

### 1. File Explainer (Default)
Analyzes a single source code file from a GitHub URL.

**Features:**
- Explains the purpose of the file.
- Lists key functions and components.
- Describes the logic flow.
- Generates a visual flowchart (Mermaid.js).

### 2. Issue Solver
Analyzes a GitHub issue and automatically fetches referenced files to provide a comprehensive solution.

**Features:**
- Summarizes the issue.
- Identifies and analyzes related files mentioned in the issue.
- Proposes a step-by-step solution plan.
- Suggests specific code modifications.

## Input Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `mode` | string | `file_explainer` | Operation mode. Options: `file_explainer`, `issue_solver`. |
| `url` | string | (Required) | Full URL to a GitHub file or issue. |
| `language` | string | `en` | Target language code (e.g., `es`, `fr`, `hi`, `bn`). |
| `includeFlowchart` | boolean | `true` | If true, generates a flowchart for file explanations. |
| `useLingoTranslation` | boolean | `false` | If true, uses Lingo.dev for enhanced translation quality. |

## Output Examples

### File Explainer Output
```json
{
  "success": true,
  "mode": "file_explainer",
  "file": {
    "path": "src/utils/math.js",
    "detectedLanguage": "javascript",
    "content": "..."
  },
  "explanation": "## File Purpose\nThis file handles mathematical operations...",
  "flowchart": "graph TD\nA[Start] --> B[Process]"
}
```

### Issue Solver Output
```json
{
  "success": true,
  "mode": "issue_solver",
  "issue": {
    "title": "Bug: Header crash",
    "state": "open",
    "number": 123
  },
  "issueExplanation": "## Issue Description\nThe header component crashes on mobile...",
  "solutionPlan": "## Solution Plan\n1. Open Header.tsx\n2. Fix the useEffect hook...",
  "relatedFiles": [...]
}
```

## Environment Variables

This Actor requires the following environment variables to function. These are pre-configured in the hosted version, but you must set them if running locally or forking the actor.

- `GROQ_API_KEY`: API key for Groq (required for AI analysis).
- `LINGO_API_KEY`: API key for Lingo.dev (optional, for enhanced translation).

## Usage via API

```bash
curl --request POST \
  --url https://api.apify.com/v2/acts/USERNAME~multilingual-github-scraper/run-sync-get-dataset-items \
  --header 'Content-Type: application/json' \
  --data '{
    "mode": "file_explainer",
    "url": "https://github.com/facebook/react/blob/main/packages/react/index.js",
    "language": "es"
  }'
```
