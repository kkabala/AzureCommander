# Task 3: Azure CLI Service

## Objective
Create a service layer that wraps Azure CLI commands, executes them, and parses JSON responses. This service handles authentication, error detection, and provides a type-safe interface for executing Azure DevOps CLI commands.

## Files to Create/Modify
- `src/services/azure-cli.service.ts`
- `tests/unit/services/azure-cli.service.test.ts`

## Implementation Details

### 1. Create Azure CLI Service
Create `src/services/azure-cli.service.ts`:
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Error thrown when Azure CLI is not installed
 */
export class AzureCliNotInstalledError extends Error {
  constructor() {
    super('Azure CLI is not installed. Install from: https://aka.ms/install-azure-cli');
    this.name = 'AzureCliNotInstalledError';
  }
}

/**
 * Error thrown when user is not authenticated
 */
export class AzureCliNotAuthenticatedError extends Error {
  constructor() {
    super('Not authenticated with Azure CLI. Run: az login');
    this.name = 'AzureCliNotAuthenticatedError';
  }
}

/**
 * Error thrown when Azure DevOps extension is not installed
 */
export class AzureDevOpsExtensionNotInstalledError extends Error {
  constructor() {
    super('Azure DevOps extension not installed. Run: az extension add --name azure-devops');
    this.name = 'AzureDevOpsExtensionNotInstalledError';
  }
}

/**
 * Error thrown when Azure DevOps organization is not configured
 */
export class AzureDevOpsNotConfiguredError extends Error {
  constructor() {
    super('Azure DevOps organization not configured. Run: az devops configure --defaults organization=https://dev.azure.com/YOUR_ORG');
    this.name = 'AzureDevOpsNotConfiguredError';
  }
}

/**
 * Error thrown when Azure CLI command execution fails
 */
export class AzureCliExecutionError extends Error {
  constructor(message: string, public readonly stderr: string, public readonly exitCode?: number) {
    super(message);
    this.name = 'AzureCliExecutionError';
  }
}

/**
 * Service for executing Azure CLI commands
 */
