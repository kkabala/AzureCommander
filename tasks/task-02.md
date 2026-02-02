# Task 2: Type Definitions

## Objective
Create comprehensive TypeScript type definitions for Pull Requests and Comments. This establishes the type-safe contracts that will be used throughout the application, ensuring consistency and preventing runtime errors.

## Files to Create/Modify
- `src/types/pull-request.types.ts`
- `src/types/comment.types.ts`
- `tests/unit/types/pull-request.types.test.ts`
- `tests/unit/types/comment.types.test.ts`

## Implementation Details

### 1. Create Pull Request Types
Create `src/types/pull-request.types.ts`:
```typescript
/**
 * Status of a Pull Request
 */
export enum PullRequestStatus {
  Active = 'active',
  Completed = 'completed',
  Abandoned = 'abandoned',
  All = 'all',
}

/**
 * User role in relation to a Pull Request
 */
export enum PullRequestRole {
  Author = 'author',
  Reviewer = 'reviewer',
  All = 'all',
}

/**
 * Vote on a Pull Request
 */
export enum PullRequestVote {
  Approved = 10,
  ApprovedWithSuggestions = 5,
  NoVote = 0,
  WaitingForAuthor = -5,
  Rejected = -10,
}

/**
 * Represents a user in Azure DevOps
 */
export interface User {
  id: string;
  displayName: string;
  uniqueName: string;
  imageUrl?: string;
}

/**
 * Represents a reviewer on a Pull Request
 */
export interface Reviewer extends User {
  vote: PullRequestVote;
  isRequired?: boolean;
}

/**
 * Represents a Pull Request from Azure DevOps
 */
export interface PullRequest {
  pullRequestId: number;
  title: string;
  description?: string;
  status: string;
  creationDate: string;
  closedDate?: string;
  createdBy: User;
  reviewers: Reviewer[];
  repository: {
    id: string;
    name: string;
    project: {
      id: string;
      name: string;
    };
  };
  sourceRefName: string;
  targetRefName: string;
  mergeStatus?: string;
  isDraft?: boolean;
  url?: string;
}

/**
 * Filters for querying Pull Requests
 */
export interface PullRequestFilters {
  status?: PullRequestStatus;
  creatorId?: string;
  reviewerId?: string;
  repositoryId?: string;
  project?: string;
  top?: number;
}

/**
 * Output format for displaying Pull Requests
 */
export enum OutputFormat {
  Table = 'table',
  Json = 'json',
}

/**
 * Options for the my-prs command
 */
export interface MyPRsOptions {
  status: PullRequestStatus;
  repo?: string;
  project?: string;
  role: PullRequestRole;
  top: number;
  output: OutputFormat;
}
```

### 2. Create Comment Types
Create `src/types/comment.types.ts`:
```typescript
/**
 * Status of a comment thread
 */
export enum CommentThreadStatus {
  Active = 'active',
  Fixed = 'fixed',
  WontFix = 'wontFix',
  Closed = 'closed',
  ByDesign = 'byDesign',
  Pending = 'pending',
  Unknown = 'unknown',
}

/**
 * Type of comment
 */
export enum CommentType {
  Text = 'text',
  CodeChange = 'codeChange',
  System = 'system',
}

/**
 * Represents a user identity in Azure DevOps
 */
export interface Identity {
  id: string;
  displayName: string;
  uniqueName?: string;
  imageUrl?: string;
}

/**
 * Represents a single comment in a thread
 */
export interface Comment {
  id: number;
  parentCommentId?: number;
  content: string;
  author: Identity;
  publishedDate: string;
  lastUpdatedDate?: string;
  commentType: CommentType;
  isDeleted?: boolean;
}

/**
 * Represents the context of where a comment was made
 */
export interface CommentThreadContext {
  filePath?: string;
  rightFileStart?: {
    line: number;
    offset: number;
  };
  rightFileEnd?: {
    line: number;
    offset: number;
  };
  leftFileStart?: {
    line: number;
    offset: number;
  };
  leftFileEnd?: {
    line: number;
    offset: number;
  };
}

/**
 * Represents a comment thread on a Pull Request
 */
export interface CommentThread {
  id: number;
  publishedDate: string;
  lastUpdatedDate?: string;
  comments: Comment[];
  status: CommentThreadStatus;
  threadContext?: CommentThreadContext;
  properties?: Record<string, any>;
  isDeleted?: boolean;
}

/**
 * Options for the pr-comments command
 */
export interface PRCommentsOptions {
  project?: string;
  repo?: string;
  output: OutputFormat;
  chronological: boolean;
  open: boolean;
}

/**
 * Response from Azure DevOps PR threads API
 */
export interface ThreadsResponse {
  value: CommentThread[];
  count: number;
}
```

