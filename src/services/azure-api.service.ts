import { ConfigService } from './config.service.js';

export class AzureApiService {
  constructor(private configService: ConfigService) {}

  async getAuthorizationHeader(): Promise<string> {
    const token = await this.configService.getAccessToken();
    return `Bearer ${token}`;
  }
}
