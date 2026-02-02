import { ConfigService } from "./config.service.js";

export class AzureApiService {
  constructor(private configService: ConfigService) {}

  async getAuthorizationHeader(): Promise<string> {
    const token = await this.configService.getAccessToken();
    return `Bearer ${token}`;
  }

  /**
   * Make a GET request to the Azure DevOps REST API
   */
  async get<T>(apiPath: string, project?: string): Promise<T> {
    const orgUrl = await this.configService.getOrganizationUrl();
    if (!orgUrl) {
      throw new Error("Organization URL not configured");
    }

    const baseUrl = project ? `${orgUrl}/${project}/_apis` : `${orgUrl}/_apis`;

    const url = `${baseUrl}/${apiPath}`;
    const authHeader = await this.getAuthorizationHeader();

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }
}
