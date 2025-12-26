
export const MOCK_RESPONSES = {
  mentor: `## Open Source Mentor

Welcome! I'm here to guide you through the open source world.

### Getting Started with Open Source

**Step 1: Find Your First Project**
\`\`\`bash
# Search for beginner-friendly issues
gh search issues --label "good first issue" --language javascript
\`\`\`

**Step 2: Understand the Contribution Workflow**
| Step | Command | Description |
| :--- | :--- | :--- |
| Fork | Click "Fork" on GitHub | Create your copy |
| Clone | \`git clone <url>\` | Download locally |
| Branch | \`git checkout -b fix/issue-123\` | Create feature branch |
| Commit | \`git commit -m "fix: resolve issue"\` | Save changes |
| Push | \`git push origin fix/issue-123\` | Upload to GitHub |
| PR | Click "New Pull Request" | Submit for review |

### Best Practices
- Read the CONTRIBUTING.md first
- Follow the project's code style
- Write tests for your changes
- Update documentation if needed

> **Pro Tip:** Start with documentation fixes or small bugs - they're great for learning the codebase!`,

  issue_solver: `## Issue Summary

| Field | Value |
| :--- | :--- |
| Repository | example/project |
| Issue # | #123 |
| Type | Bug Fix |
| Difficulty | Medium |

---

## Technical Details

The issue describes a **memory leak** in the React component lifecycle:

\`\`\`typescript
// Problem: Missing cleanup
useEffect(() => {
  const interval = setInterval(fetchData, 1000);
  // No cleanup! Memory leak!
}, []);

// Solution: Add cleanup function
useEffect(() => {
  const interval = setInterval(fetchData, 1000);
  return () => clearInterval(interval); // Cleanup
}, []);
\`\`\`

---

## Suggested Approach

1. **Locate the file**: \`src/components/DataFetcher.tsx\`
2. **Find the useEffect** on line ~45
3. **Add the cleanup function** as shown above
4. **Test**: Run \`npm test\` to verify

### Checklist
- Fork the repository
- Create branch \`fix/cleanup-interval-123\`
- Apply the fix
- Run tests locally
- Submit PR referencing issue #123

> **Estimated Time:** 15-30 minutes for a first-time contributor`,

  file_explainer: `## File Purpose

API communication layer providing type-safe HTTP requests.

| Property | Value |
| :--- | :--- |
| Path | \`src/utils/api-client.ts\` |
| Language | TypeScript |
| Lines | 156 |

---

## Key Functions/Components

- **createClient()** - Returns configured Axios instance
- **get\<T\>()** - GET request with type safety
- **post\<T\>()** - POST request with body
- **handleError()** - Centralized error handling

---

## Logic Flow

1. \`createClient()\` initializes Axios with config
2. Request methods wrap Axios calls with generics
3. Errors caught and transformed by \`handleError()\`

\`\`\`typescript
export function createClient(baseURL: string) {
  return axios.create({
    baseURL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' }
  });
}
\`\`\`

---

## Dependencies

- \`axios\` - HTTP client
- \`zod\` - Runtime type validation
- Custom error types from \`./errors.ts\`

> **Note:** This file follows the Repository Pattern for clean API abstraction.`

};

export const MOCK_TITLES = {
  mentor: "Open Source Mentor",
  issue_solver: "GitHub Issue Helper",
  file_explainer: "Code File Explainer"
};
