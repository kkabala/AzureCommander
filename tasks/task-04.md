# Task 4: Config Service

## Objective
Create a configuration service that reads Azure DevOps settings from environment variables and Azure CLI configuration. This service provides a centralized way to access organization URL, default project, and other configuration values needed throughout the application.

## Files to Create/Modify
- `src/services/config.service.ts`
- `tests/unit/services/config.service.test.ts`

## Implementation Details

### 1. Create Config Service
Create `src/services/config.service.ts`:
```typescript
import { AzureCliService } from './azure-cli.service.js';

/**
 * Configuration values from Azure DevOps
 */
export interface AzureDevOpsConfig {
  organizationUrl?: string;
  organization?: string;
  project?: string;
}

/**
 * Service for reading Azure DevOps configuration
 */
export class ConfigService {
  private azureCliService: AzureCliService;
  private configCache?: AzureDevOpsConfig;

  constructor(azureCliService?: AzureCliService) {
    this.azureCliService = azureCliService || new AzureCliService();
  }

  /**
   * Get the Azure DevOps organization URL
   * Checks in order:
   * 1. Environment variable AZURE_DEVOPS_ORG_URL
   * 2. Azure CLI default configuration
   * 
   * @returns Organization URL or undefined if not configured
   */
  async getOrganizationUrl(): Promise<string | undefined> {
    // Check environment variable first
    const envOrgUrl = process.env.AZURE_DEVOPS_ORG_URL;
    if (envOrgUrl) {
      return envOrgUrl.trim();
    }

    // Check Azure CLI configuration
    try {
      const config = await this.getAzureDevOpsDefaults();
      return config.organizationUrl;
    } catch {
      return undefined;
    }
  }

  /**
   * Get the organization name from the organization URL
   * 
   * @returns Organization name or undefined
   */
  async getOrganization(): Promise<string | undefined> {
    const orgUrl = await this.getOrganizationUrl();
    if (!orgUrl) {
      return undefined;
    }

    // Extract organization name from URL
    // Format: https://dev.azure.com/ORG_NAME or https://ORG_NAME.visualstudio.com
    const devAzureMatch = orgUrl.match(/dev\.azure\.com\/([^\/]+)/);
    if (devAzureMatch) {
      return devAzureMatch[1];
    }

    const visualStudioMatch = orgUrl.match(/([^\.]+)\.visualstudio\.com/);
    if (visualStudioMatch) {
      return visualStudioMatch[1];
    }

    return undefined;
  }

  /**
   * Get the default Azure DevOps project
   * Checks in order:
   * 1. Environment variable AZURE_DEVOPS_PROJECT
   * 2. Azure CLI default configuration
   * 
   * @returns Project name or undefined if not configured
   */
  async getDefaultProject(): Promise<string | undefined> {
    // Check environment variable first
    const envProject = process.env.AZURE_DEVOPS_PROJECT;
    if (envProject) {
      return envProject.trim();
    }

    // Check Azure CLI configuration
    try {
      const config = await this.getAzureDevOpsDefaults();
      return config.project;
    } catch {
      return undefined;
    }
  }

  /**
   * Get all Azure DevOps defaults from Azure CLI configuration
   * Results are cached after first call
   * 
   * @returns Configuration object
   */
  async getAzureDevOpsDefaults(): Promise<AzureDevOpsConfig> {
    // Return cached config if available
    if (this.configCache) {
      return this.configCache;
    }

    try {
      // Execute az devops configure --list
      const result = await this.azureCliService.executeAzCommand<any>(
        'az devops configure --list --output json'
      );

      const config: AzureDevOpsConfig = {};

      // Parse the configuration
      if (Array.isArray(result)) {
        for (const item of result) {
          if (item.name === 'organization') {
            config.organizationUrl = item.value;
            config.organization = await this.extractOrganizationName(item.value);
          } else if (item.name === 'project') {
            config.project = item.value;
          }
        }
      }

      // Cache the result
      this.configCache = config;
      return config;
    } catch (error) {
      // Return empty config if command fails
      return {};
    }
  }

  /**
   * Extract organization name from URL
   */
  private async extractOrganizationName(url: string): Promise<string | undefined> {
    const devAzureMatch = url.match(/dev\.azure\.com\/([^\/]+)/);
    if (devAzureMatch) {
      return devAzureMatch[1];
    }

    const visualStudioMatch = url.match(/([^\.]+)\.visualstudio\.com/);
    if (visualStudioMatch) {
      return visualStudioMatch[1];
    }

    return undefined;
  }

  /**
   * Clear the configuration cache
   * Useful for testing or when configuration changes
   */
  clearCache(): void {
    this.configCache = undefined;
  }

  /**
   * Build a full Azure DevOps REST API URL
   * 
   * @param path - API path (e.g., '/_apis/git/repositories')
   * @param project - Optional project name
   * @returns Full URL or undefined if organization is not configured
   */
  async buildApiUrl(path: string, project?: string): Promise<string | undefined> {
    const orgUrl = await this.getOrganizationUrl();
    if (!orgUrl) {
      return undefined;
    }

    // Remove trailing slash from org URL
    const baseUrl = orgUrl.replace(/\/$/, '');

    // If project is provided, include it in the URL
    if (project) {
      return `${baseUrl}/${project}${path}`;
    }

    return `${baseUrl}${path}`;
  }

  /**
   * Validate that required configuration is present
   * 
   * @throws {Error} If organization is not configured
   */
  async validateConfiguration(): Promise<void> {
    const orgUrl = await this.getOrganizationUrl();
    if (!orgUrl) {
      throw new Error(
        'Azure DevOps organization not configured. ' +
        'Set AZURE_DEVOPS_ORG_URL environment variable or run: ' +
        'az devops configure --defaults organization=https://dev.azure.com/YOUR_ORG'
      );
    }
  }
}
```

