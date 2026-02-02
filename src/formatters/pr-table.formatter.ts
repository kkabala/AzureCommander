import chalk from "chalk";
import { PullRequest, PullRequestVote, Reviewer } from "../types/pull-request.types.js";

function formatVote(vote: PullRequestVote): string {
  switch (vote) {
    case PullRequestVote.Approved:
      return chalk.green("✓ Approved");
    case PullRequestVote.ApprovedWithSuggestions:
      return chalk.green("✓ Approved (with suggestions)");
    case PullRequestVote.WaitingForAuthor:
      return chalk.yellow("⚠ Waiting for author");
    case PullRequestVote.Rejected:
      return chalk.red("✗ Rejected");
    case PullRequestVote.NoVote:
    default:
      return chalk.gray("- No vote");
  }
}

function formatStatus(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
      return chalk.blue("Active");
    case "completed":
      return chalk.green("Completed");
    case "abandoned":
      return chalk.red("Abandoned");
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

function getBranchName(refName: string): string {
  return refName.replace("refs/heads/", "");
}

function formatPR(pr: PullRequest, includeRepo: boolean): string {
  const lines: string[] = [];

  lines.push(buildHeaderLine(pr));
  lines.push(buildStatusLine(pr));

  if (includeRepo) {
    lines.push(buildRepositoryLine(pr));
  }

  lines.push(buildBranchesLine(pr));

  if (hasReviewers(pr)) {
    lines.push(...buildReviewersSection(pr));
  }

  return lines.join("\n");
}

function buildHeaderLine(pr: PullRequest): string {
  return (
    chalk.bold(`#${pr.pullRequestId}`) + " " + chalk.white(pr.title) + (pr.isDraft ? chalk.yellow(" [DRAFT]") : "")
  );
}

function buildStatusLine(pr: PullRequest): string {
  return (
    "  " +
    formatStatus(pr.status) +
    " • " +
    chalk.gray(`Created ${formatRelativeTime(pr.creationDate)}`) +
    " by " +
    chalk.cyan(pr.createdBy.displayName)
  );
}

function buildRepositoryLine(pr: PullRequest): string {
  return "  " + chalk.gray(`Repository: ${pr.repository.name}`);
}

function buildBranchesLine(pr: PullRequest): string {
  const sourceBranch = getBranchName(pr.sourceRefName);
  const targetBranch = getBranchName(pr.targetRefName);
  return "  " + chalk.gray(`${sourceBranch} → ${targetBranch}`);
}

function hasReviewers(pr: PullRequest): boolean {
  return pr.reviewers.length > 0;
}

function buildReviewersSection(pr: PullRequest): string[] {
  const reviewerSummary = pr.reviewers.map(
    (reviewer: Reviewer) => `    ${reviewer.displayName}: ${formatVote(reviewer.vote)}`,
  );
  return ["  Reviewers:", ...reviewerSummary];
}

function shouldIncludeRepository(prs: PullRequest[]): boolean {
  const repos = new Set(prs.map((pr) => pr.repository.id));
  return repos.size > 1;
}

function buildTableHeader(prCount: number): string[] {
  const lines: string[] = [];
  lines.push("");
  lines.push(chalk.bold(`Found ${prCount} pull request${prCount !== 1 ? "s" : ""}:`));
  lines.push("");
  return lines;
}

function formatPRList(prs: PullRequest[], includeRepo: boolean): string[] {
  const lines: string[] = [];

  prs.forEach((pr, index) => {
    lines.push(formatPR(pr, includeRepo));

    if (index < prs.length - 1) {
      lines.push("");
    }
  });

  return lines;
}

export function formatPRTable(prs: PullRequest[]): string {
  if (prs.length === 0) {
    return chalk.yellow("No pull requests found.");
  }

  const includeRepo = shouldIncludeRepository(prs);

  const lines: string[] = [];
  lines.push(...buildTableHeader(prs.length));
  lines.push(...formatPRList(prs, includeRepo));
  lines.push("");

  return lines.join("\n");
}

function countPRsByStatus(prs: PullRequest[], status: string): number {
  return prs.filter((pr) => pr.status === status).length;
}

function buildSummaryPart(count: number, label: string, colorFn: (text: string) => string): string {
  return colorFn(`${count} ${label}`);
}

function buildSummaryParts(prs: PullRequest[]): string[] {
  const parts: string[] = [];

  const active = countPRsByStatus(prs, "active");
  const completed = countPRsByStatus(prs, "completed");
  const abandoned = countPRsByStatus(prs, "abandoned");

  if (active > 0) {
    parts.push(buildSummaryPart(active, "active", chalk.blue));
  }
  if (completed > 0) {
    parts.push(buildSummaryPart(completed, "completed", chalk.green));
  }
  if (abandoned > 0) {
    parts.push(buildSummaryPart(abandoned, "abandoned", chalk.red));
  }

  return parts;
}

export function formatPRSummary(prs: PullRequest[]): string {
  const parts = buildSummaryParts(prs);
  return parts.join(", ");
}