export class AzureCliService {
  /**
   * Check if Azure CLI is installed
   */
  async isInstalled(): Promise<boolean> {
    try {
      await execAsync('az --version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if Azure DevOps extension is installed
   */
  async hasDevOpsExtension(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('az extension list --output json');
      const extensions = JSON.parse(stdout);
      return extensions.some((ext: any) => ext.name === 'azure-devops');
    } catch {
      return false;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      await execAsync('az account show');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Execute an Azure CLI command and return parsed JSON response
   * @throws {AzureCliNotInstalledError} If Azure CLI is not installed
   * @throws {AzureCliNotAuthenticatedError} If user is not authenticated
   * @throws {AzureDevOpsExtensionNotInstalledError} If Azure DevOps extension is not installed
   * @throws {AzureCliExecutionError} If command execution fails
   */
  async executeAzCommand<T>(command: string): Promise<T> {
    // Check if Azure CLI is installed
    if (!(await this.isInstalled())) {
      throw new AzureCliNotInstalledError();
    }

    // Check if authenticated
    if (!(await this.isAuthenticated())) {
      throw new AzureCliNotAuthenticatedError();
    }

    // Check if DevOps extension is installed (for az repos/devops commands)
    if (command.includes('az repos') || command.includes('az devops')) {
      if (!(await this.hasDevOpsExtension())) {
        throw new AzureDevOpsExtensionNotInstalledError();
      }
    }

    try {
      const { stdout, stderr } = await execAsync(command);
      
      // Check for common error patterns in stderr
      if (stderr) {
        if (stderr.includes('organization') && stderr.includes('not configured')) {
          throw new AzureDevOpsNotConfiguredError();
        }
        if (stderr.includes('not found') || stderr.includes('does not exist')) {
          throw new AzureCliExecutionError('Resource not found', stderr);
        }
      }

      // Parse JSON response
      if (stdout.trim()) {
        return JSON.parse(stdout) as T;
      }
      
      return {} as T;
    } catch (error: any) {
      // Re-throw known errors
      if (
        error instanceof AzureCliNotInstalledError ||
        error instanceof AzureCliNotAuthenticatedError ||
        error instanceof AzureDevOpsExtensionNotInstalledError ||
        error instanceof AzureDevOpsNotConfiguredError ||
        error instanceof AzureCliExecutionError
      ) {
        throw error;
      }

      // Handle execution errors
      const stderr = error.stderr || error.message || 'Unknown error';
      const exitCode = error.code;
      throw new AzureCliExecutionError(
        `Azure CLI command failed: ${error.message}`,
        stderr,
        exitCode
      );
    }
  }

  /**
   * Get Azure DevOps access token for REST API calls
   * @throws {AzureCliNotInstalledError} If Azure CLI is not installed
   * @throws {AzureCliNotAuthenticatedError} If user is not authenticated
   */
  async getAzureDevOpsAccessToken(): Promise<string> {
    try {
      const { stdout } = await execAsync(
        'az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798 --query accessToken --output tsv'
      );
      return stdout.trim();
    } catch (error: any) {
      if (!(await this.isInstalled())) {
        throw new AzureCliNotInstalledError();
      }
      if (!(await this.isAuthenticated())) {
        throw new AzureCliNotAuthenticatedError();
      }
      throw new AzureCliExecutionError(
        'Failed to get access token',
        error.stderr || error.message
      );
    }
  }
}
```

### 2. Create Unit Tests
Create `tests/unit/services/azure-cli.service.test.ts`:
```typescript
import { jest } from '@jest/globals';
import { exec } from 'child_process';
import {
  AzureCliService,
  AzureCliNotInstalledError,
  AzureCliNotAuthenticatedError,
  AzureDevOpsExtensionNotInstalledError,
  AzureDevOpsNotConfiguredError,
  AzureCliExecutionError,
} from '../../../src/services/azure-cli.service.js';

// Mock child_process
jest.mock('child_process');

describe('AzureCliService', () => {
  let service: AzureCliService;
  let mockExec: jest.MockedFunction<typeof exec>;

  beforeEach(() => {
    service = new AzureCliService();
    mockExec = exec as unknown as jest.MockedFunction<typeof exec>;
    jest.clearAllMocks();
  });

  describe('isInstalled', () => {
    it('should return true when Azure CLI is installed', async () => {
      mockExec.mockImplementation((command, callback: any) => {
        callback(null, { stdout: 'azure-cli 2.50.0', stderr: '' });
        return {} as any;
      });

      const result = await service.isInstalled();
      expect(result).toBe(true);
    });

    it('should return false when Azure CLI is not installed', async () => {
      mockExec.mockImplementation((command, callback: any) => {
        callback(new Error('command not found'), { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await service.isInstalled();
      expect(result).toBe(false);
    });
  });

  describe('hasDevOpsExtension', () => {
    it('should return true when DevOps extension is installed', async () => {
      mockExec.mockImplementation((command, callback: any) => {
        const extensions = JSON.stringify([
          { name: 'azure-devops', version: '0.26.0' },
        ]);
        callback(null, { stdout: extensions, stderr: '' });
        return {} as any;
      });

      const result = await service.hasDevOpsExtension();
      expect(result).toBe(true);
    });

    it('should return false when DevOps extension is not installed', async () => {
      mockExec.mockImplementation((command, callback: any) => {
        callback(null, { stdout: '[]', stderr: '' });
        return {} as any;
      });

      const result = await service.hasDevOpsExtension();
      expect(result).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when user is authenticated', async () => {
      mockExec.mockImplementation((command, callback: any) => {
        callback(null, { stdout: '{"id": "123"}', stderr: '' });
        return {} as any;
      });

      const result = await service.isAuthenticated();
      expect(result).toBe(true);
    });

    it('should return false when user is not authenticated', async () => {
      mockExec.mockImplementation((command, callback: any) => {
        callback(new Error('not authenticated'), { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await service.isAuthenticated();
      expect(result).toBe(false);
    });
  });

  describe('executeAzCommand', () => {
    it('should throw AzureCliNotInstalledError when CLI is not installed', async () => {
      mockExec.mockImplementation((command, callback: any) => {
        if (command.includes('--version')) {
          callback(new Error('not found'), { stdout: '', stderr: '' });
        }
        return {} as any;
      });

      await expect(service.executeAzCommand('az repos pr list'))
        .rejects.toThrow(AzureCliNotInstalledError);
    });

    it('should throw AzureCliNotAuthenticatedError when not authenticated', async () => {
      mockExec.mockImplementation((command, callback: any) => {
        if (command.includes('--version')) {
          callback(null, { stdout: 'azure-cli 2.50.0', stderr: '' });
        } else if (command.includes('account show')) {
          callback(new Error('not authenticated'), { stdout: '', stderr: '' });
        }
        return {} as any;
      });

      await expect(service.executeAzCommand('az repos pr list'))
        .rejects.toThrow(AzureCliNotAuthenticatedError);
    });

    it('should throw AzureDevOpsExtensionNotInstalledError for DevOps commands', async () => {
      mockExec.mockImplementation((command, callback: any) => {
        if (command.includes('--version')) {
          callback(null, { stdout: 'azure-cli 2.50.0', stderr: '' });
        } else if (command.includes('account show')) {
          callback(null, { stdout: '{"id": "123"}', stderr: '' });
        } else if (command.includes('extension list')) {
          callback(null, { stdout: '[]', stderr: '' });
        }
        return {} as any;
      });

      await expect(service.executeAzCommand('az repos pr list'))
        .rejects.toThrow(AzureDevOpsExtensionNotInstalledError);
    });

    it('should throw AzureDevOpsNotConfiguredError when org not configured', async () => {
      mockExec.mockImplementation((command, callback: any) => {
        if (command.includes('--version')) {
          callback(null, { stdout: 'azure-cli 2.50.0', stderr: '' });
        } else if (command.includes('account show')) {
          callback(null, { stdout: '{"id": "123"}', stderr: '' });
        } else if (command.includes('extension list')) {
          const extensions = JSON.stringify([{ name: 'azure-devops' }]);
          callback(null, { stdout: extensions, stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: 'organization not configured' });
        }
        return {} as any;
      });

      await expect(service.executeAzCommand('az repos pr list'))
        .rejects.toThrow(AzureDevOpsNotConfiguredError);
    });

    it('should execute command and return parsed JSON', async () => {
      const mockData = { id: 123, title: 'Test PR' };
      
      mockExec.mockImplementation((command, callback: any) => {
        if (command.includes('--version')) {
          callback(null, { stdout: 'azure-cli 2.50.0', stderr: '' });
        } else if (command.includes('account show')) {
          callback(null, { stdout: '{"id": "123"}', stderr: '' });
        } else if (command.includes('extension list')) {
          const extensions = JSON.stringify([{ name: 'azure-devops' }]);
          callback(null, { stdout: extensions, stderr: '' });
        } else {
          callback(null, { stdout: JSON.stringify(mockData), stderr: '' });
        }
        return {} as any;
      });

      const result = await service.executeAzCommand('az repos pr list');
      expect(result).toEqual(mockData);
    });

    it('should handle non-DevOps commands without checking extension', async () => {
      const mockData = { subscriptionId: '123' };
      
      mockExec.mockImplementation((command, callback: any) => {
        if (command.includes('--version')) {
          callback(null, { stdout: 'azure-cli 2.50.0', stderr: '' });
        } else if (command.includes('account show')) {
          callback(null, { stdout: JSON.stringify(mockData), stderr: '' });
        }
        return {} as any;
      });

      const result = await service.executeAzCommand('az account show');
      expect(result).toEqual(mockData);
    });
  });

  describe('getAzureDevOpsAccessToken', () => {
    it('should return access token', async () => {
      const mockToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6...';
      
      mockExec.mockImplementation((command, callback: any) => {
        if (command.includes('get-access-token')) {
          callback(null, { stdout: mockToken + '\n', stderr: '' });
        }
        return {} as any;
      });

      const token = await service.getAzureDevOpsAccessToken();
      expect(token).toBe(mockToken);
    });

    it('should throw error when not authenticated', async () => {
      mockExec.mockImplementation((command, callback: any) => {
        if (command.includes('--version')) {
          callback(null, { stdout: 'azure-cli 2.50.0', stderr: '' });
        } else if (command.includes('account show')) {
          callback(new Error('not authenticated'), { stdout: '', stderr: '' });
        }
        return {} as any;
      });

      await expect(service.getAzureDevOpsAccessToken())
        .rejects.toThrow(AzureCliNotAuthenticatedError);
    });
  });
});
```

## Dependencies
- Task 1: Project Setup (requires Jest and TypeScript configuration)
- Task 2: Type Definitions (for type-safe responses)

## Acceptance Criteria
- [ ] Service successfully executes Azure CLI commands
- [ ] Service detects when Azure CLI is not installed
- [ ] Service detects when user is not authenticated
- [ ] Service detects when DevOps extension is missing
- [ ] Service detects when organization is not configured
- [ ] Service parses JSON responses correctly
- [ ] Service retrieves access token for REST API calls
- [ ] All error types are properly defined and thrown
- [ ] Jest tests pass with 80%+ coverage
- [ ] All async methods use proper error handling

## Test Cases
- **Test Case 1: Azure CLI Not Installed**
  - Mock `az --version` to fail
  - Expected: Throws AzureCliNotInstalledError with installation instructions
  
- **Test Case 2: Not Authenticated**
  - Mock `az account show` to fail
  - Expected: Throws AzureCliNotAuthenticatedError with login instructions
  
- **Test Case 3: DevOps Extension Missing**
  - Mock extension list without azure-devops
  - Expected: Throws AzureDevOpsExtensionNotInstalledError
  
- **Test Case 4: Organization Not Configured**
  - Mock command to return "organization not configured" error
  - Expected: Throws AzureDevOpsNotConfiguredError
  
- **Test Case 5: Successful Command Execution**
  - Mock successful command with JSON response
  - Expected: Returns parsed JSON object
  
- **Test Case 6: Access Token Retrieval**
  - Mock successful token retrieval
  - Expected: Returns trimmed access token string
  
- **Test Case 7: Empty Response**
  - Mock command with empty stdout
  - Expected: Returns empty object without errors
