# Task 6: PR Comments Command

## Objective
Create the `pr-comments` command that fetches comment threads for a specific pull request using Azure DevOps REST API. This command demonstrates direct REST API integration, handles authentication via Azure CLI tokens, and supports opening the PR in a browser.

## Files to Create/Modify
- `src/services/azure-api.service.ts`
- `src/commands/pr/comments/comments.service.ts`
- `src/commands/pr/comments/comments.command.ts`
- `tests/unit/services/azure-api.service.test.ts`
- `tests/unit/commands/pr/comments/comments.service.test.ts`
- `tests/unit/commands/pr/comments/comments.command.test.ts`

## Implementation Details

### 1. Create Azure API Service
Create `src/services/azure-api.service.ts`:
```typescript
import { AzureCliService } from './azure-cli.service.js';
import { ConfigService } from './config.service.js';

/**
 * Service for making direct REST API calls to Azure DevOps
 */
export class AzureApiService {
  private azureCliService: AzureCliService;
  private configService: ConfigService;
  private accessToken?: string;

  constructor(
    azureCliService?: AzureCliService,
    configService?: ConfigService
  ) {
    this.azureCliService = azureCliService || new AzureCliService();
    this.configService = configService || new ConfigService(this.azureCliService);
  }

  /**
   * Get access token (cached)
   */
  private async getAccessToken(): Promise<string> {
    if (!this.accessToken) {
      this.accessToken = await this.azureCliService.getAzureDevOpsAccessToken();
    }
    return this.accessToken;
  }

  /**
   * Make a GET request to Azure DevOps REST API
   */
  async get<T>(path: string, project?: string): Promise<T> {
    const url = await this.configService.buildApiUrl(path, project);
    
    if (!url) {
      throw new Error('Azure DevOps organization URL not configured');
    }

    const token = await this.getAccessToken();
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Azure DevOps API request failed: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Clear the cached access token
   */
  clearToken(): void {
    this.accessToken = undefined;
  }
}
```

### 2. Create Comments Service
Create `src/commands/pr/comments/comments.service.ts`:
```typescript
import { AzureApiService } from '../../../services/azure-api.service.js';
import { AzureCliService } from '../../../services/azure-cli.service.js';
import { ConfigService } from '../../../services/config.service.js';
import {
  CommentThread,
  ThreadsResponse,
  PRCommentsOptions,
  type PullRequest,
} from '../../../types/comment.types.js';

/**
 * Service for fetching PR comments
 */
export class CommentsService {
  private azureApiService: AzureApiService;
  private azureCliService: AzureCliService;
  private configService: ConfigService;

  constructor(
    azureApiService?: AzureApiService,
    azureCliService?: AzureCliService,
    configService?: ConfigService
  ) {
    this.azureCliService = azureCliService || new AzureCliService();
    this.configService = configService || new ConfigService(this.azureCliService);
    this.azureApiService = azureApiService || new AzureApiService(
      this.azureCliService,
      this.configService
    );
  }

  /**
   * Fetch PR details to get repository and project information
   */
  async fetchPRDetails(prId: number, project?: string, repo?: string): Promise<PullRequest | null> {
    try {
      let command = `az repos pr show --id ${prId} --output json`;
      
      if (project) {
        command += ` --project "${project}"`;
      }
      
      if (repo) {
        command += ` --repository "${repo}"`;
      }

      const pr = await this.azureCliService.executeAzCommand<PullRequest>(command);
      return pr;
    } catch (error) {
      console.error('Failed to fetch PR details:', error);
      return null;
    }
  }

  /**
   * Fetch comment threads for a pull request using REST API
   */
  async fetchCommentThreads(
    prId: number,
    options: PRCommentsOptions
  ): Promise<CommentThread[]> {
    // Get PR details to determine project and repo if not provided
    let project = options.project;
    let repositoryId: string;

    if (!project || !options.repo) {
      const prDetails = await this.fetchPRDetails(prId, options.project, options.repo);
      
      if (!prDetails) {
        throw new Error(`Pull request ${prId} not found`);
      }

      project = project || prDetails.repository.project.name;
      repositoryId = prDetails.repository.id;
    } else {
      // If repo is provided, we need to get its ID
      const prDetails = await this.fetchPRDetails(prId, project, options.repo);
      if (!prDetails) {
        throw new Error(`Pull request ${prId} not found`);
      }
      repositoryId = prDetails.repository.id;
    }

    // Build API path
    const apiPath = `/_apis/git/repositories/${repositoryId}/pullRequests/${prId}/threads?api-version=7.0`;

    try {
      const response = await this.azureApiService.get<ThreadsResponse>(apiPath, project);
      return response.value || [];
    } catch (error: any) {
      throw new Error(`Failed to fetch comment threads: ${error.message}`);
    }
  }

  /**
   * Sort threads by published date
   */
  sortThreads(threads: CommentThread[], chronological: boolean): CommentThread[] {
    return [...threads].sort((a, b) => {
      const dateA = new Date(a.publishedDate).getTime();
      const dateB = new Date(b.publishedDate).getTime();
      return chronological ? dateA - dateB : dateB - dateA;
    });
  }

  /**
   * Filter out deleted threads
   */
  filterDeletedThreads(threads: CommentThread[]): CommentThread[] {
    return threads.filter(thread => !thread.isDeleted);
  }

  /**
   * Build PR URL for opening in browser
   */
  async buildPRUrl(prId: number, project?: string): Promise<string | undefined> {
    const orgUrl = await this.configService.getOrganizationUrl();
    
    if (!orgUrl) {
      return undefined;
    }

    // Get PR details to determine project if not provided
    if (!project) {
      const prDetails = await this.fetchPRDetails(prId);
      if (prDetails) {
        project = prDetails.repository.project.name;
      }
    }

    if (!project) {
      return undefined;
    }

    return `${orgUrl}/${project}/_git/pullrequest/${prId}`;
  }
}
```

