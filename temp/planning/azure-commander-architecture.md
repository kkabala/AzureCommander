# AzureCommander (azc) - Architecture Plan

## 1. Overview

TypeScript CLI wrapper around Azure CLI commands + direct REST API for PR comments.

| Command | Implementation | Reason |
|---------|----------------|--------|
| `my-prs` | Wraps `az repos pr list` | Combines author + reviewer results |
| `pr-comments` | Direct REST API | `az repos pr thread` does not exist |

---

## 2. Prerequisites & Dependencies

```json
{
  "dependencies": {
    "commander": "^12.0.0",
    "chalk": "^5.3.0",
    "open": "^10.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "tsx": "^4.7.0"
  }
}
```

---

## 3. Project Structure

```
azure-commander/
├── src/
│   ├── index.ts
│   ├── commands/
│   │   └── pr/
│   │       ├── index.ts
│   │       ├── my-prs/
│   │       │   ├── my-prs.command.ts
│   │       │   └── my-prs.service.ts
│   │       └── comments/
│   │           ├── comments.command.ts
│   │           └── comments.service.ts
│   ├── services/
│   │   ├── azure-cli.service.ts
│   │   ├── azure-api.service.ts
│   │   └── config.service.ts
│   ├── formatters/
│   │   ├── pr-table.formatter.ts
│   │   └── comments.formatter.ts
│   └── types/
│       ├── pull-request.types.ts
│       └── comment.types.ts
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   ├── commands/
│   │   └── formatters/
│   └── integration/
├── tasks/
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

---

## 4. Edge Cases & Risk Mitigation

| Scenario | Handling |
|----------|----------|
| `az` not installed | Show install instructions |
| Not logged in | Show `az login` message |
| Extension missing | Show `az extension add` command |
| No org configured | Show `az devops configure` instructions |
| Token expired | Suggest `az login` |
| PR not found | Show "PR not found" |
| No comments | Show "No comments found" |

---

## 5. Testing Strategy

- **Unit tests:** Jest with mocked `az` calls and `fetch`
- **Integration tests:** Full CLI execution
- **Coverage target:** 80%+

---

## 6. MVP Commands

### `azc my-prs`
| Flag | Default | Description |
|------|---------|-------------|
| `-s, --status` | `active` | active, completed, abandoned, all |
| `-r, --repo` | - | Filter by repository |
| `-p, --project` | default | Project name |
| `--role` | `all` | all, author, reviewer |
| `-n, --top` | `50` | Max results |
| `-o, --output` | `table` | table, json |

### `azc pr-comments <PR_ID>`
| Flag | Default | Description |
|------|---------|-------------|
| `-p, --project` | from PR | Project name |
| `-r, --repo` | from PR | Repository name |
| `-o, --output` | `table` | table, json |
| `--chronological` | false | Flat timeline |
| `--open` | false | Open in browser |

---

## 7. Estimates

| Task | Time |
|------|------|
| Task 1 | 1h |
| Task 2 | 1h |
| Task 3 | 1h |
| Task 4 | 1h |
| Task 5 | 1.5h |
| Task 6 | 1.5h |
| Task 7 | 1h |
| Task 8 | 1h |
| **Total** | **~9h** |

---

## 8. TASKS

### Task 1: Project Setup
- Initialize npm project with TypeScript
- Configure package.json with dependencies
- Configure tsconfig.json for ESM
- Configure Jest for TypeScript
- Create folder structure

### Task 2: Type Definitions
- Create `src/types/pull-request.types.ts` with PullRequest, PullRequestFilters interfaces
- Create `src/types/comment.types.ts` with CommentThread, Comment interfaces

### Task 3: Azure CLI Service
- Create `src/services/azure-cli.service.ts`
- Implement `executeAzCommand<T>()` to run az commands and parse JSON
- Implement `getAzureDevOpsAccessToken()` to get bearer token
- Handle auth errors, extension errors gracefully
- Write unit tests

### Task 4: Config Service
- Create `src/services/config.service.ts`
- Implement `getOrganizationUrl()` to read org from env or az config
- Implement `getDefaultProject()` to read default project
- Write unit tests

### Task 5: My PRs Command
- Create `src/commands/pr/my-prs/my-prs.service.ts`
- Implement fetching PRs by creator, by reviewer, and merged/deduped
- Create `src/commands/pr/my-prs/my-prs.command.ts` with Commander.js
- Write unit tests for service

### Task 6: PR Comments Command
- Create `src/commands/pr/comments/comments.service.ts`
- Implement REST API call to fetch threads
- Create `src/commands/pr/comments/comments.command.ts` with Commander.js
- Implement `--open` flag to open browser
- Write unit tests for service

### Task 7: Formatters
- Create `src/formatters/pr-table.formatter.ts` for PR table output
- Create `src/formatters/comments.formatter.ts` for threaded/chronological output
- Write unit tests for formatters

### Task 8: CLI Entry Point & Integration
- Create `src/index.ts` as CLI entry
- Register all commands
- Create `src/commands/pr/index.ts` to group PR commands
- Write integration tests
- Create README.md