### 2. Create Unit Tests
Create `tests/unit/services/config.service.test.ts`:
```typescript
import { jest } from '@jest/globals';
import { ConfigService } from '../../../src/services/config.service.js';
import { AzureCliService } from '../../../src/services/azure-cli.service.js';

describe('ConfigService', () => {
  let service: ConfigService;
  let mockAzureCliService: jest.Mocked<AzureCliService>;

  beforeEach(() => {
    // Clear environment variables
    delete process.env.AZURE_DEVOPS_ORG_URL;
    delete process.env.AZURE_DEVOPS_PROJECT;

    // Create mock Azure CLI service
    mockAzureCliService = {
      executeAzCommand: jest.fn(),
    } as any;

    service = new ConfigService(mockAzureCliService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrganizationUrl', () => {
    it('should return organization URL from environment variable', async () => {
      process.env.AZURE_DEVOPS_ORG_URL = 'https://dev.azure.com/myorg';

      const result = await service.getOrganizationUrl();
      expect(result).toBe('https://dev.azure.com/myorg');
      expect(mockAzureCliService.executeAzCommand).not.toHaveBeenCalled();
    });

    it('should return organization URL from Azure CLI config', async () => {
      mockAzureCliService.executeAzCommand.mockResolvedValue([
        { name: 'organization', value: 'https://dev.azure.com/myorg' },
      ]);

      const result = await service.getOrganizationUrl();
      expect(result).toBe('https://dev.azure.com/myorg');
    });

    it('should return undefined when not configured', async () => {
      mockAzureCliService.executeAzCommand.mockResolvedValue([]);

      const result = await service.getOrganizationUrl();
      expect(result).toBeUndefined();
    });

    it('should return undefined when Azure CLI command fails', async () => {
      mockAzureCliService.executeAzCommand.mockRejectedValue(new Error('Command failed'));

      const result = await service.getOrganizationUrl();
      expect(result).toBeUndefined();
    });

    it('should trim whitespace from environment variable', async () => {
      process.env.AZURE_DEVOPS_ORG_URL = '  https://dev.azure.com/myorg  ';

      const result = await service.getOrganizationUrl();
      expect(result).toBe('https://dev.azure.com/myorg');
    });
  });

  describe('getOrganization', () => {
    it('should extract organization from dev.azure.com URL', async () => {
      process.env.AZURE_DEVOPS_ORG_URL = 'https://dev.azure.com/myorg';

      const result = await service.getOrganization();
      expect(result).toBe('myorg');
    });

    it('should extract organization from visualstudio.com URL', async () => {
      process.env.AZURE_DEVOPS_ORG_URL = 'https://myorg.visualstudio.com';

      const result = await service.getOrganization();
      expect(result).toBe('myorg');
    });

    it('should return undefined when URL is not configured', async () => {
      mockAzureCliService.executeAzCommand.mockResolvedValue([]);

      const result = await service.getOrganization();
      expect(result).toBeUndefined();
    });

    it('should return undefined for invalid URL format', async () => {
      process.env.AZURE_DEVOPS_ORG_URL = 'https://invalid.url.com';

      const result = await service.getOrganization();
      expect(result).toBeUndefined();
    });
  });

  describe('getDefaultProject', () => {
    it('should return project from environment variable', async () => {
      process.env.AZURE_DEVOPS_PROJECT = 'MyProject';

      const result = await service.getDefaultProject();
      expect(result).toBe('MyProject');
      expect(mockAzureCliService.executeAzCommand).not.toHaveBeenCalled();
    });

    it('should return project from Azure CLI config', async () => {
      mockAzureCliService.executeAzCommand.mockResolvedValue([
        { name: 'project', value: 'MyProject' },
      ]);

      const result = await service.getDefaultProject();
      expect(result).toBe('MyProject');
    });

    it('should return undefined when not configured', async () => {
      mockAzureCliService.executeAzCommand.mockResolvedValue([]);

      const result = await service.getDefaultProject();
      expect(result).toBeUndefined();
    });

    it('should trim whitespace from environment variable', async () => {
      process.env.AZURE_DEVOPS_PROJECT = '  MyProject  ';

      const result = await service.getDefaultProject();
      expect(result).toBe('MyProject');
    });
  });

  describe('getAzureDevOpsDefaults', () => {
    it('should parse configuration from Azure CLI', async () => {
      mockAzureCliService.executeAzCommand.mockResolvedValue([
        { name: 'organization', value: 'https://dev.azure.com/myorg' },
        { name: 'project', value: 'MyProject' },
      ]);

      const result = await service.getAzureDevOpsDefaults();
      expect(result.organizationUrl).toBe('https://dev.azure.com/myorg');
      expect(result.organization).toBe('myorg');
      expect(result.project).toBe('MyProject');
    });

    it('should cache configuration after first call', async () => {
      mockAzureCliService.executeAzCommand.mockResolvedValue([
        { name: 'organization', value: 'https://dev.azure.com/myorg' },
      ]);

      await service.getAzureDevOpsDefaults();
      await service.getAzureDevOpsDefaults();

      expect(mockAzureCliService.executeAzCommand).toHaveBeenCalledTimes(1);
    });

    it('should return empty config on error', async () => {
      mockAzureCliService.executeAzCommand.mockRejectedValue(new Error('Failed'));

      const result = await service.getAzureDevOpsDefaults();
      expect(result).toEqual({});
    });
  });

  describe('clearCache', () => {
    it('should clear configuration cache', async () => {
      mockAzureCliService.executeAzCommand.mockResolvedValue([
        { name: 'organization', value: 'https://dev.azure.com/myorg' },
      ]);

      await service.getAzureDevOpsDefaults();
      service.clearCache();
      await service.getAzureDevOpsDefaults();

      expect(mockAzureCliService.executeAzCommand).toHaveBeenCalledTimes(2);
    });
  });

  describe('buildApiUrl', () => {
    it('should build API URL without project', async () => {
      process.env.AZURE_DEVOPS_ORG_URL = 'https://dev.azure.com/myorg';

      const result = await service.buildApiUrl('/_apis/git/repositories');
      expect(result).toBe('https://dev.azure.com/myorg/_apis/git/repositories');
    });

    it('should build API URL with project', async () => {
      process.env.AZURE_DEVOPS_ORG_URL = 'https://dev.azure.com/myorg';

      const result = await service.buildApiUrl('/_apis/git/repositories', 'MyProject');
      expect(result).toBe('https://dev.azure.com/myorg/MyProject/_apis/git/repositories');
    });

    it('should handle trailing slash in organization URL', async () => {
      process.env.AZURE_DEVOPS_ORG_URL = 'https://dev.azure.com/myorg/';

      const result = await service.buildApiUrl('/_apis/git/repositories');
      expect(result).toBe('https://dev.azure.com/myorg/_apis/git/repositories');
    });

    it('should return undefined when organization is not configured', async () => {
      mockAzureCliService.executeAzCommand.mockResolvedValue([]);

      const result = await service.buildApiUrl('/_apis/git/repositories');
      expect(result).toBeUndefined();
    });
  });

  describe('validateConfiguration', () => {
    it('should not throw when organization is configured', async () => {
      process.env.AZURE_DEVOPS_ORG_URL = 'https://dev.azure.com/myorg';

      await expect(service.validateConfiguration()).resolves.not.toThrow();
    });

    it('should throw when organization is not configured', async () => {
      mockAzureCliService.executeAzCommand.mockResolvedValue([]);

      await expect(service.validateConfiguration()).rejects.toThrow(
        'Azure DevOps organization not configured'
      );
    });
  });
});
```

