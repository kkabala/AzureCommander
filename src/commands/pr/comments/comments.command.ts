import { Command } from "commander";
import open from "open";
import { OutputFormat, CommentThread, PRCommentsOptions } from "../../../types/comment.types.js";
import { CommentsService } from "./comments.service.js";

interface RawCommandOptions {
  project?: string;
  repo?: string;
  output: string;
  chronological: boolean;
  open: boolean;
}

export function createPRCommentsCommand(): Command {
  const command = new Command("pr-comments");

  command
    .description("Display comments for a specific pull request")
    .argument("<pr-id>", "Pull request ID")
    .option("-p, --project <project>", "Project name")
    .option("-r, --repo <repository>", "Repository name")
    .option("-o, --output <format>", "Output format (table, json)", OutputFormat.Table)
    .option("--chronological", "Display comments in chronological order", false)
    .option("--open", "Open the pull request in browser", false)
    .action(async (prIdStr: string, options: RawCommandOptions) => {
      try {
        const prId = parsePullRequestId(prIdStr);
        const commentsOptions = buildCommentsOptions(options);

        validateOutputFormat(commentsOptions.output);

        const service = new CommentsService();

        await handleOpenInBrowser(service, prId, commentsOptions, options);

        const threads = await service.fetchCommentThreads(prId, commentsOptions);
        const filteredThreads = service.filterDeletedThreads(threads);
        const sortedThreads = service.sortThreads(filteredThreads, commentsOptions.chronological);

        displayResults(sortedThreads, commentsOptions.output, prId);
      } catch (error) {
        console.error("Error fetching comments:", (error as Error).message);
        process.exit(1);
      }
    });

  return command;
}

function parsePullRequestId(prIdStr: string): number {
  const prId = parseInt(prIdStr, 10);

  if (isNaN(prId) || prId <= 0) {
    console.error("Invalid pull request ID. Must be a positive number.");
    process.exit(1);
  }

  return prId;
}

function buildCommentsOptions(options: RawCommandOptions): PRCommentsOptions {
  return {
    output: options.output as OutputFormat,
    chronological: options.chronological,
    open: options.open,
    project: options.project,
    repo: options.repo,
  };
}

function validateOutputFormat(output: OutputFormat): void {
  if (!Object.values(OutputFormat).includes(output)) {
    console.error(`Invalid output format: ${output}`);
    console.error(`Valid values: ${Object.values(OutputFormat).join(", ")}`);
    process.exit(1);
  }
}

async function handleOpenInBrowser(
  service: CommentsService,
  prId: number,
  commentsOptions: PRCommentsOptions,
  options: RawCommandOptions,
): Promise<void> {
  if (commentsOptions.open) {
    const url = await service.buildPRUrl(prId, commentsOptions.project);

    if (url) {
      console.log(`Opening pull request in browser: ${url}`);
      await open(url);
    } else {
      console.error("Could not determine PR URL. Organization or project not configured.");
    }

    if (!options.output) {
      process.exit(0);
    }
  }
}

function displayResults(threads: CommentThread[], format: OutputFormat, prId: number): void {
  if (format === OutputFormat.Json) {
    displayJsonOutput(threads);
  } else {
    displayTableOutput(threads, prId);
  }
}

function displayJsonOutput(threads: CommentThread[]): void {
  console.log(JSON.stringify(threads, null, 2));
}

function displayTableOutput(threads: CommentThread[], prId: number): void {
  if (threads.length === 0) {
    console.log(`No comments found for PR #${prId}.`);
  } else {
    console.log(`\nFound ${threads.length} comment thread(s) for PR #${prId}:\n`);

    threads.forEach((thread, index) => {
      console.log(`Thread #${index + 1} (Status: ${thread.status})`);
      console.log(`  Published: ${thread.publishedDate}`);

      if (thread.threadContext?.filePath) {
        console.log(`  File: ${thread.threadContext.filePath}`);
      }

      console.log(`  Comments: ${thread.comments.length}\n`);
    });
  }
}
