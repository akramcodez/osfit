
export const MOCK_RESPONSES = {
  mentor: `### 👋 Rich Formatting Test

Here is a demonstration of the **new markdown capabilities**:

#### 1. Syntax Highlighting
\`\`\`typescript
const greeting = "Hello, World!";
function welcome(name: string) {
  return \`Welcome, \${name}!\`;
}
\`\`\`

#### 2. GitHub Flavored Tables
| Feature | Status | Priority |
| :--- | :---: | ---: |
| Syntax Highlighting | ✅ Ready | High |
| Tables | ✅ Ready | Medium |
| Task Lists | 🚧 Testing | Low |

#### 3. Task Lists
- [x] Install \`remark-gfm\`
- [x] Install \`rehype-highlight\`
- [ ] Verify in browser

> **Note:** This content is rendered using the new plugin stack. If you see highlighting and tables, it works!`,

  issue_solver: `### 🛠️ Mock Analysis: GitHub Issue

**Summary**: This is a sample analysis of a hypothetical issue. The real AI would inspect the provided URL.

**Technical Details**:
- **Framework**: Next.js / React
- **Problem**: Component re-rendering unnecessarily
- **Impact**: Performance degradation on input

**Suggested Approach**:
1. Memoize the component using \`React.memo\`.
2. Extract the state to a context or atomic state manager.
3. Verify with the React DevTools Profiler.

*(To test real analysis, ensure you are in production or disable mock mode.)*`,

  file_explainer: `### 📄 Mock File Explanation

**Purpose**: This is a simulated explanation of a code file.

**Key Components**:
- \`ExampleClass\`: Handles the main logic.
- \`processData()\`: Transforms raw input into formatted output.
- \`validate()\`: Ensures data integrity.

**Visual Guide**:
\`\`\`json
{
  "data": "sample",
  "valid": true
}
\`\`\`

*(Set \`USE_MOCK_AI=false\` in your environment to use real Gemini analysis.)*`

};

export const MOCK_TITLES = {
  mentor: "Open Source Mentor",
  issue_solver: "GitHub Issue Helper",
  file_explainer: "Code File Explainer"
};

