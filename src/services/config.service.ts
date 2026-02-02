import { AuthenticationService, AzureAuthenticationContext, AzureSubscriptionInfo } from './auth.service.js';
import { AzureCliService } from './azure-cli.service.js';

export class ConfigService {
  private authService: AuthenticationService;

  constructor(azureCliService?: AzureCliService, authService?: AuthenticationService) {
    // allow injection in tests
    if (authService) {
      this.authService = authService;
    } else if (azureCliService) {
      this.authService = new AuthenticationService(azureCliService);
    } else {
      // If nothing provided, create using default AzureCliService
      // Lazy require to avoid side effects in tests
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { AzureCliService } = require('./azure-cli.service.js');
      this.authService = new AuthenticationService(new AzureCliService());
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
}