### 3. Create Comments Command
Create `src/commands/pr/comments/comments.command.ts`:
```typescript
import { Command } from 'commander';
import open from 'open';
import { OutputFormat, PRCommentsOptions } from '../../../types/comment.types.js';
import { CommentsService } from './comments.service.js';

/**
 * Create the pr-comments command
 */
export function createPRCommentsCommand(): Command {
  const command = new Command('pr-comments');

  command
    .description('Display comments for a specific pull request')
    .argument('<pr-id>', 'Pull request ID')
    .option('-p, --project <project>', 'Project name')
    .option('-r, --repo <repository>', 'Repository name')
    .option(
      '-o, --output <format>',
      'Output format (table, json)',
      OutputFormat.Table
    )
    .option('--chronological', 'Display comments in chronological order', false)
    .option('--open', 'Open the pull request in browser', false)
    .action(async (prIdStr: string, options) => {
      try {
        // Parse PR ID
        const prId = parseInt(prIdStr, 10);
        if (isNaN(prId) || prId <= 0) {
          console.error('Invalid pull request ID. Must be a positive number.');
          process.exit(1);
        }

        // Parse and validate options
        const commentsOptions: PRCommentsOptions = {
          output: options.output as OutputFormat,
          chronological: options.chronological,
          open: options.open,
          project: options.project,
          repo: options.repo,
        };

        // Validate output format
        if (!Object.values(OutputFormat).includes(commentsOptions.output)) {
          console.error(`Invalid output format: ${options.output}`);
          console.error(`Valid values: ${Object.values(OutputFormat).join(', ')}`);
          process.exit(1);
        }

        const service = new CommentsService();

        // Open in browser if requested
        if (commentsOptions.open) {
          const url = await service.buildPRUrl(prId, commentsOptions.project);
          if (url) {
            console.log(`Opening pull request in browser: ${url}`);
            await open(url);
          } else {
            console.error('Could not determine PR URL. Organization or project not configured.');
          }
          
          // If --open is the only action requested, exit here
          if (!options.output) {
            return;
          }
        }

        // Fetch comment threads
        const threads = await service.fetchCommentThreads(prId, commentsOptions);
        const filteredThreads = service.filterDeletedThreads(threads);
        const sortedThreads = service.sortThreads(
          filteredThreads,
          commentsOptions.chronological
        );

        // Output results
        if (commentsOptions.output === OutputFormat.Json) {
          console.log(JSON.stringify(sortedThreads, null, 2));
        } else {
          // Temporary simple output (will be replaced by formatter in Task 7)
          if (sortedThreads.length === 0) {
            console.log(`No comments found for PR #${prId}.`);
          } else {
            console.log(`\nFound ${sortedThreads.length} comment thread(s) for PR #${prId}:\n`);
            sortedThreads.forEach((thread, index) => {
              console.log(`Thread #${index + 1} (Status: ${thread.status})`);
              console.log(`  Published: ${thread.publishedDate}`);
              if (thread.threadContext?.filePath) {
                console.log(`  File: ${thread.threadContext.filePath}`);
              }
              console.log(`  Comments: ${thread.comments.length}\n`);
            });
          }
        }
      } catch (error: any) {
        console.error('Error fetching comments:', error.message);
        process.exit(1);
      }
    });

  return command;
}
```

### 4. Create Azure API Service Tests
Create `tests/unit/services/azure-api.service.test.ts`:
```typescript
import { jest } from '@jest/globals';
import { AzureApiService } from '../../../src/services/azure-api.service.js';
import { AzureCliService } from '../../../src/services/azure-cli.service.js';
import { ConfigService } from '../../../src/services/config.service.js';