### 3. Create Unit Tests for Pull Request Types
Create `tests/unit/types/pull-request.types.test.ts`:
```typescript
import {
  PullRequestStatus,
  PullRequestRole,
  PullRequestVote,
  OutputFormat,
  type PullRequest,
  type Reviewer,
  type User,
  type PullRequestFilters,
  type MyPRsOptions,
} from '../../../src/types/pull-request.types.js';

describe('Pull Request Types', () => {
  describe('PullRequestStatus Enum', () => {
    it('should have correct values', () => {
      expect(PullRequestStatus.Active).toBe('active');
      expect(PullRequestStatus.Completed).toBe('completed');
      expect(PullRequestStatus.Abandoned).toBe('abandoned');
      expect(PullRequestStatus.All).toBe('all');
    });
  });

  describe('PullRequestRole Enum', () => {
    it('should have correct values', () => {
      expect(PullRequestRole.Author).toBe('author');
      expect(PullRequestRole.Reviewer).toBe('reviewer');
      expect(PullRequestRole.All).toBe('all');
    });
  });

  describe('PullRequestVote Enum', () => {
    it('should have correct numeric values', () => {
      expect(PullRequestVote.Approved).toBe(10);
      expect(PullRequestVote.ApprovedWithSuggestions).toBe(5);
      expect(PullRequestVote.NoVote).toBe(0);
      expect(PullRequestVote.WaitingForAuthor).toBe(-5);
      expect(PullRequestVote.Rejected).toBe(-10);
    });
  });

  describe('OutputFormat Enum', () => {
    it('should have correct values', () => {
      expect(OutputFormat.Table).toBe('table');
      expect(OutputFormat.Json).toBe('json');
    });
  });

  describe('Type Definitions', () => {
    it('should accept valid User object', () => {
      const user: User = {
        id: 'user-123',
        displayName: 'John Doe',
        uniqueName: 'john.doe@example.com',
        imageUrl: 'https://example.com/avatar.jpg',
      };
      expect(user.id).toBe('user-123');
      expect(user.displayName).toBe('John Doe');
    });

    it('should accept valid Reviewer object', () => {
      const reviewer: Reviewer = {
        id: 'reviewer-123',
        displayName: 'Jane Doe',
        uniqueName: 'jane.doe@example.com',
        vote: PullRequestVote.Approved,
        isRequired: true,
      };
      expect(reviewer.vote).toBe(10);
      expect(reviewer.isRequired).toBe(true);
    });

    it('should accept valid PullRequest object', () => {
      const pr: PullRequest = {
        pullRequestId: 123,
        title: 'Add new feature',
        description: 'This PR adds a new feature',
        status: 'active',
        creationDate: '2024-01-01T00:00:00Z',
        createdBy: {
          id: 'user-123',
          displayName: 'John Doe',
          uniqueName: 'john.doe@example.com',
        },
        reviewers: [],
        repository: {
          id: 'repo-123',
          name: 'my-repo',
          project: {
            id: 'project-123',
            name: 'my-project',
          },
        },
        sourceRefName: 'refs/heads/feature-branch',
        targetRefName: 'refs/heads/main',
        isDraft: false,
      };
      expect(pr.pullRequestId).toBe(123);
      expect(pr.title).toBe('Add new feature');
    });

    it('should accept valid PullRequestFilters object', () => {
      const filters: PullRequestFilters = {
        status: PullRequestStatus.Active,
        creatorId: 'user-123',
        top: 50,
      };
      expect(filters.status).toBe('active');
      expect(filters.top).toBe(50);
    });

    it('should accept valid MyPRsOptions object', () => {
      const options: MyPRsOptions = {
        status: PullRequestStatus.Active,
        role: PullRequestRole.All,
        top: 50,
        output: OutputFormat.Table,
      };
      expect(options.status).toBe('active');
      expect(options.role).toBe('all');
    });
  });
});
```

