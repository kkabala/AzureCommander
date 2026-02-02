# Task 8: CLI Entry Point & Integration

## Objective
Create the main CLI entry point that ties all commands together, providing a cohesive command-line interface. This task completes the end-to-end implementation with integration tests, documentation, and final polish.

## Files to Create/Modify
- `src/index.ts`
- `src/commands/pr/index.ts`
- `README.md`
- `tests/integration/cli.test.ts`
- `package.json` (add bin configuration)

## Implementation Details

### 1. Create PR Commands Index
Create `src/commands/pr/index.ts`:
```typescript
import { Command } from 'commander';
import { createMyPRsCommand } from './my-prs/my-prs.command.js';
import { createPRCommentsCommand } from './comments/comments.command.js';

/**
 * Create the PR command group
 */
export function createPRCommand(): Command {
  const command = new Command('pr');
  
  command
    .description('Pull request commands')
    .addCommand(createMyPRsCommand())
    .addCommand(createPRCommentsCommand());

  return command;
}
```

### 2. Create Main CLI Entry Point
Create `src/index.ts`:
```typescript
#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createMyPRsCommand } from './commands/pr/my-prs/my-prs.command.js';
import { createPRCommentsCommand } from './commands/pr/comments/comments.command.js';

// Get package.json for version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

/**
 * Main CLI program
 */
const program = new Command();

program
  .name('azc')
  .description('Azure Commander - TypeScript CLI wrapper for Azure DevOps')
  .version(packageJson.version);

// Add commands directly (flat structure for MVP)
program.addCommand(createMyPRsCommand());
program.addCommand(createPRCommentsCommand());

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
```

### 3. Update package.json
Update the `package.json` to include the bin configuration:
```json
{
  "name": "azure-commander",
  "version": "0.1.0",
  "description": "TypeScript CLI wrapper around Azure CLI commands",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "azc": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest --testPathPattern=integration",
    "lint": "tsc --noEmit",
    "prepublishOnly": "npm run build",
    "link:local": "npm run build && npm link"
  },
  "keywords": ["azure", "cli", "devops", "pull-request"],
  "author": "",
  "license": "MIT",
  "engines": {
    "node": ">=18.0.0"
  },
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

### 4. Create Integration Tests
Create `tests/integration/cli.test.ts`:
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('CLI Integration Tests', () => {
  const CLI_PATH = './dist/index.js';

  beforeAll(async () => {
    // Ensure the project is built
    try {
      await execAsync('npm run build');
    } catch (error) {
      console.error('Failed to build project:', error);
      throw error;
    }
  });

  describe('Help Output', () => {
    it('should display help when run without arguments', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH}`);
      expect(stdout).toContain('Azure Commander');
      expect(stdout).toContain('Usage:');
    });

    it('should display version', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} --version`);
      expect(stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should display help with --help flag', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} --help`);
      expect(stdout).toContain('Azure Commander');
      expect(stdout).toContain('my-prs');
      expect(stdout).toContain('pr-comments');
    });
  });

  describe('my-prs Command', () => {
    it('should display help for my-prs command', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} my-prs --help`);
      expect(stdout).toContain('my-prs');
      expect(stdout).toContain('author or reviewer');
      expect(stdout).toContain('--status');
      expect(stdout).toContain('--role');
      expect(stdout).toContain('--output');
    });

    it('should accept valid options', async () => {
      // This will fail if Azure CLI is not configured, but we're testing argument parsing
      const command = `node ${CLI_PATH} my-prs --status active --role all --top 10 --output json`;
      
      try {
        await execAsync(command);
      } catch (error: any) {
        // Command might fail due to Azure CLI not being configured in test environment
        // We're mainly testing that the command accepts the arguments
        // Error should be about Azure CLI, not about invalid arguments
        expect(error.message).not.toContain('Invalid');
      }
    });

    it('should reject invalid status', async () => {
      try {
        await execAsync(`node ${CLI_PATH} my-prs --status invalid`);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Invalid status');
      }
    });

    it('should reject invalid role', async () => {
      try {
        await execAsync(`node ${CLI_PATH} my-prs --role invalid`);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Invalid role');
      }
    });

    it('should reject invalid output format', async () => {
      try {
        await execAsync(`node ${CLI_PATH} my-prs --output invalid`);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Invalid output format');
      }
    });
  });

  describe('pr-comments Command', () => {
    it('should display help for pr-comments command', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} pr-comments --help`);
      expect(stdout).toContain('pr-comments');
      expect(stdout).toContain('comments');
      expect(stdout).toContain('<pr-id>');
      expect(stdout).toContain('--output');
      expect(stdout).toContain('--chronological');
      expect(stdout).toContain('--open');
    });

    it('should require PR ID argument', async () => {
      try {
        await execAsync(`node ${CLI_PATH} pr-comments`);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('error: missing required argument');
      }
    });

    it('should reject invalid PR ID', async () => {
      try {
        await execAsync(`node ${CLI_PATH} pr-comments abc`);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Invalid pull request ID');
      }
    });

    it('should reject negative PR ID', async () => {
      try {
        await execAsync(`node ${CLI_PATH} pr-comments -5`);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Invalid pull request ID');
      }
    });

    it('should accept valid PR ID and options', async () => {
      const command = `node ${CLI_PATH} pr-comments 123 --output json --chronological`;
      
      try {
        await execAsync(command);
      } catch (error: any) {
        // Command might fail due to PR not found, but we're testing argument parsing
        // Error should not be about invalid arguments
        expect(error.message).not.toContain('Invalid');
      }
    });

    it('should reject invalid output format', async () => {
      try {
        await execAsync(`node ${CLI_PATH} pr-comments 123 --output invalid`);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Invalid output format');
      }
    });
  });
});
```

### 5. Create README
Create `README.md`:
```markdown
# Azure Commander (azc)

