import { AuthenticationService, AzureAuthenticationContext, AzureSubscriptionInfo } from "./auth.service.js";
import { AzureCliService } from "./azure-cli.service.js";

export class ConfigService {
  private authService: AuthenticationService;
  private azureCliService: AzureCliService;

  constructor(azureCliService?: AzureCliService, authService?: AuthenticationService) {
    // allow injection in tests
    if (authService) {
      this.authService = authService;
      this.azureCliService = azureCliService || new AzureCliService();
    } else if (azureCliService) {
      this.azureCliService = azureCliService;
      this.authService = new AuthenticationService(azureCliService);
    } else {
      // If nothing provided, create using default AzureCliService
      this.azureCliService = new AzureCliService();
      this.authService = new AuthenticationService(this.azureCliService);
    }
  }

  getAccessToken(): Promise<string> {
    return this.authService.getAccessToken();
  }

  getSubscriptionInfo(): Promise<AzureSubscriptionInfo | undefined> {
    return this.authService.getSubscriptionInfo();
  }

  getAuthenticationContext(): Promise<AzureAuthenticationContext> {
    return this.authService.getAuthenticationContext();
  }

  clearCache(): void {
    this.authService.clearCache();
  }

  /**
   * Get the Azure DevOps organization URL from CLI config
   */
  async getOrganizationUrl(): Promise<string | undefined> {
    try {
      const result = await this.azureCliService.executeAzCommand<{ defaults?: { organization?: string } }>(
        "az devops configure --list --output json",
      );
      return result?.defaults?.organization;
    } catch {
      // Try environment variable as fallback
      return process.env.AZURE_DEVOPS_ORG_URL;
    }
  }

  /**
   * Get the default project from CLI config
   */
  async getDefaultProject(): Promise<string | undefined> {
    try {
      const result = await this.azureCliService.executeAzCommand<{ defaults?: { project?: string } }>(
        "az devops configure --list --output json",
      );
      return result?.defaults?.project;
    } catch {
      // Try environment variable as fallback
      return process.env.AZURE_DEVOPS_PROJECT;
    }
  }
}
