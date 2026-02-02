# Task 7: Formatters

## Objective
Create professional formatters for displaying pull requests and comments in a readable table format. This task enhances the user experience by replacing the temporary simple output with properly formatted, colored tables using chalk for visual hierarchy.

## Files to Create/Modify
- `src/formatters/pr-table.formatter.ts`
- `src/formatters/comments.formatter.ts`
- `src/commands/pr/my-prs/my-prs.command.ts` (update to use formatter)
- `src/commands/pr/comments/comments.command.ts` (update to use formatter)
- `tests/unit/formatters/pr-table.formatter.test.ts`
- `tests/unit/formatters/comments.formatter.test.ts`

## Implementation Details

### 1. Create PR Table Formatter
Create `src/formatters/pr-table.formatter.ts`:
```typescript
import chalk from 'chalk';
import { PullRequest, PullRequestVote } from '../types/pull-request.types.js';

/**
 * Format a vote value with color
 */
function formatVote(vote: PullRequestVote): string {
  switch (vote) {
    case PullRequestVote.Approved:
      return chalk.green('✓ Approved');
    case PullRequestVote.ApprovedWithSuggestions:
      return chalk.green('✓ Approved (with suggestions)');
    case PullRequestVote.WaitingForAuthor:
      return chalk.yellow('⚠ Waiting for author');
    case PullRequestVote.Rejected:
      return chalk.red('✗ Rejected');
    case PullRequestVote.NoVote:
    default:
      return chalk.gray('- No vote');
  }
}

/**
 * Format PR status with color
 */
function formatStatus(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
      return chalk.blue('Active');
    case 'completed':
      return chalk.green('Completed');
    case 'abandoned':
      return chalk.red('Abandoned');
    default:
      return status;
  }
}

/**
 * Format a date to relative time (e.g., "2 days ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) {
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  }
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
  if (diffMins > 0) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

/**
 * Get branch name from ref
 */
function getBranchName(refName: string): string {
  return refName.replace('refs/heads/', '');
}

/**
 * Format a single PR as a table row
 */
function formatPR(pr: PullRequest, includeRepo: boolean): string {
  const lines: string[] = [];
  
  // Header line with ID and title
  lines.push(
    chalk.bold(`#${pr.pullRequestId}`) +
    ' ' +
    chalk.white(pr.title) +
    (pr.isDraft ? chalk.yellow(' [DRAFT]') : '')
  );

  // Status and creation date
  lines.push(
    '  ' +
    formatStatus(pr.status) +
    ' • ' +
    chalk.gray(`Created ${formatRelativeTime(pr.creationDate)}`) +
    ' by ' +
    chalk.cyan(pr.createdBy.displayName)
  );

  // Repository (if multiple repos)
  if (includeRepo) {
    lines.push('  ' + chalk.gray(`Repository: ${pr.repository.name}`));
  }

  // Branches
  const sourceBranch = getBranchName(pr.sourceRefName);
  const targetBranch = getBranchName(pr.targetRefName);
  lines.push('  ' + chalk.gray(`${sourceBranch} → ${targetBranch}`));

  // Reviewers
  if (pr.reviewers.length > 0) {
    const reviewerSummary = pr.reviewers.map(reviewer => {
      const name = reviewer.displayName;
      const vote = formatVote(reviewer.vote);
      return `    ${name}: ${vote}`;
    });
    lines.push('  Reviewers:');
    lines.push(...reviewerSummary);
  }

  return lines.join('\n');
}

/**
 * Format a list of PRs as a table
 */
export function formatPRTable(prs: PullRequest[]): string {
  if (prs.length === 0) {
    return chalk.yellow('No pull requests found.');
  }

  // Check if there are multiple repositories
  const repos = new Set(prs.map(pr => pr.repository.id));
  const includeRepo = repos.size > 1;

  const lines: string[] = [];
  lines.push('');
  lines.push(chalk.bold(`Found ${prs.length} pull request${prs.length !== 1 ? 's' : ''}:`));
  lines.push('');

  prs.forEach((pr, index) => {
    lines.push(formatPR(pr, includeRepo));
    if (index < prs.length - 1) {
      lines.push(''); // Empty line between PRs
    }
  });

  lines.push('');
  return lines.join('\n');
}

/**
 * Format PR summary statistics
 */