// Mock fetch
global.fetch = jest.fn() as any;

describe('AzureApiService', () => {
  let service: AzureApiService;
  let mockAzureCliService: jest.Mocked<AzureCliService>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockAzureCliService = {
      getAzureDevOpsAccessToken: jest.fn(),
    } as any;

    mockConfigService = {
      buildApiUrl: jest.fn(),
    } as any;

    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

    service = new AzureApiService(mockAzureCliService, mockConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should make GET request with correct headers', async () => {
      const mockToken = 'test-token';
      const mockUrl = 'https://dev.azure.com/org/_apis/test';
      const mockResponse = { data: 'test' };

      mockAzureCliService.getAzureDevOpsAccessToken.mockResolvedValue(mockToken);
      mockConfigService.buildApiUrl.mockResolvedValue(mockUrl);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as any);

      const result = await service.get('/_apis/test');

      expect(mockFetch).toHaveBeenCalledWith(mockUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should cache access token', async () => {
      const mockToken = 'test-token';
      const mockUrl = 'https://dev.azure.com/org/_apis/test';

      mockAzureCliService.getAzureDevOpsAccessToken.mockResolvedValue(mockToken);
      mockConfigService.buildApiUrl.mockResolvedValue(mockUrl);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as any);

      await service.get('/_apis/test1');
      await service.get('/_apis/test2');

      expect(mockAzureCliService.getAzureDevOpsAccessToken).toHaveBeenCalledTimes(1);
    });

    it('should throw error when organization URL not configured', async () => {
      mockConfigService.buildApiUrl.mockResolvedValue(undefined);

      await expect(service.get('/_apis/test'))
        .rejects.toThrow('Azure DevOps organization URL not configured');
    });

    it('should throw error on failed request', async () => {
      const mockToken = 'test-token';
      const mockUrl = 'https://dev.azure.com/org/_apis/test';

      mockAzureCliService.getAzureDevOpsAccessToken.mockResolvedValue(mockToken);
      mockConfigService.buildApiUrl.mockResolvedValue(mockUrl);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Resource not found',
      } as any);

      await expect(service.get('/_apis/test'))
        .rejects.toThrow('Azure DevOps API request failed: 404 Not Found');
    });

    it('should pass project parameter to buildApiUrl', async () => {
      const mockToken = 'test-token';
      const mockUrl = 'https://dev.azure.com/org/MyProject/_apis/test';

      mockAzureCliService.getAzureDevOpsAccessToken.mockResolvedValue(mockToken);
      mockConfigService.buildApiUrl.mockResolvedValue(mockUrl);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as any);

      await service.get('/_apis/test', 'MyProject');

      expect(mockConfigService.buildApiUrl).toHaveBeenCalledWith('/_apis/test', 'MyProject');
    });
  });

  describe('clearToken', () => {
    it('should clear cached access token', async () => {
      const mockToken = 'test-token';
      const mockUrl = 'https://dev.azure.com/org/_apis/test';

      mockAzureCliService.getAzureDevOpsAccessToken.mockResolvedValue(mockToken);
      mockConfigService.buildApiUrl.mockResolvedValue(mockUrl);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as any);

      await service.get('/_apis/test');
      service.clearToken();
      await service.get('/_apis/test');

      expect(mockAzureCliService.getAzureDevOpsAccessToken).toHaveBeenCalledTimes(2);
    });
  });
});
```

### 5. Create Comments Service Tests
Create `tests/unit/commands/pr/comments/comments.service.test.ts`:
```typescript
import { jest } from '@jest/globals';
import { CommentsService } from '../../../../../src/commands/pr/comments/comments.service.js';
import { AzureApiService } from '../../../../../src/services/azure-api.service.js';
import { AzureCliService } from '../../../../../src/services/azure-cli.service.js';
import { ConfigService } from '../../../../../src/services/config.service.js';
import {
  CommentThread,
  CommentThreadStatus,
  CommentType,
} from '../../../../../src/types/comment.types.js';

