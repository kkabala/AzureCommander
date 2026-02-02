# Task 5: My PRs Command

## Objective
Create the `my-prs` command that fetches pull requests where the user is either the author or reviewer. This command combines results from multiple Azure CLI calls, deduplicates them, and provides a thin end-to-end slice from CLI input to formatted output.

## Files to Create/Modify
- `src/commands/pr/my-prs/my-prs.service.ts`
- `src/commands/pr/my-prs/my-prs.command.ts`
- `tests/unit/commands/pr/my-prs/my-prs.service.test.ts`
- `tests/unit/commands/pr/my-prs/my-prs.command.test.ts`

## Implementation Details

### 1. Create My PRs Service
Create `src/commands/pr/my-prs/my-prs.service.ts`:
```typescript
import { AzureCliService } from '../../../services/azure-cli.service.js';
import { ConfigService } from '../../../services/config.service.js';
import {
  PullRequest,
  PullRequestFilters,
  PullRequestRole,
  PullRequestStatus,
  MyPRsOptions,
} from '../../../types/pull-request.types.js';

/**
 * Service for fetching user's Pull Requests
 */
export class MyPRsService {
  private azureCliService: AzureCliService;
  private configService: ConfigService;

  constructor(
    azureCliService?: AzureCliService,
    configService?: ConfigService
  ) {
    this.azureCliService = azureCliService || new AzureCliService();
    this.configService = configService || new ConfigService(this.azureCliService);
  }

  /**
   * Get current user's ID from Azure CLI
   */
  private async getCurrentUserId(): Promise<string> {
    const account = await this.azureCliService.executeAzCommand<any>(
      'az ad signed-in-user show --query id --output json'
    );
    return account;
  }

  /**
   * Fetch PRs created by the current user
   */
  async fetchMyCreatedPRs(options: MyPRsOptions): Promise<PullRequest[]> {
    const filters = this.buildFilters(options);
    const filterArgs = this.buildFilterArgs(filters);

    const command = `az repos pr list --creator $USER_ID ${filterArgs} --output json`;
    
    try {
      const prs = await this.azureCliService.executeAzCommand<PullRequest[]>(
        command.replace('$USER_ID', '@me')
      );
      return prs || [];
    } catch (error) {
      console.error('Failed to fetch created PRs:', error);
      return [];
    }
  }

  /**
   * Fetch PRs where the current user is a reviewer
   */
  async fetchMyReviewPRs(options: MyPRsOptions): Promise<PullRequest[]> {
    const filters = this.buildFilters(options);
    const filterArgs = this.buildFilterArgs(filters);

    // Azure CLI doesn't have a --reviewer flag, so we fetch all PRs and filter
    const command = `az repos pr list ${filterArgs} --output json`;
    
    try {
      const allPrs = await this.azureCliService.executeAzCommand<PullRequest[]>(command);
      
      if (!allPrs || allPrs.length === 0) {
        return [];
      }

      // Get current user ID to filter PRs where user is reviewer
      const userId = await this.getCurrentUserId();
      
      return allPrs.filter(pr => 
        pr.reviewers.some(reviewer => reviewer.id === userId)
      );
    } catch (error) {
      console.error('Failed to fetch review PRs:', error);
      return [];
    }
  }

  /**
   * Fetch all PRs (both created and reviewing)
   */
  async fetchMyPRs(options: MyPRsOptions): Promise<PullRequest[]> {
    const role = options.role;

    if (role === PullRequestRole.Author) {
      return this.fetchMyCreatedPRs(options);
    }

    if (role === PullRequestRole.Reviewer) {
      return this.fetchMyReviewPRs(options);
    }

    // Fetch both and merge
    const [createdPRs, reviewPRs] = await Promise.all([
      this.fetchMyCreatedPRs(options),
      this.fetchMyReviewPRs(options),
    ]);

    // Deduplicate by PR ID
    const prMap = new Map<number, PullRequest>();
    
    for (const pr of [...createdPRs, ...reviewPRs]) {
      if (!prMap.has(pr.pullRequestId)) {
        prMap.set(pr.pullRequestId, pr);
      }
    }

    return Array.from(prMap.values());
  }

  /**
   * Build filters from options
   */
  private buildFilters(options: MyPRsOptions): PullRequestFilters {
    const filters: PullRequestFilters = {
      status: options.status,
      top: options.top,
    };

    if (options.project) {
      filters.project = options.project;
    }

    if (options.repo) {
      filters.repositoryId = options.repo;
    }

    return filters;
  }

  /**
   * Build Azure CLI filter arguments
   */
  private buildFilterArgs(filters: PullRequestFilters): string {
    const args: string[] = [];

    if (filters.status && filters.status !== PullRequestStatus.All) {
      args.push(`--status ${filters.status}`);
    }

    if (filters.project) {
      args.push(`--project "${filters.project}"`);
    }

    if (filters.repositoryId) {
      args.push(`--repository "${filters.repositoryId}"`);
    }

    if (filters.top) {
      args.push(`--top ${filters.top}`);
    }

    return args.join(' ');
  }

  /**
   * Sort PRs by creation date (newest first)
   */
  sortPRs(prs: PullRequest[]): PullRequest[] {
    return [...prs].sort((a, b) => {
      const dateA = new Date(a.creationDate).getTime();
      const dateB = new Date(b.creationDate).getTime();
      return dateB - dateA;
    });
  }
}
```