export function formatPRSummary(prs: PullRequest[]): string {
  const active = prs.filter(pr => pr.status === 'active').length;
  const completed = prs.filter(pr => pr.status === 'completed').length;
  const abandoned = prs.filter(pr => pr.status === 'abandoned').length;

  const parts: string[] = [];
  if (active > 0) parts.push(chalk.blue(`${active} active`));
  if (completed > 0) parts.push(chalk.green(`${completed} completed`));
  if (abandoned > 0) parts.push(chalk.red(`${abandoned} abandoned`));

  return parts.join(', ');
}
```

### 2. Create Comments Formatter
Create `src/formatters/comments.formatter.ts`:
```typescript
import chalk from 'chalk';
import {
  CommentThread,
  Comment,
  CommentThreadStatus,
  CommentType,
} from '../types/comment.types.js';

/**
 * Format thread status with color
 */
function formatThreadStatus(status: CommentThreadStatus): string {
  switch (status) {
    case CommentThreadStatus.Active:
      return chalk.yellow('Active');
    case CommentThreadStatus.Fixed:
      return chalk.green('Fixed');
    case CommentThreadStatus.WontFix:
      return chalk.red('Won\'t Fix');
    case CommentThreadStatus.Closed:
      return chalk.gray('Closed');
    case CommentThreadStatus.ByDesign:
      return chalk.blue('By Design');
    case CommentThreadStatus.Pending:
      return chalk.yellow('Pending');
    default:
      return status;
  }
}

/**
 * Format a date to relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) {
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  }
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
  if (diffMins > 0) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

/**
 * Format thread context (file path and line numbers)
 */
function formatThreadContext(thread: CommentThread): string | null {
  if (!thread.threadContext?.filePath) {
    return null;
  }

  const { filePath, rightFileStart, rightFileEnd } = thread.threadContext;
  
  if (rightFileStart && rightFileEnd) {
    if (rightFileStart.line === rightFileEnd.line) {
      return chalk.gray(`${filePath}:${rightFileStart.line}`);
    }
    return chalk.gray(`${filePath}:${rightFileStart.line}-${rightFileEnd.line}`);
  }

  return chalk.gray(filePath);
}

/**
 * Format a single comment
 */
function formatComment(comment: Comment, indent: string, isReply: boolean): string {
  const lines: string[] = [];
  
  // Author and timestamp
  const prefix = isReply ? '  ↳ ' : '';
  lines.push(
    indent +
    prefix +
    chalk.cyan(comment.author.displayName) +
    ' ' +
    chalk.gray(formatRelativeTime(comment.publishedDate))
  );

  // Content (indented)
  const contentLines = comment.content.split('\n');
  contentLines.forEach(line => {
    lines.push(indent + '  ' + line);
  });

  return lines.join('\n');
}

/**
 * Format a comment thread
 */
function formatThread(thread: CommentThread, index: number): string {
  const lines: string[] = [];
  
  // Thread header
  const status = formatThreadStatus(thread.status);
  const context = formatThreadContext(thread);
  
  lines.push(
    chalk.bold(`Thread #${index + 1}`) +
    ' ' +
    status +
    ' ' +
    chalk.gray(formatRelativeTime(thread.publishedDate))
  );

  if (context) {
    lines.push('  ' + context);
  }

  lines.push('');

  // Comments
  if (thread.comments.length === 0) {
    lines.push(chalk.gray('  (No comments)'));
  } else {
    // Find root comments and replies
    const rootComments = thread.comments.filter(c => !c.parentCommentId);
    const replies = thread.comments.filter(c => c.parentCommentId);

    rootComments.forEach((rootComment, idx) => {
      // Format root comment
      lines.push(formatComment(rootComment, '  ', false));

      // Format replies to this comment
      const commentReplies = replies.filter(
        r => r.parentCommentId === rootComment.id
      );
      commentReplies.forEach(reply => {
        lines.push(formatComment(reply, '  ', true));
      });

      // Add spacing between comment groups
      if (idx < rootComments.length - 1 || commentReplies.length > 0) {
        lines.push('');
      }
    });
  }

  return lines.join('\n');
}

/**
 * Format comment threads as nested structure (default view)
 */
