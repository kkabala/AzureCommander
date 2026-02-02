# Implementation Guide - Azure Commander

This guide helps you understand and execute the 8 tasks to build Azure Commander.

## Quick Start

1. **Read the Architecture Plan**: `temp/planning/azure-commander-architecture.md`
2. **Review Task Overview**: `tasks/README.md`
3. **Execute Tasks Sequentially**: Start with `task-01.md` and proceed in order

## What Each Task Delivers

### Task 1: Project Setup (1h)
**Deliverable**: Working TypeScript project with Jest configured
- npm project with all dependencies
- TypeScript configuration for ESM
- Jest configuration for TypeScript
- Folder structure
- Initial test that passes

**Verification**: `npm test` passes, `npm run lint` shows no errors

---

### Task 2: Type Definitions (1h)
**Deliverable**: Complete TypeScript type system
- PullRequest types with enums for status, role, vote
- Comment types with thread and comment structures
- 100% test coverage for type verification

**Verification**: Types compile, all enum values correct, tests pass

---

### Task 3: Azure CLI Service (1h)
**Deliverable**: Service that executes Azure CLI commands
- Execute az commands with error handling
- Detect CLI installation, authentication, extensions
- Get access tokens for REST API
- Custom error types with helpful messages

**Verification**: Tests mock Azure CLI calls, 80%+ coverage

---

### Task 4: Config Service (1h)
**Deliverable**: Configuration management service
- Read org URL from env or Azure CLI config
- Read default project
- Build API URLs
- Cache configuration
- Validate configuration

**Verification**: Tests verify env priority, caching, URL building

---

### Task 5: My PRs Command (1.5h)
**Deliverable**: Working `azc my-prs` command
- Fetch PRs by author and reviewer
- Combine and deduplicate results
- Filter by status, role, repo
- Sort by date
- Command-line interface with options
- JSON and simple table output

**Verification**: Command executes, tests cover service logic

---

### Task 6: PR Comments Command (1.5h)
**Deliverable**: Working `azc pr-comments` command
- REST API service for authenticated calls
- Fetch PR details via Azure CLI
- Fetch comment threads via REST API
- Filter deleted threads
- Sort chronologically
- Open in browser with --open flag
- JSON and simple output

**Verification**: Command executes, REST API calls work, tests pass

---

### Task 7: Formatters (1h)
**Deliverable**: Beautiful, colorful table formatters
- PR table formatter with colors, status, votes
- Comments formatter with threading
- Chronological comment view
- Relative time display (e.g., "2 days ago")
- Update commands to use formatters

**Verification**: Output looks professional with colors and formatting

---

### Task 8: CLI Entry Point & Integration (1h)
**Deliverable**: Complete, working CLI tool
- Main CLI entry point with commander
- All commands registered
- Integration tests
- Comprehensive README
- Package.json bin configuration
- Local linking support

**Verification**: `azc --help` works, all commands accessible, integration tests pass

---

## Testing Strategy Per Task

### Unit Tests (Tasks 2-7)
- Mock external dependencies (Azure CLI, fetch)
- Test business logic in isolation
- Test error handling
- Target: 80%+ coverage per file

### Integration Tests (Task 8)
- Test CLI invocation
- Test argument parsing and validation
- Test help output
- Test error messages

---

## Code Structure Pattern

Each feature follows this pattern:

```
Feature/
├── feature.service.ts    # Business logic, testable
├── feature.command.ts    # CLI interface, commander.js
└── tests/
    └── feature.service.test.ts
```

**Service**: Pure business logic, dependency injection, no CLI concerns
**Command**: CLI interface, argument parsing, calls service, handles output

---

## Common Patterns

### Service Pattern
```typescript
export class MyService {
  constructor(
    private dependency?: Dependency
  ) {
    this.dependency = dependency || new Dependency();
  }
  
  async doSomething(): Promise<Result> {
    // Business logic here
  }
}
```

