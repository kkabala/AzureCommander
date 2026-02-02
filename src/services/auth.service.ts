import { AzureCliService } from './azure-cli.service.js';

export interface AzureSubscriptionInfo {
  id: string;
  name: string;
  tenantId: string;
  state: string;
}

export type TokenSource = 'azure-cli' | 'environment-pat' | 'environment-token';

export interface AzureAuthenticationContext {
  accessToken: string;
  subscription?: AzureSubscriptionInfo;
  source: TokenSource;
}

export class AuthenticationService {
  private cachedToken?: string;
  private cachedSubscription?: AzureSubscriptionInfo | undefined;

  constructor(private azureCliService: AzureCliService) {}

  async getAccessToken(): Promise<string> {
    if (this.cachedToken) {
      return this.cachedToken;
    }

    const pat = this.getEnvVar('AZURE_DEVOPS_EXT_PAT');
    if (pat) {
      this.cachedToken = pat;
      return pat;
    }

    const envToken = this.getEnvVar('AZ_ACCESS_TOKEN');
    if (envToken) {
      this.cachedToken = envToken;
      return envToken;
    }

    try {
      const token = await this.azureCliService.getAzureDevOpsAccessToken();
      if (!token || !token.trim()) {
        throw new Error('Empty token from Azure CLI');
      }
      this.cachedToken = token.trim();
      return this.cachedToken;
    } catch (err: any) {
      const message =
        'Failed to retrieve access token. Make sure one of the following is available: AZURE_DEVOPS_EXT_PAT, AZ_ACCESS_TOKEN, or Azure CLI login.';
      const error = new Error(message);
      // attach original as cause if supported
      (error as any).cause = err;
      throw error;
    }
  }

  private getEnvVar(name: string): string | undefined {
    const v = process.env[name];
    if (!v) return undefined;
    const trimmed = v.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  async getSubscriptionInfo(): Promise<AzureSubscriptionInfo | undefined> {
    if (this.cachedSubscription) return this.cachedSubscription;

    try {
      const installed = await this.azureCliService.isInstalled();
      if (!installed) return undefined;

      const authenticated = await this.azureCliService.isAuthenticated();
      if (!authenticated) return undefined;

      const result: any = await this.azureCliService.executeAzCommand('az account show --output json');
      if (!result || typeof result !== 'object') return undefined;

      const id = result.id;
      const name = result.name;
      const tenantId = result.tenantId || result.homeTenantId;
      const state = result.state || 'Unknown';

      if (!id || !name) return undefined;

      const info: AzureSubscriptionInfo = {
        id: String(id),
        name: String(name),
        tenantId: String(tenantId || ''),
        state: String(state),
      };

      this.cachedSubscription = info;
      return info;
    } catch {
      return undefined;
    }
  }

  async getAuthenticationContext(): Promise<AzureAuthenticationContext> {
    const token = await this.getAccessToken();

    const source: TokenSource = this.getEnvVar('AZURE_DEVOPS_EXT_PAT')
      ? 'environment-pat'
      : this.getEnvVar('AZ_ACCESS_TOKEN')
      ? 'environment-token'
      : 'azure-cli';

    const context: AzureAuthenticationContext = {
      accessToken: token,
      source,
    };

    if (source === 'azure-cli') {
      const subscription = await this.getSubscriptionInfo();
      if (subscription) context.subscription = subscription;
    }

    return context;
  }

  clearCache(): void {
    this.cachedToken = undefined;
    this.cachedSubscription = undefined;
  }
}
