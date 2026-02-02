import chalk from "chalk";
import { CommentThread, CommentThreadStatus, Comment } from "../types/comment.types.js";

interface ChronologicalCommentItem {
  thread: CommentThread;
  comment: Comment;
}

function formatThreadStatus(status: CommentThreadStatus): string {
  switch (status) {
    case CommentThreadStatus.Active:
      return chalk.yellow("Active");
    case CommentThreadStatus.Fixed:
      return chalk.green("Fixed");
    case CommentThreadStatus.WontFix:
      return chalk.red("Won't Fix");
    case CommentThreadStatus.Closed:
      return chalk.gray("Closed");
    case CommentThreadStatus.ByDesign:
      return chalk.blue("By Design");
    case CommentThreadStatus.Pending:
      return chalk.yellow("Pending");
    default:
      return status;
  }
}

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
    return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
  }
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  }
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  }
  if (diffMins > 0) {
    return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

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

function formatComment(comment: Comment, indent: string, isReply: boolean): string {
  const lines: string[] = [];
  lines.push(buildCommentHeader(comment, indent, isReply));
  lines.push(...buildCommentContent(comment, indent));
  return lines.join("\n");
}

function buildCommentHeader(comment: Comment, indent: string, isReply: boolean): string {
  const prefix = isReply ? "  ↳ " : "";
  return (
    indent +
    prefix +
    chalk.cyan(comment.author.displayName) +
    " " +
    chalk.gray(formatRelativeTime(comment.publishedDate))
  );
}

function buildCommentContent(comment: Comment, indent: string): string[] {
  const contentLines = comment.content.split("\n");
  return contentLines.map((line) => indent + "  " + line);
}

function separateRootCommentsAndReplies(comments: Comment[]): {
  rootComments: Comment[];
  replies: Comment[];
} {
  return {
    rootComments: comments.filter((c) => !c.parentCommentId),
    replies: comments.filter((c) => c.parentCommentId),
  };
}

function findRepliesToComment(replies: Comment[], commentId: number): Comment[] {
  return replies.filter((r) => r.parentCommentId === commentId);
}

function formatThreadComments(thread: CommentThread): string[] {
  const lines: string[] = [];

  if (thread.comments.length === 0) {
    lines.push(chalk.gray("  (No comments)"));
    return lines;
  }

  const { rootComments, replies } = separateRootCommentsAndReplies(thread.comments);

  rootComments.forEach((rootComment, idx) => {
    lines.push(formatComment(rootComment, "  ", false));

    const commentReplies = findRepliesToComment(replies, rootComment.id);
    commentReplies.forEach((reply) => {
      lines.push(formatComment(reply, "  ", true));
    });

    if (idx < rootComments.length - 1 || commentReplies.length > 0) {
      lines.push("");
    }
  });

  return lines;
}

function buildThreadHeader(thread: CommentThread, index: number): string[] {
  const lines: string[] = [];
  const status = formatThreadStatus(thread.status);
  const context = formatThreadContext(thread);

  lines.push(
    chalk.bold(`Thread #${index + 1}`) + " " + status + " " + chalk.gray(formatRelativeTime(thread.publishedDate)),
  );

  if (context) {
    lines.push("  " + context);
  }

  lines.push("");
  return lines;
}

function formatThread(thread: CommentThread, index: number): string {
  const lines: string[] = [];
  lines.push(...buildThreadHeader(thread, index));
  lines.push(...formatThreadComments(thread));
  return lines.join("\n");
}

function buildThreadedHeader(threadCount: number): string[] {
  const lines: string[] = [];
  lines.push("");
  lines.push(chalk.bold(`Found ${threadCount} comment thread${threadCount !== 1 ? "s" : ""}:`));
  lines.push("");
  return lines;
}

function formatThreadList(threads: CommentThread[]): string[] {
  const lines: string[] = [];

  threads.forEach((thread, index) => {
    lines.push(formatThread(thread, index));

    if (index < threads.length - 1) {
      lines.push("");
      lines.push(chalk.gray("─".repeat(80)));
      lines.push("");
    }
  });

  return lines;
}

export function formatCommentsThreaded(threads: CommentThread[]): string {
  if (threads.length === 0) {
    return chalk.yellow("No comments found.");
  }

  const lines: string[] = [];
  lines.push(...buildThreadedHeader(threads.length));
  lines.push(...formatThreadList(threads));
  lines.push("");

  return lines.join("\n");
}

function flattenCommentsFromThreads(threads: CommentThread[]): ChronologicalCommentItem[] {
  const allComments: ChronologicalCommentItem[] = [];

  threads.forEach((thread) => {
    thread.comments.forEach((comment) => {
      allComments.push({ thread, comment });
    });
  });

  return allComments;
}

function sortCommentsByDate(comments: ChronologicalCommentItem[]): ChronologicalCommentItem[] {
  return comments.sort((a, b) => {
    const dateA = new Date(a.comment.publishedDate).getTime();
    const dateB = new Date(b.comment.publishedDate).getTime();
    return dateA - dateB;
  });
}

function buildChronologicalHeader(commentCount: number): string[] {
  const lines: string[] = [];
  lines.push("");
  lines.push(chalk.bold(`Found ${commentCount} comment${commentCount !== 1 ? "s" : ""} (chronological):`));
  lines.push("");
  return lines;
}

function formatChronologicalComment(thread: CommentThread, comment: Comment): string[] {
  const lines: string[] = [];
  const context = formatThreadContext(thread);

  lines.push(chalk.cyan(comment.author.displayName) + " " + chalk.gray(formatRelativeTime(comment.publishedDate)));

  if (context) {
    lines.push("  " + context);
  }

  const contentLines = comment.content.split("\n");
  contentLines.forEach((line) => {
    lines.push("  " + line);
  });

  return lines;
}

function formatChronologicalCommentList(sortedComments: ChronologicalCommentItem[]): string[] {
  const lines: string[] = [];

  sortedComments.forEach((item, index) => {
    const { thread, comment } = item;
    lines.push(...formatChronologicalComment(thread, comment));

    if (index < sortedComments.length - 1) {
      lines.push("");
    }
  });

  return lines;
}

export function formatCommentsChronological(threads: CommentThread[]): string {
  if (threads.length === 0) {
    return chalk.yellow("No comments found.");
  }

  const allComments = flattenCommentsFromThreads(threads);
  const sortedComments = sortCommentsByDate(allComments);

  const lines: string[] = [];
  lines.push(...buildChronologicalHeader(allComments.length));
  lines.push(...formatChronologicalCommentList(sortedComments));
  lines.push("");

  return lines.join("\n");
}