### 4. Create Unit Tests for Comment Types
Create `tests/unit/types/comment.types.test.ts`:
```typescript
import {
  CommentThreadStatus,
  CommentType,
  OutputFormat,
  type Comment,
  type CommentThread,
  type CommentThreadContext,
  type Identity,
  type PRCommentsOptions,
  type ThreadsResponse,
} from '../../../src/types/comment.types.js';

describe('Comment Types', () => {
  describe('CommentThreadStatus Enum', () => {
    it('should have correct values', () => {
      expect(CommentThreadStatus.Active).toBe('active');
      expect(CommentThreadStatus.Fixed).toBe('fixed');
      expect(CommentThreadStatus.WontFix).toBe('wontFix');
      expect(CommentThreadStatus.Closed).toBe('closed');
      expect(CommentThreadStatus.ByDesign).toBe('byDesign');
      expect(CommentThreadStatus.Pending).toBe('pending');
      expect(CommentThreadStatus.Unknown).toBe('unknown');
    });
  });

  describe('CommentType Enum', () => {
    it('should have correct values', () => {
      expect(CommentType.Text).toBe('text');
      expect(CommentType.CodeChange).toBe('codeChange');
      expect(CommentType.System).toBe('system');
    });
  });

  describe('Type Definitions', () => {
    it('should accept valid Identity object', () => {
      const identity: Identity = {
        id: 'user-123',
        displayName: 'John Doe',
        uniqueName: 'john.doe@example.com',
        imageUrl: 'https://example.com/avatar.jpg',
      };
      expect(identity.id).toBe('user-123');
      expect(identity.displayName).toBe('John Doe');
    });

    it('should accept valid Comment object', () => {
      const comment: Comment = {
        id: 1,
        content: 'This looks good!',
        author: {
          id: 'user-123',
          displayName: 'John Doe',
          uniqueName: 'john.doe@example.com',
        },
        publishedDate: '2024-01-01T00:00:00Z',
        commentType: CommentType.Text,
        isDeleted: false,
      };
      expect(comment.id).toBe(1);
      expect(comment.content).toBe('This looks good!');
    });

    it('should accept valid CommentThreadContext object', () => {
      const context: CommentThreadContext = {
        filePath: 'src/index.ts',
        rightFileStart: { line: 10, offset: 0 },
        rightFileEnd: { line: 15, offset: 0 },
      };
      expect(context.filePath).toBe('src/index.ts');
      expect(context.rightFileStart?.line).toBe(10);
    });

    it('should accept valid CommentThread object', () => {
      const thread: CommentThread = {
        id: 1,
        publishedDate: '2024-01-01T00:00:00Z',
        comments: [],
        status: CommentThreadStatus.Active,
        isDeleted: false,
      };
      expect(thread.id).toBe(1);
      expect(thread.status).toBe('active');
    });

    it('should accept valid PRCommentsOptions object', () => {
      const options: PRCommentsOptions = {
        output: OutputFormat.Table,
        chronological: false,
        open: false,
      };
      expect(options.output).toBe('table');
      expect(options.chronological).toBe(false);
    });

    it('should accept valid ThreadsResponse object', () => {
      const response: ThreadsResponse = {
        value: [],
        count: 0,
      };
      expect(response.count).toBe(0);
      expect(Array.isArray(response.value)).toBe(true);
    });
  });
});
```

### 5. Create tests directory
```bash
mkdir -p tests/unit/types
```

## Dependencies
- Task 1: Project Setup (requires Jest and TypeScript configuration)

## Acceptance Criteria
- [ ] All type definitions are created with proper JSDoc comments
- [ ] Enums are defined for all categorical values
- [ ] Interfaces match Azure DevOps API response structures
- [ ] All types are exported correctly
- [ ] Jest tests pass with 100% coverage for type verification
- [ ] TypeScript compiles without errors
- [ ] No `any` types are used (except in properties field)

## Test Cases
- **Test Case 1: Enum Values**
  - Verify all enum values match expected strings/numbers
  - Expected: All enums have correct values
  
- **Test Case 2: Type Compatibility**
  - Create objects matching each interface
  - Expected: TypeScript accepts valid objects without errors
  
- **Test Case 3: Optional Fields**
  - Create objects with and without optional fields
  - Expected: Both variations compile successfully
  
- **Test Case 4: Import/Export**
  - Import types in test files
  - Expected: All types are properly exported and importable
