# Azure Commander - Task Overview

This document provides an overview of all tasks for implementing the Azure Commander CLI tool.

## Task Summary

| Task | Title | Estimated Time | Dependencies |
|------|-------|----------------|--------------|
| 1 | Project Setup & Foundation | 1h | None |
| 2 | Type Definitions | 1h | Task 1 |
| 3 | Azure CLI Service | 1h | Tasks 1, 2 |
| 4 | Config Service | 1h | Tasks 1, 3 |
| 5 | My PRs Command | 1.5h | Tasks 1-4 |
| 6 | PR Comments Command | 1.5h | Tasks 1-4 |
| 7 | Formatters | 1h | Tasks 1, 2, 5, 6 |
| 8 | CLI Entry Point & Integration | 1h | Tasks 1, 5, 6, 7 |
| **Total** | | **~9h** | |

## Task Files

All detailed task files are located in the `tasks/` directory:

- `task-01.md` - Project Setup & Foundation
- `task-02.md` - Type Definitions
- `task-03.md` - Azure CLI Service
- `task-04.md` - Config Service
- `task-05.md` - My PRs Command
- `task-06.md` - PR Comments Command
- `task-07.md` - Formatters
- `task-08.md` - CLI Entry Point & Integration

## Implementation Approach: Tracer Bullet

Each task follows the **Tracer Bullet** methodology:

1. **End-to-End Slice**: Each task creates a working vertical slice through the system
2. **Incremental**: Tasks build on previous tasks progressively
3. **Testable**: Each task includes comprehensive tests with 80%+ coverage target
4. **Immediate Feedback**: Each task produces visible, working functionality

## Key Features

### Commands

1. **my-prs** - List pull requests where you are author or reviewer
   - Combines results from multiple Azure CLI calls
   - Deduplicates PRs
   - Supports filtering by status, role, repository
   - Beautiful table output with colors

2. **pr-comments** - Display comments for a specific pull request
   - Uses REST API (az repos pr thread doesn't exist)
   - Supports threaded and chronological views
   - Shows file context and line numbers
   - Can open PR in browser

### Architecture Highlights

- **Service Layer**: Separate services for Azure CLI, REST API, and configuration
- **Command Pattern**: Each command has a command file (CLI interface) and service file (business logic)
- **Formatters**: Dedicated formatters for clean separation of concerns
- **Type Safety**: Comprehensive TypeScript types for all data structures
- **Error Handling**: Graceful error handling with helpful messages
- **Testing**: Unit tests for all services, commands, and formatters; integration tests for CLI

## Testing Strategy

### Unit Tests (80%+ Coverage Target)
- Services: Mock Azure CLI and fetch calls
- Commands: Test argument parsing and validation
- Formatters: Test output formatting with various inputs

### Integration Tests
- CLI invocation and help output
- Argument validation
- End-to-end command execution (when Azure CLI is configured)

## Development Workflow

### Sequential Execution
Tasks should be executed in order (1 → 2 → 3 → 4 → 5 → 6 → 7 → 8) due to dependencies.

### Test-Driven Development
Each task includes:
1. Implementation details with code snippets
2. Comprehensive test cases
3. Acceptance criteria with test coverage requirements
4. Clear success metrics

### Verification
After each task:
1. Run `npm test` to ensure all tests pass
2. Run `npm run lint` to check for TypeScript errors
3. Verify acceptance criteria are met
4. Manually test new functionality (where applicable)

## Tech Stack

### Dependencies
- **commander** (^12.0.0) - CLI framework
- **chalk** (^5.3.0) - Terminal colors
- **open** (^10.0.0) - Open URLs in browser

### Dev Dependencies
- **typescript** (^5.3.0) - Type safety
- **jest** (^29.0.0) - Testing framework
- **ts-jest** (^29.0.0) - TypeScript support for Jest
- **tsx** (^4.7.0) - TypeScript execution

## Project Structure

```
azure-commander/
├── src/
│   ├── index.ts                       # CLI entry point
│   ├── commands/
│   │   └── pr/
│   │       ├── my-prs/
│   │       │   ├── my-prs.command.ts  # Commander.js CLI definition
│   │       │   └── my-prs.service.ts  # Business logic
│   │       └── comments/
│   │           ├── comments.command.ts
│   │           └── comments.service.ts
│   ├── services/
│   │   ├── azure-cli.service.ts       # Azure CLI wrapper
│   │   ├── azure-api.service.ts       # REST API client
│   │   └── config.service.ts          # Configuration
│   ├── formatters/
│   │   ├── pr-table.formatter.ts      # PR output formatting
│   │   └── comments.formatter.ts      # Comments output formatting
│   └── types/
│       ├── pull-request.types.ts      # PR type definitions
│       └── comment.types.ts           # Comment type definitions
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   ├── commands/
│   │   └── formatters/
│   └── integration/
│       └── cli.test.ts
├── tasks/                              # Task files (this directory)
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## Success Criteria

The project is complete when:

- ✅ All 8 tasks are implemented
- ✅ All unit tests pass with 80%+ coverage
- ✅ All integration tests pass
- ✅ TypeScript compiles without errors
- ✅ CLI can be linked locally and executed
- ✅ Both commands (my-prs, pr-comments) work end-to-end
- ✅ Output is beautifully formatted with colors
- ✅ Error handling is comprehensive and user-friendly
- ✅ README provides complete documentation

## Getting Started

1. Start with Task 1 (Project Setup)
2. Follow tasks sequentially
3. Run tests after each task
4. Verify acceptance criteria
5. Move to next task

Good luck! 🚀