### 2. Create My PRs Command
Create `src/commands/pr/my-prs/my-prs.command.ts`:
```typescript
import { Command } from 'commander';
import {
  PullRequestStatus,
  PullRequestRole,
  OutputFormat,
  MyPRsOptions,
} from '../../../types/pull-request.types.js';
import { MyPRsService } from './my-prs.service.js';

/**
 * Create the my-prs command
 */
export function createMyPRsCommand(): Command {
  const command = new Command('my-prs');

  command
    .description('List pull requests where you are the author or reviewer')
    .option(
      '-s, --status <status>',
      'Filter by status (active, completed, abandoned, all)',
      PullRequestStatus.Active
    )
    .option('-r, --repo <repository>', 'Filter by repository name')
    .option('-p, --project <project>', 'Project name')
    .option(
      '--role <role>',
      'Filter by role (all, author, reviewer)',
      PullRequestRole.All
    )
    .option('-n, --top <number>', 'Maximum number of results', '50')
    .option(
      '-o, --output <format>',
      'Output format (table, json)',
      OutputFormat.Table
    )
    .action(async (options) => {
      try {
        // Parse and validate options
        const myPRsOptions: MyPRsOptions = {
          status: options.status as PullRequestStatus,
          role: options.role as PullRequestRole,
          top: parseInt(options.top, 10),
          output: options.output as OutputFormat,
          repo: options.repo,
          project: options.project,
        };

        // Validate status
        if (!Object.values(PullRequestStatus).includes(myPRsOptions.status)) {
          console.error(`Invalid status: ${options.status}`);
          console.error(`Valid values: ${Object.values(PullRequestStatus).join(', ')}`);
          process.exit(1);
        }

        // Validate role
        if (!Object.values(PullRequestRole).includes(myPRsOptions.role)) {
          console.error(`Invalid role: ${options.role}`);
          console.error(`Valid values: ${Object.values(PullRequestRole).join(', ')}`);
          process.exit(1);
        }

        // Validate output format
        if (!Object.values(OutputFormat).includes(myPRsOptions.output)) {
          console.error(`Invalid output format: ${options.output}`);
          console.error(`Valid values: ${Object.values(OutputFormat).join(', ')}`);
          process.exit(1);
        }

        // Fetch PRs
        const service = new MyPRsService();
        const prs = await service.fetchMyPRs(myPRsOptions);
        const sortedPRs = service.sortPRs(prs);

        // Output results
        if (myPRsOptions.output === OutputFormat.Json) {
          console.log(JSON.stringify(sortedPRs, null, 2));
        } else {
          // Temporary simple table output (will be replaced by formatter in Task 7)
          if (sortedPRs.length === 0) {
            console.log('No pull requests found.');
          } else {
            console.log(`\nFound ${sortedPRs.length} pull request(s):\n`);
            sortedPRs.forEach(pr => {
              console.log(`#${pr.pullRequestId} - ${pr.title}`);
              console.log(`  Status: ${pr.status} | Created: ${pr.creationDate}`);
              console.log(`  Repo: ${pr.repository.name}\n`);
            });
          }
        }
      } catch (error: any) {
        console.error('Error fetching pull requests:', error.message);
        process.exit(1);
      }
    });

  return command;
}
```

### 3. Create Service Unit Tests
Create `tests/unit/commands/pr/my-prs/my-prs.service.test.ts`:
```typescript
import { jest } from '@jest/globals';
import { MyPRsService } from '../../../../../src/commands/pr/my-prs/my-prs.service.js';
import { AzureCliService } from '../../../../../src/services/azure-cli.service.js';
import { ConfigService } from '../../../../../src/services/config.service.js';
import {
  PullRequestStatus,
  PullRequestRole,
  OutputFormat,
  type PullRequest,
} from '../../../../../src/types/pull-request.types.js';