export function formatCommentsThreaded(threads: CommentThread[]): string {
  if (threads.length === 0) {
    return chalk.yellow('No comments found.');
  }

  const lines: string[] = [];
  lines.push('');
  lines.push(chalk.bold(`Found ${threads.length} comment thread${threads.length !== 1 ? 's' : ''}:`));
  lines.push('');

  threads.forEach((thread, index) => {
    lines.push(formatThread(thread, index));
    if (index < threads.length - 1) {
      lines.push('');
      lines.push(chalk.gray('─'.repeat(80)));
      lines.push('');
    }
  });

  lines.push('');
  return lines.join('\n');
}

/**
 * Format comment threads in chronological order (flat view)
 */
export function formatCommentsChronological(threads: CommentThread[]): string {
  if (threads.length === 0) {
    return chalk.yellow('No comments found.');
  }

  // Flatten all comments from all threads
  const allComments: Array<{ thread: CommentThread; comment: Comment }> = [];
  
  threads.forEach(thread => {
    thread.comments.forEach(comment => {
      allComments.push({ thread, comment });
    });
  });

  // Sort by published date
  allComments.sort((a, b) => {
    const dateA = new Date(a.comment.publishedDate).getTime();
    const dateB = new Date(b.comment.publishedDate).getTime();
    return dateA - dateB;
  });

  const lines: string[] = [];
  lines.push('');
  lines.push(chalk.bold(`Found ${allComments.length} comment${allComments.length !== 1 ? 's' : ''} (chronological):`));
  lines.push('');

  allComments.forEach((item, index) => {
    const { thread, comment } = item;
    const context = formatThreadContext(thread);
    
    // Author and timestamp
    lines.push(
      chalk.cyan(comment.author.displayName) +
      ' ' +
      chalk.gray(formatRelativeTime(comment.publishedDate))
    );

    // File context if available
    if (context) {
      lines.push('  ' + context);
    }

    // Content
    const contentLines = comment.content.split('\n');
    contentLines.forEach(line => {
      lines.push('  ' + line);
    });

    if (index < allComments.length - 1) {
      lines.push('');
    }
  });

  lines.push('');
  return lines.join('\n');
}
```

### 3. Update My PRs Command to Use Formatter
Update `src/commands/pr/my-prs/my-prs.command.ts`:
```typescript
// Add import at the top
import { formatPRTable } from '../../../formatters/pr-table.formatter.js';

// Replace the output section in the action handler:
        // Output results
        if (myPRsOptions.output === OutputFormat.Json) {
          console.log(JSON.stringify(sortedPRs, null, 2));
        } else {
          console.log(formatPRTable(sortedPRs));
        }
```

### 4. Update Comments Command to Use Formatter
Update `src/commands/pr/comments/comments.command.ts`:
```typescript
// Add imports at the top
import { formatCommentsThreaded, formatCommentsChronological } from '../../../formatters/comments.formatter.js';

// Replace the output section in the action handler:
        // Output results
        if (commentsOptions.output === OutputFormat.Json) {
          console.log(JSON.stringify(sortedThreads, null, 2));
        } else {
          const formatted = commentsOptions.chronological
            ? formatCommentsChronological(sortedThreads)
            : formatCommentsThreaded(sortedThreads);
          console.log(formatted);
        }
```

### 5. Create PR Formatter Tests
Create `tests/unit/formatters/pr-table.formatter.test.ts`:
```typescript
import { jest } from '@jest/globals';
import { formatPRTable, formatPRSummary } from '../../../src/formatters/pr-table.formatter.js';
import { PullRequest, PullRequestVote } from '../../../src/types/pull-request.types.js';