describe('CommentsService', () => {
  let service: CommentsService;
  let mockAzureApiService: jest.Mocked<AzureApiService>;
  let mockAzureCliService: jest.Mocked<AzureCliService>;
  let mockConfigService: jest.Mocked<ConfigService>;

  const mockThread1: CommentThread = {
    id: 1,
    publishedDate: '2024-01-01T10:00:00Z',
    comments: [
      {
        id: 1,
        content: 'Test comment',
        author: { id: 'user1', displayName: 'User 1' },
        publishedDate: '2024-01-01T10:00:00Z',
        commentType: CommentType.Text,
      },
    ],
    status: CommentThreadStatus.Active,
    isDeleted: false,
  };

  const mockThread2: CommentThread = {
    id: 2,
    publishedDate: '2024-01-02T10:00:00Z',
    comments: [],
    status: CommentThreadStatus.Fixed,
    isDeleted: false,
  };

  beforeEach(() => {
    mockAzureApiService = {
      get: jest.fn(),
    } as any;

    mockAzureCliService = {
      executeAzCommand: jest.fn(),
    } as any;

    mockConfigService = {
      getOrganizationUrl: jest.fn(),
    } as any;

    service = new CommentsService(
      mockAzureApiService,
      mockAzureCliService,
      mockConfigService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchCommentThreads', () => {
    it('should fetch comment threads via REST API', async () => {
      const mockPR = {
        pullRequestId: 123,
        repository: {
          id: 'repo-id',
          name: 'repo-name',
          project: { id: 'proj-id', name: 'MyProject' },
        },
      };

      mockAzureCliService.executeAzCommand.mockResolvedValue(mockPR as any);
      mockAzureApiService.get.mockResolvedValue({
        value: [mockThread1, mockThread2],
        count: 2,
      });

      const result = await service.fetchCommentThreads(123, {
        output: 'table' as any,
        chronological: false,
        open: false,
      });

      expect(result).toEqual([mockThread1, mockThread2]);
      expect(mockAzureApiService.get).toHaveBeenCalled();
    });

    it('should throw error when PR not found', async () => {
      mockAzureCliService.executeAzCommand.mockResolvedValue(null);

      await expect(
        service.fetchCommentThreads(999, {
          output: 'table' as any,
          chronological: false,
          open: false,
        })
      ).rejects.toThrow('Pull request 999 not found');
    });

    it('should use provided project and repo', async () => {
      const mockPR = {
        pullRequestId: 123,
        repository: {
          id: 'repo-id',
          name: 'repo-name',
          project: { id: 'proj-id', name: 'MyProject' },
        },
      };

      mockAzureCliService.executeAzCommand.mockResolvedValue(mockPR as any);
      mockAzureApiService.get.mockResolvedValue({ value: [], count: 0 });

      await service.fetchCommentThreads(123, {
        output: 'table' as any,
        chronological: false,
        open: false,
        project: 'MyProject',
        repo: 'my-repo',
      });

      expect(mockAzureCliService.executeAzCommand).toHaveBeenCalled();
    });
  });

  describe('sortThreads', () => {
    it('should sort threads chronologically', () => {
      const threads = [mockThread2, mockThread1];
      const sorted = service.sortThreads(threads, true);

      expect(sorted[0].id).toBe(1);
      expect(sorted[1].id).toBe(2);
    });

    it('should sort threads reverse chronologically', () => {
      const threads = [mockThread1, mockThread2];
      const sorted = service.sortThreads(threads, false);

      expect(sorted[0].id).toBe(2);
      expect(sorted[1].id).toBe(1);
    });

    it('should not mutate original array', () => {
      const threads = [mockThread1, mockThread2];
      const original = [...threads];

      service.sortThreads(threads, true);

      expect(threads).toEqual(original);
    });
  });

  describe('filterDeletedThreads', () => {
    it('should filter out deleted threads', () => {
      const deletedThread: CommentThread = {
        ...mockThread1,
        id: 3,
        isDeleted: true,
      };

      const threads = [mockThread1, deletedThread, mockThread2];
      const filtered = service.filterDeletedThreads(threads);

      expect(filtered.length).toBe(2);
      expect(filtered.find(t => t.id === 3)).toBeUndefined();
    });
  });

  describe('buildPRUrl', () => {
    it('should build PR URL with project', async () => {
      mockConfigService.getOrganizationUrl.mockResolvedValue('https://dev.azure.com/myorg');

      const url = await service.buildPRUrl(123, 'MyProject');

      expect(url).toBe('https://dev.azure.com/myorg/MyProject/_git/pullrequest/123');
    });

    it('should fetch PR details when project not provided', async () => {
      const mockPR = {
        repository: {
          project: { name: 'MyProject' },
        },
      };

      mockConfigService.getOrganizationUrl.mockResolvedValue('https://dev.azure.com/myorg');
      mockAzureCliService.executeAzCommand.mockResolvedValue(mockPR as any);

      const url = await service.buildPRUrl(123);

      expect(url).toBe('https://dev.azure.com/myorg/MyProject/_git/pullrequest/123');
    });

    it('should return undefined when org URL not configured', async () => {
      mockConfigService.getOrganizationUrl.mockResolvedValue(undefined);

      const url = await service.buildPRUrl(123, 'MyProject');

      expect(url).toBeUndefined();
    });
  });
});
```

### 6. Create Comments Command Tests
Create `tests/unit/commands/pr/comments/comments.command.test.ts`:
```typescript
import { jest } from '@jest/globals';
import { createPRCommentsCommand } from '../../../../../src/commands/pr/comments/comments.command.js';

describe('PRCommentsCommand', () => {
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
      const command = createPRCommentsCommand();
      expect(command.name()).toBe('pr-comments');
    });

    it('should have correct description', () => {
      const command = createPRCommentsCommand();
      expect(command.description()).toContain('comments');
    });

    it('should require PR ID argument', () => {
      const command = createPRCommentsCommand();
      const args = command.registeredArguments;

      expect(args.length).toBe(1);
      expect(args[0].name()).toBe('pr-id');
      expect(args[0].required).toBe(true);
    });

    it('should have all required options', () => {
      const command = createPRCommentsCommand();
      const options = command.options;

      const optionNames = options.map(opt => opt.long);
      expect(optionNames).toContain('--project');
      expect(optionNames).toContain('--repo');
      expect(optionNames).toContain('--output');
      expect(optionNames).toContain('--chronological');
      expect(optionNames).toContain('--open');
    });

    it('should have correct default values', () => {
      const command = createPRCommentsCommand();
      const options = command.options;

      const outputOption = options.find(opt => opt.long === '--output');
      expect(outputOption?.defaultValue).toBe('table');

      const chronologicalOption = options.find(opt => opt.long === '--chronological');
      expect(chronologicalOption?.defaultValue).toBe(false);

      const openOption = options.find(opt => opt.long === '--open');
      expect(openOption?.defaultValue).toBe(false);
    });
  });
});
```

## Dependencies
- Task 1: Project Setup
- Task 2: Type Definitions
- Task 3: Azure CLI Service
- Task 4: Config Service

## Acceptance Criteria
- [ ] Azure API Service makes authenticated REST API calls
- [ ] Azure API Service caches access token
- [ ] Comments Service fetches PR details via Azure CLI
- [ ] Comments Service fetches comment threads via REST API
- [ ] Comments Service filters out deleted threads
- [ ] Comments Service sorts threads by date
- [ ] Comments Service builds PR URLs for browser opening
- [ ] Command accepts PR ID as required argument
- [ ] Command accepts all specified options
- [ ] Command validates PR ID and option values
- [ ] Command supports opening PR in browser with --open flag
- [ ] Command outputs JSON format when requested
- [ ] Command outputs simple format (temporary, before formatter)
- [ ] Command handles errors gracefully (PR not found, etc.)
- [ ] Jest tests pass with 80%+ coverage for services
- [ ] Jest tests verify command structure

## Test Cases
- **Test Case 1: Fetch Comment Threads**
  - Mock REST API to return threads
  - Expected: Returns comment threads for PR
  
- **Test Case 2: PR Not Found**
  - Mock Azure CLI to return null
  - Expected: Throws "PR not found" error
  
- **Test Case 3: Filter Deleted Threads**
  - Provide threads with isDeleted=true
  - Expected: Returns only non-deleted threads
  
- **Test Case 4: Sort Threads**
  - Provide unsorted threads
  - Test chronological and reverse chronological
  - Expected: Returns correctly sorted threads
  
- **Test Case 5: Build PR URL**
  - Provide PR ID and project
  - Expected: Returns correct Azure DevOps URL
  
- **Test Case 6: Open in Browser**
  - Mock open() function
  - Expected: Opens correct URL in browser
  
- **Test Case 7: REST API Authentication**
  - Mock token retrieval
  - Expected: Makes API call with Bearer token
  
- **Test Case 8: Token Caching**
  - Make multiple API calls
  - Expected: Token retrieved only once
  
- **Test Case 9: Invalid PR ID**
  - Pass non-numeric or negative PR ID
  - Expected: Shows error and exits with code 1