describe('MyPRsService', () => {
  let service: MyPRsService;
  let mockAzureCliService: jest.Mocked<AzureCliService>;
  let mockConfigService: jest.Mocked<ConfigService>;

  const mockPR1: PullRequest = {
    pullRequestId: 1,
    title: 'PR 1',
    status: 'active',
    creationDate: '2024-01-01T10:00:00Z',
    createdBy: { id: 'user1', displayName: 'User 1', uniqueName: 'user1@example.com' },
    reviewers: [],
    repository: {
      id: 'repo1',
      name: 'repo1',
      project: { id: 'proj1', name: 'Project1' },
    },
    sourceRefName: 'refs/heads/feature1',
    targetRefName: 'refs/heads/main',
  };

  const mockPR2: PullRequest = {
    pullRequestId: 2,
    title: 'PR 2',
    status: 'active',
    creationDate: '2024-01-02T10:00:00Z',
    createdBy: { id: 'user2', displayName: 'User 2', uniqueName: 'user2@example.com' },
    reviewers: [{ id: 'user1', displayName: 'User 1', uniqueName: 'user1@example.com', vote: 0 }],
    repository: {
      id: 'repo1',
      name: 'repo1',
      project: { id: 'proj1', name: 'Project1' },
    },
    sourceRefName: 'refs/heads/feature2',
    targetRefName: 'refs/heads/main',
  };

  beforeEach(() => {
    mockAzureCliService = {
      executeAzCommand: jest.fn(),
    } as any;

    mockConfigService = {
      getOrganizationUrl: jest.fn(),
      getDefaultProject: jest.fn(),
    } as any;

    service = new MyPRsService(mockAzureCliService, mockConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchMyCreatedPRs', () => {
    it('should fetch PRs created by current user', async () => {
      mockAzureCliService.executeAzCommand.mockResolvedValue([mockPR1]);

      const options = {
        status: PullRequestStatus.Active,
        role: PullRequestRole.Author,
        top: 50,
        output: OutputFormat.Table,
      };

      const result = await service.fetchMyCreatedPRs(options);

      expect(result).toEqual([mockPR1]);
      expect(mockAzureCliService.executeAzCommand).toHaveBeenCalled();
    });

    it('should return empty array on error', async () => {
      mockAzureCliService.executeAzCommand.mockRejectedValue(new Error('Failed'));

      const options = {
        status: PullRequestStatus.Active,
        role: PullRequestRole.Author,
        top: 50,
        output: OutputFormat.Table,
      };

      const result = await service.fetchMyCreatedPRs(options);

      expect(result).toEqual([]);
    });

    it('should include repository filter when provided', async () => {
      mockAzureCliService.executeAzCommand.mockResolvedValue([mockPR1]);

      const options = {
        status: PullRequestStatus.Active,
        role: PullRequestRole.Author,
        top: 50,
        output: OutputFormat.Table,
        repo: 'my-repo',
      };

      await service.fetchMyCreatedPRs(options);

      const command = mockAzureCliService.executeAzCommand.mock.calls[0][0] as string;
      expect(command).toContain('--repository "my-repo"');
    });
  });

  describe('fetchMyReviewPRs', () => {
    it('should fetch PRs where user is reviewer', async () => {
      mockAzureCliService.executeAzCommand
        .mockResolvedValueOnce([mockPR1, mockPR2])
        .mockResolvedValueOnce('user1');

      const options = {
        status: PullRequestStatus.Active,
        role: PullRequestRole.Reviewer,
        top: 50,
        output: OutputFormat.Table,
      };

      const result = await service.fetchMyReviewPRs(options);

      expect(result).toEqual([mockPR2]);
    });

    it('should return empty array when no PRs found', async () => {
      mockAzureCliService.executeAzCommand.mockResolvedValue([]);

      const options = {
        status: PullRequestStatus.Active,
        role: PullRequestRole.Reviewer,
        top: 50,
        output: OutputFormat.Table,
      };

      const result = await service.fetchMyReviewPRs(options);

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      mockAzureCliService.executeAzCommand.mockRejectedValue(new Error('Failed'));

      const options = {
        status: PullRequestStatus.Active,
        role: PullRequestRole.Reviewer,
        top: 50,
        output: OutputFormat.Table,
      };

      const result = await service.fetchMyReviewPRs(options);

      expect(result).toEqual([]);
    });
  });

  describe('fetchMyPRs', () => {
    it('should fetch only created PRs when role is author', async () => {
      mockAzureCliService.executeAzCommand.mockResolvedValue([mockPR1]);

      const options = {
        status: PullRequestStatus.Active,
        role: PullRequestRole.Author,
        top: 50,
        output: OutputFormat.Table,
      };

      const result = await service.fetchMyPRs(options);

      expect(result).toEqual([mockPR1]);
    });

    it('should fetch only review PRs when role is reviewer', async () => {
      mockAzureCliService.executeAzCommand
        .mockResolvedValueOnce([mockPR2])
        .mockResolvedValueOnce('user1');

      const options = {
        status: PullRequestStatus.Active,
        role: PullRequestRole.Reviewer,
        top: 50,
        output: OutputFormat.Table,
      };

      const result = await service.fetchMyPRs(options);

      expect(result.length).toBe(1);
    });

    it('should fetch and deduplicate when role is all', async () => {
      mockAzureCliService.executeAzCommand
        .mockResolvedValueOnce([mockPR1])
        .mockResolvedValueOnce([mockPR1, mockPR2])
        .mockResolvedValueOnce('user1');

      const options = {
        status: PullRequestStatus.Active,
        role: PullRequestRole.All,
        top: 50,
        output: OutputFormat.Table,
      };

      const result = await service.fetchMyPRs(options);

      expect(result.length).toBe(2);
      const ids = result.map(pr => pr.pullRequestId);
      expect(ids).toContain(1);
      expect(ids).toContain(2);
    });
  });

  describe('sortPRs', () => {
    it('should sort PRs by creation date (newest first)', () => {
      const prs = [mockPR1, mockPR2];
      const sorted = service.sortPRs(prs);

      expect(sorted[0].pullRequestId).toBe(2);
      expect(sorted[1].pullRequestId).toBe(1);
    });

    it('should not mutate original array', () => {
      const prs = [mockPR1, mockPR2];
      const original = [...prs];
      
      service.sortPRs(prs);

      expect(prs).toEqual(original);
    });
  });
});
```

### 4. Create Command Unit Tests
Create `tests/unit/commands/pr/my-prs/my-prs.command.test.ts`:
```typescript
import { jest } from '@jest/globals';
import { createMyPRsCommand } from '../../../../../src/commands/pr/my-prs/my-prs.command.js';

describe('MyPRsCommand', () => {
  let consoleSpy: jest.SpiedFunction<typeof console.log>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
  let exitSpy: jest.SpiedFunction<typeof process.exit>;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation() as any;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    exitSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('Command Creation', () => {
    it('should create command with correct name', () => {
      const command = createMyPRsCommand();
      expect(command.name()).toBe('my-prs');
    });

    it('should have correct description', () => {
      const command = createMyPRsCommand();
      expect(command.description()).toContain('author or reviewer');
    });

    it('should have all required options', () => {
      const command = createMyPRsCommand();
      const options = command.options;

      const optionNames = options.map(opt => opt.long);
      expect(optionNames).toContain('--status');
      expect(optionNames).toContain('--repo');
      expect(optionNames).toContain('--project');
      expect(optionNames).toContain('--role');
      expect(optionNames).toContain('--top');
      expect(optionNames).toContain('--output');
    });

    it('should have correct default values', () => {
      const command = createMyPRsCommand();
      const options = command.options;

      const statusOption = options.find(opt => opt.long === '--status');
      expect(statusOption?.defaultValue).toBe('active');

      const roleOption = options.find(opt => opt.long === '--role');
      expect(roleOption?.defaultValue).toBe('all');

      const topOption = options.find(opt => opt.long === '--top');
      expect(topOption?.defaultValue).toBe('50');

      const outputOption = options.find(opt => opt.long === '--output');
      expect(outputOption?.defaultValue).toBe('table');
    });
  });
});
```

### 5. Create test directories
```bash
mkdir -p tests/unit/commands/pr/my-prs
```

## Dependencies
- Task 1: Project Setup
- Task 2: Type Definitions
- Task 3: Azure CLI Service
- Task 4: Config Service

## Acceptance Criteria
- [ ] Service fetches PRs created by current user
- [ ] Service fetches PRs where user is reviewer
- [ ] Service combines and deduplicates PRs when role is 'all'
- [ ] Service applies filters (status, repo, project, top)
- [ ] Service sorts PRs by creation date (newest first)
- [ ] Command accepts all specified CLI options
- [ ] Command validates option values
- [ ] Command outputs JSON format when requested
- [ ] Command outputs simple table format (temporary, before formatter)
- [ ] Command handles errors gracefully
- [ ] Jest tests pass with 80%+ coverage for service
- [ ] Jest tests verify command structure and options

## Test Cases
- **Test Case 1: Fetch Created PRs**
  - Mock Azure CLI to return PRs
  - Expected: Returns PRs created by current user
  
- **Test Case 2: Fetch Review PRs**
  - Mock Azure CLI to return all PRs, filter by reviewer
  - Expected: Returns only PRs where user is reviewer
  
- **Test Case 3: Fetch All PRs with Deduplication**
  - Mock both created and review PR lists with overlap
  - Expected: Returns deduplicated list of PRs
  
- **Test Case 4: Apply Filters**
  - Set status, repo, project filters
  - Expected: Azure CLI command includes correct filter arguments
  
- **Test Case 5: Sort PRs**
  - Provide unsorted PRs
  - Expected: Returns PRs sorted by creation date (newest first)
  
- **Test Case 6: Error Handling**
  - Mock Azure CLI to throw error
  - Expected: Returns empty array and logs error
  
- **Test Case 7: Command Structure**
  - Create command instance
  - Expected: Has correct name, description, and options
  
- **Test Case 8: Invalid Option Values**
  - Pass invalid status, role, or output format
  - Expected: Shows error message and exits with code 1