### Command Pattern
```typescript
export function createMyCommand(): Command {
  const command = new Command('my-command');
  
  command
    .description('Description')
    .option('-f, --flag <value>', 'Description', 'default')
    .action(async (options) => {
      // Parse options
      // Create service
      // Execute logic
      // Format output
    });
    
  return command;
}
```

### Test Pattern
```typescript
describe('MyService', () => {
  let service: MyService;
  let mockDependency: jest.Mocked<Dependency>;
  
  beforeEach(() => {
    mockDependency = { method: jest.fn() } as any;
    service = new MyService(mockDependency);
  });
  
  it('should do something', async () => {
    mockDependency.method.mockResolvedValue('result');
    const result = await service.doSomething();
    expect(result).toBe('expected');
  });
});
```

---

## Key Implementation Details

### ESM Modules
- Use `.js` extensions in imports (even for `.ts` files)
- Configure tsconfig.json with `"module": "ES2022"`
- Configure Jest for ESM support

### Error Handling
- Custom error classes for each scenario
- Helpful error messages with next steps
- Graceful degradation where possible

### Dependency Injection
- All services accept optional dependencies in constructor
- Makes testing easy with mocks
- Allows composition

### Caching
- Config service caches Azure CLI configuration
- Azure API service caches access token
- Clear cache methods for testing

---

## Quality Checklist

After completing all tasks, verify:

- [ ] All tests pass (`npm test`)
- [ ] Coverage is 80%+ (`npm run test:coverage`)
- [ ] TypeScript compiles without errors (`npm run lint`)
- [ ] CLI builds successfully (`npm run build`)
- [ ] CLI can be linked locally (`npm link`)
- [ ] Help output is clear (`azc --help`)
- [ ] Commands work end-to-end (if Azure CLI configured)
- [ ] Error messages are helpful
- [ ] Output is beautifully formatted with colors
- [ ] README is comprehensive and accurate

---

## Troubleshooting

### Tests Failing
- Check mock implementations match actual behavior
- Verify ESM imports use `.js` extension
- Ensure Jest configuration is correct for ESM

### TypeScript Errors
- Check all imports have `.js` extension
- Verify tsconfig.json is correctly configured
- Check type definitions are exported

### CLI Not Working
- Run `npm run build` to compile TypeScript
- Check dist/ directory exists with compiled files
- Verify package.json bin points to correct file
- Check shebang line in index.ts: `#!/usr/bin/env node`

### Integration Tests Failing
- Ensure project builds before running integration tests
- Check that test commands use correct path to CLI
- Verify error messages match expected patterns

---

## Tips for Success

1. **Follow Sequential Order**: Dependencies matter, don't skip ahead
2. **Run Tests Frequently**: After each major change, run `npm test`
3. **Read Test Cases**: They clarify expected behavior
4. **Use Code Snippets**: Task files include implementation examples
5. **Check Acceptance Criteria**: Clear definition of "done"
6. **Manual Testing**: Try commands manually after Task 5, 6, 7, 8
7. **Commit After Each Task**: Track progress with git

---

## Time Management

- **Tasks 1-4**: Foundation (4 hours) - Essential infrastructure
- **Tasks 5-6**: Core Features (3 hours) - Main functionality
- **Task 7**: Polish (1 hour) - User experience
- **Task 8**: Integration (1 hour) - Final assembly

**Total**: ~9 hours for complete implementation

---

## Next Steps After Completion

1. **Publish to npm**: Make it globally available
2. **Add Shell Completions**: bash/zsh completion scripts
3. **Add More Commands**: PR creation, updates, work items
4. **Performance**: Add caching layer
5. **CI/CD**: GitHub Actions for testing and publishing

---

## Questions?

Each task file (`task-01.md` through `task-08.md`) includes:
- Detailed implementation steps
- Complete code examples
- Test cases with expectations
- Acceptance criteria
- Verification steps

Start with Task 1 and work through sequentially. Good luck! 🚀
