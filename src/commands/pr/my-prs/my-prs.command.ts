import { Command } from "commander";
import {
  PullRequestStatus,
  PullRequestRole,
  OutputFormat,
  PullRequest,
  MyPRsOptions,
} from "../../../types/pull-request.types.js";
import { MyPRsService } from "./my-prs.service.js";

interface RawCommandOptions {
  status: string;
  repo?: string;
  project?: string;
  role: string;
  top: string;
  output: string;
}

export function createMyPRsCommand(): Command {
  const command = new Command("my-prs");

  command
    .description("List pull requests where you are the author or reviewer")
    .option("-s, --status <status>", "Filter by status (active, completed, abandoned, all)", PullRequestStatus.Active)
    .option("-r, --repo <repository>", "Filter by repository name")
    .option("-p, --project <project>", "Project name")
    .option("--role <role>", "Filter by role (all, author, reviewer)", PullRequestRole.All)
    .option("-n, --top <number>", "Maximum number of results", "50")
    .option("-o, --output <format>", "Output format (table, json)", OutputFormat.Table)
    .action(async (options: RawCommandOptions) => {
      try {
        const myPRsOptions = parseOptions(options);
        validateOptions(myPRsOptions, options);

        const service = new MyPRsService();
        const prs = await service.fetchMyPRs(myPRsOptions);
        const sortedPRs = service.sortPRs(prs);

        displayResults(sortedPRs, myPRsOptions.output);
      } catch (error) {
        handleError(error as Error);
      }
    });

  return command;
}

function parseOptions(options: RawCommandOptions): MyPRsOptions {
  return {
    status: options.status as PullRequestStatus,
    role: options.role as PullRequestRole,
    top: parseInt(options.top, 10),
    output: options.output as OutputFormat,
    repo: options.repo,
    project: options.project,
  };
}

function validateOptions(myPRsOptions: MyPRsOptions, rawOptions: RawCommandOptions): void {
  validateStatus(myPRsOptions.status, rawOptions.status);
  validateRole(myPRsOptions.role, rawOptions.role);
  validateOutputFormat(myPRsOptions.output, rawOptions.output);
}

function validateStatus(status: PullRequestStatus, rawStatus: string): void {
  if (!Object.values(PullRequestStatus).includes(status)) {
    console.error(`Invalid status: ${rawStatus}`);
    console.error(`Valid values: ${Object.values(PullRequestStatus).join(", ")}`);
    process.exit(1);
  }
}

function validateRole(role: PullRequestRole, rawRole: string): void {
  if (!Object.values(PullRequestRole).includes(role)) {
    console.error(`Invalid role: ${rawRole}`);
    console.error(`Valid values: ${Object.values(PullRequestRole).join(", ")}`);
    process.exit(1);
  }
}

function validateOutputFormat(format: OutputFormat, rawFormat: string): void {
  if (!Object.values(OutputFormat).includes(format)) {
    console.error(`Invalid output format: ${rawFormat}`);
    console.error(`Valid values: ${Object.values(OutputFormat).join(", ")}`);
    process.exit(1);
  }
}

function displayResults(sortedPRs: PullRequest[], output: OutputFormat): void {
  if (output === OutputFormat.Json) {
    displayJsonOutput(sortedPRs);
  } else {
    displayTableOutput(sortedPRs);
  }
}

function displayJsonOutput(sortedPRs: PullRequest[]): void {
  console.log(JSON.stringify(sortedPRs, null, 2));
}

function displayTableOutput(sortedPRs: PullRequest[]): void {
  if (sortedPRs.length === 0) {
    console.log("No pull requests found.");
    return;
  }

  console.log(`\nFound ${sortedPRs.length} pull request(s):\n`);

  sortedPRs.forEach((pr) => {
    displayPullRequest(pr);
  });
}

function displayPullRequest(pr: PullRequest): void {
  console.log(`#${pr.pullRequestId} - ${pr.title}`);
  console.log(`  Status: ${pr.status} | Created: ${pr.creationDate}`);
  console.log(`  Repo: ${pr.repository.name}\n`);
}

function handleError(error: Error): void {
  console.error("Error fetching pull requests:", error.message);
  process.exit(1);
}
