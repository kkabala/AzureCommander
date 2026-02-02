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
