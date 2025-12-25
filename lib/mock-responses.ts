
export const MOCK_RESPONSES = {
  mentor: `### 👋 Open Source Mentor

Welcome! I'm here to guide you through the open source world.

#### Getting Started with Open Source

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

#### Best Practices
- [x] Read the CONTRIBUTING.md first
- [x] Follow the project's code style
- [ ] Write tests for your changes
- [ ] Update documentation if needed

> **Pro Tip:** Start with documentation fixes or small bugs - they're great for learning the codebase!`,

  issue_solver: `### 🔧 GitHub Issue Analysis

**Issue Summary**
| Field | Value |
| :--- | :--- |
| Repository | example/project |
| Issue # | #123 |
| Type | Bug Fix |
| Difficulty | Medium |

---

#### Problem Analysis

The issue describes a **memory leak** in the React component lifecycle:

\`\`\`typescript
// ❌ Problem: Missing cleanup
useEffect(() => {
  const interval = setInterval(fetchData, 1000);
  // No cleanup! Memory leak!
}, []);

// ✅ Solution: Add cleanup function
useEffect(() => {
  const interval = setInterval(fetchData, 1000);
  return () => clearInterval(interval); // Cleanup
}, []);
\`\`\`

---

#### Recommended Fix

1. **Locate the file**: \`src/components/DataFetcher.tsx\`
2. **Find the useEffect** on line ~45
3. **Add the cleanup function** as shown above
4. **Test**: Run \`npm test\` to verify

#### Checklist
- [ ] Fork the repository
- [ ] Create branch \`fix/cleanup-interval-123\`
- [ ] Apply the fix
- [ ] Run tests locally
- [ ] Submit PR referencing issue #123

> **Estimated Time:** 15-30 minutes for a first-time contributor`,

  file_explainer: `### 📂 Code File Explanation

**File Overview**
| Property | Value |
| :--- | :--- |
| Path | \`src/utils/api-client.ts\` |
| Language | TypeScript |
| Lines | 156 |
| Purpose | API communication layer |

---

#### Architecture Diagram

\`\`\`
┌─────────────────────────────────────────────┐
│              API Client                      │
├─────────────────────────────────────────────┤
│  ├── createClient(config)                   │
│  │     └── Returns configured Axios instance│
│  ├── get<T>(url, params?)                   │
│  │     └── GET request with type safety     │
│  ├── post<T>(url, data)                     │
│  │     └── POST request with body           │
│  └── handleError(error)                      │
│        └── Centralized error handling        │
└─────────────────────────────────────────────┘
\`\`\`

---

#### Key Functions

**1. \`createClient()\`**
\`\`\`typescript
export function createClient(baseURL: string) {
  return axios.create({
    baseURL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' }
  });
}
\`\`\`

**2. Type-Safe Requests**
\`\`\`typescript
async function get<T>(url: string): Promise<T> {
  const { data } = await client.get<T>(url);
  return data;
}
\`\`\`

---

#### Dependencies
- \`axios\` - HTTP client
- \`zod\` - Runtime type validation
- Custom error types from \`./errors.ts\`

> **Best Practice:** This file follows the **Repository Pattern** for clean API abstraction.`

};

export const MOCK_TITLES = {
  mentor: "Open Source Mentor",
  issue_solver: "GitHub Issue Helper",
  file_explainer: "Code File Explainer"
};