describe('PR Table Formatter', () => {
  const mockPR: PullRequest = {
    pullRequestId: 123,
    title: 'Add new feature',
    status: 'active',
    creationDate: '2024-01-01T10:00:00Z',
    createdBy: {
      id: 'user1',
      displayName: 'John Doe',
      uniqueName: 'john.doe@example.com',
    },
    reviewers: [
      {
        id: 'user2',
        displayName: 'Jane Smith',
        uniqueName: 'jane.smith@example.com',
        vote: PullRequestVote.Approved,
      },
    ],
    repository: {
      id: 'repo1',
      name: 'my-repo',
      project: { id: 'proj1', name: 'MyProject' },
    },
    sourceRefName: 'refs/heads/feature-branch',
    targetRefName: 'refs/heads/main',
    isDraft: false,
  };

  describe('formatPRTable', () => {
    it('should format empty PR list', () => {
      const result = formatPRTable([]);
      expect(result).toContain('No pull requests found');
    });

    it('should format single PR', () => {
      const result = formatPRTable([mockPR]);
      expect(result).toContain('#123');
      expect(result).toContain('Add new feature');
      expect(result).toContain('John Doe');
    });

    it('should format multiple PRs', () => {
      const pr2 = { ...mockPR, pullRequestId: 456, title: 'Fix bug' };
      const result = formatPRTable([mockPR, pr2]);
      expect(result).toContain('#123');
      expect(result).toContain('#456');
      expect(result).toContain('Found 2 pull requests');
    });

    it('should show draft indicator for draft PRs', () => {
      const draftPR = { ...mockPR, isDraft: true };
      const result = formatPRTable([draftPR]);
      expect(result).toContain('DRAFT');
    });

    it('should format reviewer votes', () => {
      const result = formatPRTable([mockPR]);
      expect(result).toContain('Jane Smith');
      expect(result).toContain('Approved');
    });

    it('should show repository when multiple repos exist', () => {
      const pr2 = {
        ...mockPR,
        pullRequestId: 456,
        repository: {
          id: 'repo2',
          name: 'other-repo',
          project: { id: 'proj1', name: 'MyProject' },
        },
      };
      const result = formatPRTable([mockPR, pr2]);
      expect(result).toContain('my-repo');
      expect(result).toContain('other-repo');
    });

    it('should format branch names', () => {
      const result = formatPRTable([mockPR]);
      expect(result).toContain('feature-branch');
      expect(result).toContain('main');
    });
  });

  describe('formatPRSummary', () => {
    it('should format summary with active PRs', () => {
      const result = formatPRSummary([mockPR]);
      expect(result).toContain('1 active');
    });

    it('should format summary with multiple statuses', () => {
      const completedPR = { ...mockPR, status: 'completed' };
      const abandonedPR = { ...mockPR, status: 'abandoned' };
      const result = formatPRSummary([mockPR, completedPR, abandonedPR]);
      expect(result).toContain('active');
      expect(result).toContain('completed');
      expect(result).toContain('abandoned');
    });

    it('should handle empty PR list', () => {
      const result = formatPRSummary([]);
      expect(result).toBe('');
    });
  });
});
```

### 6. Create Comments Formatter Tests
Create `tests/unit/formatters/comments.formatter.test.ts`:
```typescript
import { jest } from '@jest/globals';
import {
  formatCommentsThreaded,
  formatCommentsChronological,
} from '../../../src/formatters/comments.formatter.js';
import {
  CommentThread,
  CommentThreadStatus,
  CommentType,
} from '../../../src/types/comment.types.js';