## Dependencies
- Task 1: Project Setup (requires Jest and TypeScript configuration)
- Task 3: Azure CLI Service (for executing az commands)

## Acceptance Criteria
- [ ] Service reads organization URL from environment variable
- [ ] Service reads organization URL from Azure CLI config
- [ ] Service reads default project from environment variable
- [ ] Service reads default project from Azure CLI config
- [ ] Service caches configuration after first read
- [ ] Service can clear cache when needed
- [ ] Service extracts organization name from different URL formats
- [ ] Service builds valid API URLs
- [ ] Service validates required configuration
- [ ] Jest tests pass with 80%+ coverage
- [ ] All async methods use proper error handling

## Test Cases
- **Test Case 1: Environment Variable Priority**
  - Set AZURE_DEVOPS_ORG_URL environment variable
  - Expected: Returns env value without calling Azure CLI
  
- **Test Case 2: Azure CLI Fallback**
  - No environment variable set, mock Azure CLI response
  - Expected: Returns value from Azure CLI config
  
- **Test Case 3: Organization Name Extraction**
  - Test with dev.azure.com URL format
  - Test with visualstudio.com URL format
  - Expected: Correctly extracts organization name
  
- **Test Case 4: Configuration Caching**
  - Call getAzureDevOpsDefaults() twice
  - Expected: Azure CLI is called only once
  
- **Test Case 5: Cache Clearing**
  - Get config, clear cache, get config again
  - Expected: Azure CLI is called twice
  
- **Test Case 6: API URL Building**
  - Build URL with and without project
  - Expected: Correctly formatted URLs
  
- **Test Case 7: Configuration Validation**
  - Test with configured and unconfigured organization
  - Expected: Throws error only when not configured
