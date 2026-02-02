import { exec } from 'child_process';
import { promisify } from 'util';

export class AzureCliNotInstalledError extends Error {
  constructor() {
    super('Azure CLI is not installed. Install from: https://aka.ms/install-azure-cli');
    this.name = 'AzureCliNotInstalledError';
  }
}

export class AzureCliNotAuthenticatedError extends Error {
  constructor() {
    super('Not authenticated with Azure CLI. Run: az login');
    this.name = 'AzureCliNotAuthenticatedError';
  }
}

export class AzureDevOpsExtensionNotInstalledError extends Error {
  constructor() {
    super('Azure DevOps extension not installed. Run: az extension add --name azure-devops');
    this.name = 'AzureDevOpsExtensionNotInstalledError';
  }
}

export class AzureDevOpsNotConfiguredError extends Error {
  constructor() {
    super('Azure DevOps organization not configured. Run: az devops configure --defaults organization=https://dev.azure.com/YOUR_ORG');
    this.name = 'AzureDevOpsNotConfiguredError';
  }
}

export class AzureCliExecutionError extends Error {
  constructor(message: string, public readonly stderr: string, public readonly exitCode?: number) {
    super(message);
    this.name = 'AzureCliExecutionError';
  }
}

export class AzureCliService {
  constructor(private execAsync: (cmd: string) => Promise<any> = promisify(exec) as any) {}

  async isInstalled(): Promise<boolean> {
    try {
      await this.execAsync('az --version');
      return true;
    } catch {
      return false;
    }
  }

  async hasDevOpsExtension(): Promise<boolean> {
    try {
      const { stdout } = await this.execAsync('az extension list --output json');
      const extensions = JSON.parse(stdout);
      return this.extensionsIncludeAzureDevOps(extensions);
    } catch {
      return false;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      await this.execAsync('az account show');
      return true;
    } catch {
      return false;
    }
  }

  async executeAzCommand<T>(command: string): Promise<T> {
    await this.validateAzureCliIsInstalled();
    await this.validateUserIsAuthenticated();
    await this.validateDevOpsExtensionForDevOpsCommands(command);

    try {
      const { stdout, stderr } = await this.execAsync(command);

      this.handleStderrErrors(stderr);

      return this.parseJsonResponse<T>(stdout);
    } catch (error: any) {
      // If Azure CLI failed because it couldn't resolve @me, attempt to replace @me
      const stderr: string = (error.stderr || error.message || '').toString();
      if (stderr.includes('Could not resolve identity: @me')) {
        // ensure we have a configured username and retry
        const username = await this.ensureConfiguredUsername();
        const newCommand = command.replace(/@me/g, username);
        try {
          const { stdout: stdout2, stderr: stderr2 } = await this.execAsync(newCommand);
          this.handleStderrErrors(stderr2);
          return this.parseJsonResponse<T>(stdout2);
        } catch (err2: any) {
          // fall through to generic handler
          return this.handleExecutionError(err2);
        }
      }

      return this.handleExecutionError(error);
    }
  }

  async getAzureDevOpsAccessToken(): Promise<string> {
    try {
      const { stdout } = await this.execAsync(
        'az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798 --query accessToken --output tsv'
      );
      return stdout.trim();
    } catch (error: any) {
      return this.handleAccessTokenError(error);
    }
  }

  private extensionsIncludeAzureDevOps(extensions: any[]): boolean {
    return extensions.some((ext: any) => ext.name === 'azure-devops');
  }

  private async validateAzureCliIsInstalled(): Promise<void> {
    if (!(await this.isInstalled())) {
      throw new AzureCliNotInstalledError();
    }
  }

  private async validateUserIsAuthenticated(): Promise<void> {
    if (!(await this.isAuthenticated())) {
      throw new AzureCliNotAuthenticatedError();
    }
  }

  private async validateDevOpsExtensionForDevOpsCommands(command: string): Promise<void> {
    if (this.isDevOpsCommand(command)) {
      if (!(await this.hasDevOpsExtension())) {
        throw new AzureDevOpsExtensionNotInstalledError();
      }
    }
  }

  private isDevOpsCommand(command: string): boolean {
    return command.includes('az repos') || command.includes('az devops');
  }

  private async ensureConfiguredUsername(): Promise<string> {
    // Check for config file in home directory
    try {
      const os = await import('os');
      const path = await import('path');
      const fs = await import('fs');
      const homedir = os.homedir();
      const cfgPath = path.join(homedir, '.azc', 'config.json');

      if (fs.existsSync(cfgPath)) {
        const content = fs.readFileSync(cfgPath, 'utf8');
        const cfg = JSON.parse(content);
        if (cfg && cfg.username) {
          return cfg.username;
        }
      }

      // Otherwise prompt the user
      const readline = await import('readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

      const question = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));

      const answer = (await question('Enter your Azure DevOps username/email (used instead of @me): ')).trim();
      rl.close();

      // Create config dir and save
      const cfgDir = path.join(homedir, '.azc');
      if (!fs.existsSync(cfgDir)) {
        fs.mkdirSync(cfgDir, { recursive: true });
      }

      const cfgPathNew = path.join(cfgDir, 'config.json');
      fs.writeFileSync(cfgPathNew, JSON.stringify({ username: answer }, null, 2), { mode: 0o600 });

      return answer;
    } catch (e) {
      // As a last resort, fall back to literal '@me' so the original error is preserved
      return '@me';
    }
  }

  private handleStderrErrors(stderr: string): void {
    if (!stderr) {
      return;
    }

    if (this.isOrganizationNotConfiguredError(stderr)) {
      throw new AzureDevOpsNotConfiguredError();
    }

    if (this.isResourceNotFoundError(stderr)) {
      throw new AzureCliExecutionError('Resource not found', stderr);
    }
  }

  private isOrganizationNotConfiguredError(stderr: string): boolean {
    return stderr.includes('organization') && stderr.includes('not configured');
  }

  private isResourceNotFoundError(stderr: string): boolean {
    return stderr.includes('not found') || stderr.includes('does not exist');
  }

  private parseJsonResponse<T>(stdout: string): T {
    if (stdout.trim()) {
      return JSON.parse(stdout) as T;
    }

    return {} as T;
  }

  private handleExecutionError(error: any): never {
    if (this.isKnownError(error)) {
      throw error;
    }

    const stderr = error.stderr || error.message || 'Unknown error';
    const exitCode = error.code;
    throw new AzureCliExecutionError(
      `Azure CLI command failed: ${error.message}`,
      stderr,
      exitCode
    );
  }

  private isKnownError(error: any): boolean {
    return (
      error instanceof AzureCliNotInstalledError ||
      error instanceof AzureCliNotAuthenticatedError ||
      error instanceof AzureDevOpsExtensionNotInstalledError ||
      error instanceof AzureDevOpsNotConfiguredError ||
      error instanceof AzureCliExecutionError
    );
  }

  private async handleAccessTokenError(error: any): Promise<never> {
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
