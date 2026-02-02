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
