import { AzureApiService } from "../../../services/azure-api.service.js";
import { AzureCliService } from "../../../services/azure-cli.service.js";
import { ConfigService } from "../../../services/config.service.js";
import { CommentThread, PRCommentsOptions, ThreadsResponse } from "../../../types/comment.types.js";
import { PullRequest } from "../../../types/pull-request.types.js";

export class CommentsService {
  private azureApiService: AzureApiService;
  private azureCliService: AzureCliService;
  private configService: ConfigService;

  constructor(azureApiService?: AzureApiService, azureCliService?: AzureCliService, configService?: ConfigService) {
    this.azureCliService = azureCliService || new AzureCliService();
    this.configService = configService || new ConfigService(this.azureCliService);
    this.azureApiService = azureApiService || new AzureApiService(this.configService);
  }

  async fetchCommentThreads(prId: number, options: PRCommentsOptions): Promise<CommentThread[]> {
    let project = options.project;
    let repositoryId: string;

    if (!project || !options.repo) {
      const prDetails = await this.fetchPRDetails(prId, options.project, options.repo);

      if (!prDetails) {
        throw new Error(`Pull request ${prId} not found`);
      }

      project = project || prDetails.repository.project.name;
      repositoryId = prDetails.repository.id;
    } else {
      const prDetails = await this.fetchPRDetails(prId, project, options.repo);

      if (!prDetails) {
        throw new Error(`Pull request ${prId} not found`);
      }

      repositoryId = prDetails.repository.id;
    }

    const apiPath = this.buildThreadsApiPath(repositoryId, prId);

    try {
      const response = await this.azureApiService.get<ThreadsResponse>(apiPath, project);
      return response.value || [];
    } catch (error) {
      throw new Error(`Failed to fetch comment threads: ${(error as Error).message}`);
    }
  }

  sortThreads(threads: CommentThread[], chronological: boolean): CommentThread[] {
    return [...threads].sort((a, b) => {
      const dateA = new Date(a.publishedDate).getTime();
      const dateB = new Date(b.publishedDate).getTime();
      return chronological ? dateA - dateB : dateB - dateA;
    });
  }

  filterDeletedThreads(threads: CommentThread[]): CommentThread[] {
    return threads.filter((thread) => !thread.isDeleted);
  }

  async buildPRUrl(prId: number, project?: string): Promise<string | undefined> {
    const orgUrl = await this.configService.getOrganizationUrl();

    if (!orgUrl) {
      return undefined;
    }

    if (!project) {
      const prDetails = await this.fetchPRDetails(prId);

      if (prDetails) {
        project = prDetails.repository.project.name;
      }
    }

    if (!project) {
      return undefined;
    }

    return `${orgUrl}/${project}/_git/pullrequest/${prId}`;
  }

  async fetchPRDetails(prId: number, project?: string, repo?: string): Promise<PullRequest | null> {
    try {
      const command = this.buildPRShowCommand(prId, project, repo);
      const pr = await this.azureCliService.executeAzCommand<PullRequest>(command);
      return pr;
    } catch (error) {
      console.error("Failed to fetch PR details:", error);
      return null;
    }
  }

  private buildPRShowCommand(prId: number, project?: string, repo?: string): string {
    let command = `az repos pr show --id ${prId} --output json`;

    if (project) {
      command += ` --project "${project}"`;
    }

    if (repo) {
      command += ` --repository "${repo}"`;
    }

    return command;
  }

  private buildThreadsApiPath(repositoryId: string, prId: number): string {
    return `/_apis/git/repositories/${repositoryId}/pullRequests/${prId}/threads?api-version=7.0`;
  }
}
