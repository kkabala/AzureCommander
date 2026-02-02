import { jest } from '@jest/globals';
import { AuthenticationService } from '../../../src/services/auth.service.js';
import { AzureCliService } from '../../../src/services/azure-cli.service.js';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let mockAzureCliService: jest.Mocked<AzureCliService>;

  beforeEach(() => {
    delete process.env.AZURE_DEVOPS_EXT_PAT;
    delete process.env.AZ_ACCESS_TOKEN;

    mockAzureCliService = {
      getAzureDevOpsAccessToken: jest.fn(),
      isInstalled: jest.fn(),
      isAuthenticated: jest.fn(),
      executeAzCommand: jest.fn(),
    } as any;

    service = new AuthenticationService(mockAzureCliService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAccessToken', () => {
    it('should retrieve token from AZURE_DEVOPS_EXT_PAT environment variable', async () => {
      process.env.AZURE_DEVOPS_EXT_PAT = 'test-pat-token';

      const token = await service.getAccessToken();

      expect(token).toBe('test-pat-token');
      expect(mockAzureCliService.getAzureDevOpsAccessToken).not.toHaveBeenCalled();
    });

    it('should trim whitespace from AZURE_DEVOPS_EXT_PAT', async () => {
      process.env.AZURE_DEVOPS_EXT_PAT = '  test-pat-token  ';

      const token = await service.getAccessToken();

      expect(token).toBe('test-pat-token');
    });

    it('should retrieve token from AZ_ACCESS_TOKEN environment variable', async () => {
      process.env.AZ_ACCESS_TOKEN = 'test-access-token';

      const token = await service.getAccessToken();

      expect(token).toBe('test-access-token');
      expect(mockAzureCliService.getAzureDevOpsAccessToken).not.toHaveBeenCalled();
    });

    it('should trim whitespace from AZ_ACCESS_TOKEN', async () => {
      process.env.AZ_ACCESS_TOKEN = '  test-access-token  ';

      const token = await service.getAccessToken();

      expect(token).toBe('test-access-token');
    });

    it('should prioritize AZURE_DEVOPS_EXT_PAT over AZ_ACCESS_TOKEN', async () => {
      process.env.AZURE_DEVOPS_EXT_PAT = 'pat-token';
      process.env.AZ_ACCESS_TOKEN = 'access-token';

      const token = await service.getAccessToken();

      expect(token).toBe('pat-token');
    });

    it('should retrieve token from Azure CLI when env vars not set', async () => {
      mockAzureCliService.getAzureDevOpsAccessToken.mockResolvedValue('cli-token');

      const token = await service.getAccessToken();

      expect(token).toBe('cli-token');
      expect(mockAzureCliService.getAzureDevOpsAccessToken).toHaveBeenCalled();
    });

    it('should cache token after first retrieval', async () => {
      mockAzureCliService.getAzureDevOpsAccessToken.mockResolvedValue('cli-token');

      const token1 = await service.getAccessToken();
      const token2 = await service.getAccessToken();

      expect(token1).toBe('cli-token');
      expect(token2).toBe('cli-token');
      expect(mockAzureCliService.getAzureDevOpsAccessToken).toHaveBeenCalledTimes(1);
    });

    it('should throw descriptive error when token cannot be retrieved', async () => {
      mockAzureCliService.getAzureDevOpsAccessToken.mockRejectedValue(
        new Error('CLI error')
      );

      await expect(service.getAccessToken()).rejects.toThrow(
        'Failed to retrieve access token'
      );
      await expect(service.getAccessToken()).rejects.toThrow(
        'AZURE_DEVOPS_EXT_PAT'
      );
      await expect(service.getAccessToken()).rejects.toThrow(
        'AZ_ACCESS_TOKEN'
      );
    });

    it('should include original error as cause', async () => {
      const originalError = new Error('CLI error');
      mockAzureCliService.getAzureDevOpsAccessToken.mockRejectedValue(originalError);

      try {
        await service.getAccessToken();
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.cause).toBe(originalError);
      }
    });
  });

  describe('getSubscriptionInfo', () => {
    it('should retrieve subscription info from Azure CLI', async () => {
      mockAzureCliService.isInstalled.mockResolvedValue(true);
      mockAzureCliService.isAuthenticated.mockResolvedValue(true);
      mockAzureCliService.executeAzCommand.mockResolvedValue({
        id: 'sub-123',
        name: 'My Subscription',
        tenantId: 'tenant-456',
        state: 'Enabled',
      });

      const info = await service.getSubscriptionInfo();

      expect(info).toEqual({
        id: 'sub-123',
        name: 'My Subscription',
        tenantId: 'tenant-456',
        state: 'Enabled',
      });
      expect(mockAzureCliService.executeAzCommand).toHaveBeenCalledWith(
        'az account show --output json'
      );
    });

    it('should use homeTenantId when tenantId is not present', async () => {
      mockAzureCliService.isInstalled.mockResolvedValue(true);
      mockAzureCliService.isAuthenticated.mockResolvedValue(true);
      mockAzureCliService.executeAzCommand.mockResolvedValue({
        id: 'sub-123',
        name: 'My Subscription',
        homeTenantId: 'tenant-456',
        state: 'Enabled',
      });

      const info = await service.getSubscriptionInfo();

      expect(info?.tenantId).toBe('tenant-456');
    });

    it('should default state to Unknown when not provided', async () => {
      mockAzureCliService.isInstalled.mockResolvedValue(true);
      mockAzureCliService.isAuthenticated.mockResolvedValue(true);
      mockAzureCliService.executeAzCommand.mockResolvedValue({
        id: 'sub-123',
        name: 'My Subscription',
        tenantId: 'tenant-456',
      });

      const info = await service.getSubscriptionInfo();

      expect(info?.state).toBe('Unknown');
    });

    it('should cache subscription info after first retrieval', async () => {
      mockAzureCliService.isInstalled.mockResolvedValue(true);
      mockAzureCliService.isAuthenticated.mockResolvedValue(true);
      mockAzureCliService.executeAzCommand.mockResolvedValue({
        id: 'sub-123',
        name: 'My Subscription',
        tenantId: 'tenant-456',
        state: 'Enabled',
      });

      const info1 = await service.getSubscriptionInfo();
      const info2 = await service.getSubscriptionInfo();

      expect(info1).toEqual(info2);
      expect(mockAzureCliService.executeAzCommand).toHaveBeenCalledTimes(1);
    });

    it('should return undefined when Azure CLI not installed', async () => {
      mockAzureCliService.isInstalled.mockResolvedValue(false);

      const info = await service.getSubscriptionInfo();

      expect(info).toBeUndefined();
      expect(mockAzureCliService.executeAzCommand).not.toHaveBeenCalled();
    });

    it('should return undefined when not authenticated', async () => {
      mockAzureCliService.isInstalled.mockResolvedValue(true);
      mockAzureCliService.isAuthenticated.mockResolvedValue(false);

      const info = await service.getSubscriptionInfo();

      expect(info).toBeUndefined();
      expect(mockAzureCliService.executeAzCommand).not.toHaveBeenCalled();
    });

    it('should return undefined when command fails', async () => {
      mockAzureCliService.isInstalled.mockResolvedValue(true);
      mockAzureCliService.isAuthenticated.mockResolvedValue(true);
      mockAzureCliService.executeAzCommand.mockRejectedValue(new Error('Command failed'));

      const info = await service.getSubscriptionInfo();

      expect(info).toBeUndefined();
    });

    it('should return undefined when result is invalid', async () => {
      mockAzureCliService.isInstalled.mockResolvedValue(true);
      mockAzureCliService.isAuthenticated.mockResolvedValue(true);
      mockAzureCliService.executeAzCommand.mockResolvedValue(null);

      const info = await service.getSubscriptionInfo();

      expect(info).toBeUndefined();
    });

    it('should return undefined when result is missing required fields', async () => {
      mockAzureCliService.isInstalled.mockResolvedValue(true);
      mockAzureCliService.isAuthenticated.mockResolvedValue(true);
      mockAzureCliService.executeAzCommand.mockResolvedValue({
        id: 'sub-123',
        // missing name
      });

      const info = await service.getSubscriptionInfo();

      expect(info).toBeUndefined();
    });
  });

  describe('getAuthenticationContext', () => {
    it('should return complete context with Azure CLI token', async () => {
      mockAzureCliService.getAzureDevOpsAccessToken.mockResolvedValue('cli-token');
      mockAzureCliService.isInstalled.mockResolvedValue(true);
      mockAzureCliService.isAuthenticated.mockResolvedValue(true);
      mockAzureCliService.executeAzCommand.mockResolvedValue({
        id: 'sub-123',
        name: 'My Subscription',
        tenantId: 'tenant-456',
        state: 'Enabled',
      });

      const context = await service.getAuthenticationContext();

      expect(context).toEqual({
        accessToken: 'cli-token',
        subscription: {
          id: 'sub-123',
          name: 'My Subscription',
          tenantId: 'tenant-456',
          state: 'Enabled',
        },
        source: 'azure-cli',
      });
    });

    it('should indicate environment-pat source when using AZURE_DEVOPS_EXT_PAT', async () => {
      process.env.AZURE_DEVOPS_EXT_PAT = 'pat-token';

      const context = await service.getAuthenticationContext();

      expect(context.accessToken).toBe('pat-token');
      expect(context.source).toBe('environment-pat');
      expect(context.subscription).toBeUndefined();
    });

    it('should indicate environment-token source when using AZ_ACCESS_TOKEN', async () => {
      process.env.AZ_ACCESS_TOKEN = 'access-token';

      const context = await service.getAuthenticationContext();

      expect(context.accessToken).toBe('access-token');
      expect(context.source).toBe('environment-token');
      expect(context.subscription).toBeUndefined();
    });

    it('should not include subscription for environment token sources', async () => {
      process.env.AZURE_DEVOPS_EXT_PAT = 'pat-token';

      const context = await service.getAuthenticationContext();

      expect(context.subscription).toBeUndefined();
      expect(mockAzureCliService.executeAzCommand).not.toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear token cache', async () => {
      mockAzureCliService.getAzureDevOpsAccessToken.mockResolvedValue('cli-token');

      await service.getAccessToken();
      service.clearCache();
      await service.getAccessToken();

      expect(mockAzureCliService.getAzureDevOpsAccessToken).toHaveBeenCalledTimes(2);
    });

    it('should clear subscription cache', async () => {
      mockAzureCliService.isInstalled.mockResolvedValue(true);
      mockAzureCliService.isAuthenticated.mockResolvedValue(true);
      mockAzureCliService.executeAzCommand.mockResolvedValue({
        id: 'sub-123',
        name: 'My Subscription',
        tenantId: 'tenant-456',
        state: 'Enabled',
      });

      await service.getSubscriptionInfo();
      service.clearCache();
      await service.getSubscriptionInfo();

      expect(mockAzureCliService.executeAzCommand).toHaveBeenCalledTimes(2);
    });
  });

  describe('security', () => {
    it('should not log tokens in error messages', async () => {
      process.env.AZURE_DEVOPS_EXT_PAT = 'secret-token-123';

      const token = await service.getAccessToken();

      expect(token).toBe('secret-token-123');
      // Verify that the token value is returned but would not be logged
      // (The service doesn't log, this is just to document the expectation)
    });

    it('should handle empty string environment variables', async () => {
      process.env.AZURE_DEVOPS_EXT_PAT = '';
      mockAzureCliService.getAzureDevOpsAccessToken.mockResolvedValue('cli-token');

      const token = await service.getAccessToken();

      expect(token).toBe('cli-token');
    });

    it('should handle whitespace-only environment variables', async () => {
      process.env.AZURE_DEVOPS_EXT_PAT = '   ';
      mockAzureCliService.getAzureDevOpsAccessToken.mockResolvedValue('cli-token');

      const token = await service.getAccessToken();

      expect(token).toBe('cli-token');
    });
  });
});
