import { AzureCliService } from "../../../services/azure-cli.service.js";
import { ConfigService } from "../../../services/config.service.js";
import {
  PullRequest,
  PullRequestFilters,
  PullRequestRole,
  PullRequestStatus,
  MyPRsOptions,
} from "../../../types/pull-request.types.js";

export class MyPRsService {
  private azureCliService: AzureCliService;

  constructor(azureCliService?: AzureCliService, _configService?: ConfigService) {
    this.azureCliService = azureCliService || new AzureCliService();
  }

  async fetchMyPRs(options: MyPRsOptions): Promise<PullRequest[]> {
    const role = options.role;

    if (role === PullRequestRole.Author) {
      return this.fetchMyCreatedPRs(options);
    }

    if (role === PullRequestRole.Reviewer) {
      return this.fetchMyReviewPRs(options);
    }

    return this.fetchAndMergePRsFromAllRoles(options);
  }

  async fetchMyCreatedPRs(options: MyPRsOptions): Promise<PullRequest[]> {
    const filters = this.buildFilters(options);
    const filterArgs = this.buildFilterArgs(filters);
    const command = this.buildCreatedPRsCommand(filterArgs);

    try {
      const prs = await this.azureCliService.executeAzCommand<PullRequest[]>(command);
      return prs || [];
    } catch (error) {
      console.error("Failed to fetch created PRs:", error);
      return [];
    }
  }

  async fetchMyReviewPRs(options: MyPRsOptions): Promise<PullRequest[]> {
    const filters = this.buildFilters(options);
    const filterArgs = this.buildFilterArgs(filters);
    const command = this.buildAllPRsCommand(filterArgs);

    try {
      const allPrs = await this.azureCliService.executeAzCommand<PullRequest[]>(command);

      if (!allPrs || allPrs.length === 0) {
        return [];
      }

      const userId = await this.getCurrentUserId();
      return this.filterPRsByReviewer(allPrs, userId);
    } catch (error) {
      console.error("Failed to fetch review PRs:", error);
      return [];
    }
  }

  sortPRs(prs: PullRequest[]): PullRequest[] {
    return [...prs].sort((a, b) => {
      const dateA = new Date(a.creationDate).getTime();
      const dateB = new Date(b.creationDate).getTime();
      return dateB - dateA;
    });
  }

  private async fetchAndMergePRsFromAllRoles(options: MyPRsOptions): Promise<PullRequest[]> {
    const [createdPRs, reviewPRs] = await Promise.all([
      this.fetchMyCreatedPRs(options),
      this.fetchMyReviewPRs(options),
    ]);

    return this.deduplicatePRs(createdPRs, reviewPRs);
  }

  private async getCurrentUserId(): Promise<string> {
    const account = await this.azureCliService.executeAzCommand<string>(
      "az ad signed-in-user show --query id --output json",
    );
    return account;
  }

  private buildFilters(options: MyPRsOptions): PullRequestFilters {
    const filters: PullRequestFilters = {
      status: options.status,
      top: options.top,
    };

    if (options.project) {
      filters.project = options.project;
    }

    if (options.repo) {
      filters.repositoryId = options.repo;
    }

    return filters;
  }

  private buildFilterArgs(filters: PullRequestFilters): string {
    const args: string[] = [];

    if (filters.status && filters.status !== PullRequestStatus.All) {
      args.push(`--status ${filters.status}`);
    }

    if (filters.project) {
      args.push(`--project "${filters.project}"`);
    }

    if (filters.repositoryId) {
      args.push(`--repository "${filters.repositoryId}"`);
    }

    if (filters.top) {
      args.push(`--top ${filters.top}`);
    }

    return args.join(" ");
  }

  private buildCreatedPRsCommand(filterArgs: string): string {
    return `az repos pr list --creator @me ${filterArgs} --output json`;
  }

  private buildAllPRsCommand(filterArgs: string): string {
    return `az repos pr list ${filterArgs} --output json`;
  }

  private filterPRsByReviewer(allPrs: PullRequest[], userId: string): PullRequest[] {
    return allPrs.filter((pr) => this.userIsReviewer(pr, userId));
  }

  private userIsReviewer(pr: PullRequest, userId: string): boolean {
    return pr.reviewers.some((reviewer) => reviewer.id === userId);
  }

  private deduplicatePRs(...prLists: PullRequest[][]): PullRequest[] {
    const prMap = new Map<number, PullRequest>();

    for (const prList of prLists) {
      for (const pr of prList) {
        if (!prMap.has(pr.pullRequestId)) {
          prMap.set(pr.pullRequestId, pr);
        }
      }
    }

    return Array.from(prMap.values());
  }
}