describe('Comments Formatter', () => {
  const mockThread: CommentThread = {
    id: 1,
    publishedDate: '2024-01-01T10:00:00Z',
    comments: [
      {
        id: 1,
        content: 'This looks good!',
        author: {
          id: 'user1',
          displayName: 'John Doe',
        },
        publishedDate: '2024-01-01T10:00:00Z',
        commentType: CommentType.Text,
      },
      {
        id: 2,
        parentCommentId: 1,
        content: 'Thanks!',
        author: {
          id: 'user2',
          displayName: 'Jane Smith',
        },
        publishedDate: '2024-01-01T10:05:00Z',
        commentType: CommentType.Text,
      },
    ],
    status: CommentThreadStatus.Active,
    threadContext: {
      filePath: 'src/index.ts',
      rightFileStart: { line: 10, offset: 0 },
      rightFileEnd: { line: 10, offset: 0 },
    },
  };

  describe('formatCommentsThreaded', () => {
    it('should format empty thread list', () => {
      const result = formatCommentsThreaded([]);
      expect(result).toContain('No comments found');
    });

    it('should format single thread', () => {
      const result = formatCommentsThreaded([mockThread]);
      expect(result).toContain('Thread #1');
      expect(result).toContain('John Doe');
      expect(result).toContain('This looks good!');
      expect(result).toContain('Jane Smith');
      expect(result).toContain('Thanks!');
    });

    it('should format multiple threads', () => {
      const thread2 = { ...mockThread, id: 2 };
      const result = formatCommentsThreaded([mockThread, thread2]);
      expect(result).toContain('Thread #1');
      expect(result).toContain('Thread #2');
      expect(result).toContain('Found 2 comment threads');
    });

    it('should show file context', () => {
      const result = formatCommentsThreaded([mockThread]);
      expect(result).toContain('src/index.ts');
    });

    it('should show thread status', () => {
      const result = formatCommentsThreaded([mockThread]);
      expect(result).toContain('Active');
    });

    it('should indent replies', () => {
      const result = formatCommentsThreaded([mockThread]);
      expect(result).toContain('↳');
    });

    it('should handle threads with no comments', () => {
      const emptyThread = { ...mockThread, comments: [] };
      const result = formatCommentsThreaded([emptyThread]);
      expect(result).toContain('No comments');
    });
  });

  describe('formatCommentsChronological', () => {
    it('should format empty thread list', () => {
      const result = formatCommentsChronological([]);
      expect(result).toContain('No comments found');
    });

    it('should format comments in chronological order', () => {
      const result = formatCommentsChronological([mockThread]);
      expect(result).toContain('John Doe');
      expect(result).toContain('Jane Smith');
      expect(result).toContain('This looks good!');
      expect(result).toContain('Thanks!');
    });

    it('should flatten comments from multiple threads', () => {
      const thread2 = {
        ...mockThread,
        id: 2,
        comments: [
          {
            id: 3,
            content: 'Another comment',
            author: { id: 'user3', displayName: 'Bob Johnson' },
            publishedDate: '2024-01-01T09:00:00Z',
            commentType: CommentType.Text,
          },
        ],
      };
      const result = formatCommentsChronological([mockThread, thread2]);
      expect(result).toContain('Bob Johnson');
      expect(result).toContain('John Doe');
      expect(result).toContain('Jane Smith');
    });

    it('should show file context for each comment', () => {
      const result = formatCommentsChronological([mockThread]);
      expect(result).toContain('src/index.ts');
    });

    it('should indicate chronological view', () => {
      const result = formatCommentsChronological([mockThread]);
      expect(result).toContain('chronological');
    });
  });
});
```

## Dependencies
- Task 1: Project Setup
- Task 2: Type Definitions
- Task 5: My PRs Command (to update with formatter)
- Task 6: PR Comments Command (to update with formatter)

## Acceptance Criteria
- [ ] PR formatter displays PRs in readable table format
- [ ] PR formatter uses colors for status, votes, and metadata
- [ ] PR formatter shows relative time (e.g., "2 days ago")
- [ ] PR formatter displays reviewers and their votes
- [ ] PR formatter shows repository name when multiple repos exist
- [ ] PR formatter indicates draft PRs
- [ ] Comments formatter displays threads with proper indentation
- [ ] Comments formatter shows file context and line numbers
- [ ] Comments formatter distinguishes root comments from replies
- [ ] Comments formatter supports chronological flat view
- [ ] Comments formatter uses colors for status and metadata
- [ ] My PRs command uses PR formatter for table output
- [ ] Comments command uses comments formatter for table output
- [ ] Jest tests pass with 80%+ coverage for both formatters
- [ ] Manual testing shows readable, professional output

## Test Cases
- **Test Case 1: Empty PR List**
  - Format empty array
  - Expected: Shows "No pull requests found" message
  
- **Test Case 2: Single PR with Reviewers**
  - Format PR with multiple reviewers and different votes
  - Expected: Shows all reviewers with colored vote indicators
  
- **Test Case 3: Multiple Repositories**
  - Format PRs from different repositories
  - Expected: Shows repository name for each PR
  
- **Test Case 4: Draft PR**
  - Format draft PR
  - Expected: Shows [DRAFT] indicator
  
- **Test Case 5: Threaded Comments**
  - Format thread with root comments and replies
  - Expected: Replies are indented with ↳ symbol
  
- **Test Case 6: Chronological Comments**
  - Format comments from multiple threads chronologically
  - Expected: All comments sorted by date, flattened
  
- **Test Case 7: File Context**
  - Format comment with file path and line numbers
  - Expected: Shows "file.ts:10" or "file.ts:10-15"
  
- **Test Case 8: Relative Time Formatting**
  - Format dates at various intervals
  - Expected: Shows "just now", "5 minutes ago", "2 days ago", etc.
  
- **Test Case 9: Comment Thread Status**
  - Format threads with different statuses
  - Expected: Shows colored status (Active, Fixed, Closed, etc.)
  
- **Test Case 10: Integration with Commands**
  - Run my-prs and pr-comments commands
  - Expected: Output uses formatters, looks professional