TypeScript CLI wrapper around Azure CLI commands for Azure DevOps, providing enhanced functionality and better user experience.

## Features

- 🔍 **my-prs** - List pull requests where you are the author or reviewer
- 💬 **pr-comments** - Display comments for a specific pull request with threading
- 🎨 **Beautiful Output** - Color-coded tables with intuitive formatting
- 🚀 **Fast** - Leverages Azure CLI and direct REST API calls
- 🔒 **Secure** - Uses your existing Azure CLI authentication

## Prerequisites

- Node.js >= 18.0.0
- [Azure CLI](https://aka.ms/install-azure-cli) installed and configured
- Azure DevOps extension: `az extension add --name azure-devops`
- Authenticated: `az login`
- Organization configured: `az devops configure --defaults organization=https://dev.azure.com/YOUR_ORG`

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/yourusername/azure-commander.git
cd azure-commander

# Install dependencies
npm install

# Build the project
npm run build

# Link locally for development
npm link
```

### Global Installation (when published)

```bash
npm install -g azure-commander
```

## Usage

### List My Pull Requests

```bash
# List all active PRs where you are author or reviewer
azc my-prs

# List only PRs you created
azc my-prs --role author

# List only PRs you're reviewing
azc my-prs --role reviewer

# List completed PRs
azc my-prs --status completed

# Filter by repository
azc my-prs --repo my-repository

# Limit results
azc my-prs --top 10

# JSON output
azc my-prs --output json
```

#### my-prs Options

| Option | Alias | Default | Description |
|--------|-------|---------|-------------|
| `--status <status>` | `-s` | `active` | Filter by status: active, completed, abandoned, all |
| `--repo <repository>` | `-r` | - | Filter by repository name |
| `--project <project>` | `-p` | default | Project name |
| `--role <role>` | - | `all` | Filter by role: all, author, reviewer |
| `--top <number>` | `-n` | `50` | Maximum number of results |
| `--output <format>` | `-o` | `table` | Output format: table, json |

### View PR Comments

```bash
# Display comments for a pull request
azc pr-comments 123

# Display comments in chronological order (flat view)
azc pr-comments 123 --chronological

# Open PR in browser
azc pr-comments 123 --open

# Specify project and repository
azc pr-comments 123 --project MyProject --repo my-repo

# JSON output
azc pr-comments 123 --output json
```

#### pr-comments Options

| Option | Alias | Default | Description |
|--------|-------|---------|-------------|
| `--project <project>` | `-p` | from PR | Project name |
| `--repo <repository>` | `-r` | from PR | Repository name |
| `--output <format>` | `-o` | `table` | Output format: table, json |
| `--chronological` | - | `false` | Display comments in chronological order (flat view) |
| `--open` | - | `false` | Open the pull request in browser |

## Configuration

Azure Commander uses your existing Azure CLI configuration. You can also set environment variables:

```bash
# Set organization URL
export AZURE_DEVOPS_ORG_URL=https://dev.azure.com/YOUR_ORG

# Set default project
export AZURE_DEVOPS_PROJECT=YOUR_PROJECT
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev my-prs

# Run tests
npm test

# Run tests with coverage
npm test:coverage

# Run integration tests
npm test:integration

# Type checking
npm run lint

# Build
npm run build
```

## Project Structure

```
azure-commander/
├── src/
│   ├── index.ts                    # CLI entry point
│   ├── commands/
│   │   └── pr/
│   │       ├── my-prs/
│   │       │   ├── my-prs.command.ts
│   │       │   └── my-prs.service.ts
│   │       └── comments/
│   │           ├── comments.command.ts
│   │           └── comments.service.ts
│   ├── services/
│   │   ├── azure-cli.service.ts    # Azure CLI wrapper
│   │   ├── azure-api.service.ts    # REST API client
│   │   └── config.service.ts       # Configuration management
│   ├── formatters/
│   │   ├── pr-table.formatter.ts   # PR table formatter
│   │   └── comments.formatter.ts   # Comments formatter
│   └── types/
│       ├── pull-request.types.ts
│       └── comment.types.ts
├── tests/
│   ├── unit/
│   └── integration/
└── tasks/                           # Development tasks
```

## Testing Strategy

- **Unit Tests**: Jest with mocked Azure CLI calls and fetch
- **Integration Tests**: Full CLI execution tests
- **Coverage Target**: 80%+

## Why Azure Commander?

While Azure CLI provides basic functionality, Azure Commander enhances the experience:

1. **Combined Views**: `my-prs` combines author and reviewer PRs in one command
2. **Better Formatting**: Color-coded tables with relative timestamps
3. **Missing Features**: PR comments API (`az repos pr thread` doesn't exist)
4. **Enhanced UX**: Threaded comment display, browser integration, intuitive defaults

## Troubleshooting

### Azure CLI Not Installed

```bash
# Install Azure CLI
# macOS
brew install azure-cli

# Windows
winget install -e --id Microsoft.AzureCLI

# Linux
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

### Not Authenticated

```bash
az login
```

### Azure DevOps Extension Missing

```bash
az extension add --name azure-devops
```

### Organization Not Configured

```bash
az devops configure --defaults organization=https://dev.azure.com/YOUR_ORG
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Roadmap

- [ ] Add PR creation command
- [ ] Add PR update/close commands
- [ ] Add comment posting
- [ ] Add work item integration
- [ ] Add pipeline status
- [ ] Add caching for better performance
- [ ] Add shell completions
```

### 6. Create Integration Test Directory
```bash
mkdir -p tests/integration
```

## Dependencies
- Task 1: Project Setup
- Task 5: My PRs Command
- Task 6: PR Comments Command
- Task 7: Formatters

## Acceptance Criteria
- [ ] Main CLI entry point is created with shebang
- [ ] CLI displays help when run without arguments
- [ ] CLI displays version with --version flag
- [ ] CLI displays help with --help flag
- [ ] All commands are registered and accessible
- [ ] package.json bin configuration points to dist/index.js
- [ ] README provides comprehensive documentation
- [ ] README includes installation instructions
- [ ] README includes usage examples for all commands
- [ ] README includes troubleshooting section
- [ ] Integration tests pass for CLI invocation
- [ ] Integration tests verify help output
- [ ] Integration tests verify argument validation
- [ ] Project builds successfully with npm run build
- [ ] CLI can be linked locally with npm link
- [ ] All unit and integration tests pass
- [ ] Test coverage is 80%+ overall
- [ ] TypeScript compiles without errors

## Test Cases
- **Test Case 1: CLI Help Output**
  - Run `azc` without arguments
  - Expected: Displays help with available commands
  
- **Test Case 2: Version Display**
  - Run `azc --version`
  - Expected: Displays version from package.json
  
- **Test Case 3: Command Help**
  - Run `azc my-prs --help`
  - Run `azc pr-comments --help`
  - Expected: Displays command-specific help
  
- **Test Case 4: my-prs Argument Validation**
  - Test with invalid --status value
  - Test with invalid --role value
  - Test with invalid --output value
  - Expected: Shows error message and exits
  
- **Test Case 5: pr-comments Argument Validation**
  - Test without PR ID
  - Test with invalid PR ID (non-numeric)
  - Test with negative PR ID
  - Test with invalid --output value
  - Expected: Shows error message and exits
  
- **Test Case 6: Build Process**
  - Run `npm run build`
  - Expected: Creates dist/ directory with compiled JavaScript
  
- **Test Case 7: Local Linking**
  - Run `npm run link:local`
  - Run `azc --help`
  - Expected: CLI is accessible globally as `azc`
  
- **Test Case 8: Full Integration**
  - Build project
  - Run my-prs command (if Azure CLI configured)
  - Run pr-comments command (if Azure CLI configured and PR exists)
  - Expected: Commands execute successfully with formatted output
  
- **Test Case 9: Test Coverage**
  - Run `npm run test:coverage`
  - Expected: Overall coverage is 80%+ for all metrics

## Manual Testing Checklist

After completing this task, perform manual testing:

1. **Build and Link**
   ```bash
   npm run build
   npm link
   ```

2. **Test Help**
   ```bash
   azc
   azc --help
   azc --version
   azc my-prs --help
   azc pr-comments --help
   ```

3. **Test my-prs** (requires Azure CLI configured)
   ```bash
   azc my-prs
   azc my-prs --role author
   azc my-prs --role reviewer
   azc my-prs --status all
   azc my-prs --output json
   ```

4. **Test pr-comments** (requires Azure CLI configured and valid PR)
   ```bash
   azc pr-comments <PR_ID>
   azc pr-comments <PR_ID> --chronological
   azc pr-comments <PR_ID> --open
   azc pr-comments <PR_ID> --output json
   ```

5. **Test Error Handling**
   ```bash
   azc my-prs --status invalid
   azc pr-comments
   azc pr-comments abc
   ```

6. **Verify Output Formatting**
   - Check that tables are properly formatted
   - Check that colors are displayed correctly
   - Check that relative times are accurate
   - Check that all information is readable

7. **Run All Tests**
   ```bash
   npm test
   npm run test:coverage
   npm run test:integration
   ```
