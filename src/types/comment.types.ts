/**
 * Output format for displaying comments
 */
export enum OutputFormat {
  Table = 'table',
  Json = 'json',
}

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
