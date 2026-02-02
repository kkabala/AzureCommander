// Tests for AzureCliService using ESM jest.unstable_mockModule dynamic import

let execAsyncMock: jest.Mock<any, any>;
let AzureCliService: any;
let AzureCliNotInstalledError: any;
let AzureCliNotAuthenticatedError: any;
let AzureDevOpsExtensionNotInstalledError: any;
let AzureDevOpsNotConfiguredError: any;
let AzureCliExecutionError: any;

beforeAll(async () => {
  // create a single mock function that will act as the promisified exec
  execAsyncMock = jest.fn();

  // No module mocking: we'll inject execAsyncMock into the service constructor

  const mod: any = await import('../../../src/services/azure-cli.service');
  AzureCliService = mod.AzureCliService;
  AzureCliNotInstalledError = mod.AzureCliNotInstalledError;
  AzureCliNotAuthenticatedError = mod.AzureCliNotAuthenticatedError;
  AzureDevOpsExtensionNotInstalledError = mod.AzureDevOpsExtensionNotInstalledError;
  AzureDevOpsNotConfiguredError = mod.AzureDevOpsNotConfiguredError;
  AzureCliExecutionError = mod.AzureCliExecutionError;
});

beforeEach(() => {
  execAsyncMock.mockReset();
});

describe('AzureCliService', () => {
  test('isInstalled returns true when az --version succeeds', async () => {
    execAsyncMock.mockResolvedValueOnce({ stdout: 'azure cli', stderr: '' });
    const svc = new AzureCliService(execAsyncMock as any);
    await expect(svc.isInstalled()).resolves.toBe(true);
  });

  test('isInstalled returns false when az --version fails', async () => {
    execAsyncMock.mockRejectedValueOnce(new Error('not found'));
    const svc = new AzureCliService(execAsyncMock as any);
    await expect(svc.isInstalled()).resolves.toBe(false);
  });

  test('hasDevOpsExtension parses extensions and returns true/false', async () => {
    const list = [{ name: 'something' }, { name: 'azure-devops' }];
    execAsyncMock.mockImplementation(async (cmd: string) => {
      if (cmd.includes('extension list')) {
        return { stdout: JSON.stringify(list), stderr: '' };
      }
      throw new Error('unexpected');
    });

    const svc = new AzureCliService(execAsyncMock as any);
    await expect(svc.hasDevOpsExtension()).resolves.toBe(true);

    execAsyncMock.mockImplementationOnce(async () => { throw new Error('fail'); });
    await expect(svc.hasDevOpsExtension()).resolves.toBe(false);
  });

  test('isAuthenticated true/false', async () => {
    execAsyncMock.mockResolvedValueOnce({ stdout: '{}', stderr: '' });
    const svc = new AzureCliService(execAsyncMock as any);
    await expect(svc.isAuthenticated()).resolves.toBe(true);

    execAsyncMock.mockRejectedValueOnce(new Error('no auth'));
    await expect(svc.isAuthenticated()).resolves.toBe(false);
  });

  test('executeAzCommand returns parsed JSON on success', async () => {
    const svc = new AzureCliService(execAsyncMock as any);

    execAsyncMock.mockImplementation(async (cmd: string) => {
      if (cmd === 'az --version') return { stdout: 'ok', stderr: '' };
      if (cmd === 'az account show') return { stdout: '{}', stderr: '' };
      // non-devops command -> no extension check
      if (cmd === "az group list --output json") return { stdout: JSON.stringify([{ id: 1 }]), stderr: '' };
      return { stdout: '', stderr: '' };
    });

    await expect(svc.executeAzCommand('az group list --output json')).resolves.toEqual([{ id: 1 }]);
  });

  test('executeAzCommand throws AzureCliNotInstalledError when az not installed', async () => {
    const svc = new AzureCliService(execAsyncMock as any);
    execAsyncMock.mockRejectedValueOnce(new Error('no az')); // for isInstalled

    await expect(svc.executeAzCommand('az group list --output json')).rejects.toBeInstanceOf(AzureCliNotInstalledError);
  });

  test('executeAzCommand throws AzureDevOpsExtensionNotInstalledError for devops command without extension', async () => {
    const svc = new AzureCliService(execAsyncMock as any);

    execAsyncMock.mockImplementation(async (cmd: string) => {
      if (cmd === 'az --version') return { stdout: 'ok', stderr: '' };
      if (cmd === 'az account show') return { stdout: '{}', stderr: '' };
      if (cmd.includes('extension list')) return { stdout: JSON.stringify([{ name: 'other' }]), stderr: '' };
      return { stdout: '', stderr: '' };
    });

    await expect(svc.executeAzCommand('az repos list --output json')).rejects.toBeInstanceOf(AzureDevOpsExtensionNotInstalledError);
  });

  test('executeAzCommand throws AzureCliNotAuthenticatedError when not authenticated', async () => {
    const svc = new AzureCliService(execAsyncMock as any);

    execAsyncMock.mockImplementation(async (cmd: string) => {
      if (cmd === 'az --version') return { stdout: 'ok', stderr: '' };
      if (cmd === 'az account show') throw new Error('not auth');
      return { stdout: '', stderr: '' };
    });

    await expect(svc.executeAzCommand('az group list')).rejects.toBeInstanceOf(AzureCliNotAuthenticatedError);
  });

  test('executeAzCommand throws AzureDevOpsNotConfiguredError when stderr indicates org not configured', async () => {
    const svc = new AzureCliService(execAsyncMock as any);

    execAsyncMock.mockImplementation(async (cmd: string) => {
      if (cmd === 'az --version') return { stdout: 'ok', stderr: '' };
      if (cmd === 'az account show') return { stdout: '{}', stderr: '' };
      if (cmd.includes('extension list')) return { stdout: JSON.stringify([{ name: 'azure-devops' }]), stderr: '' };
      if (cmd.includes('az repos')) return { stdout: '', stderr: 'organization is not configured' };
      return { stdout: '', stderr: '' };
    });

    await expect(svc.executeAzCommand('az repos list --output json')).rejects.toBeInstanceOf(AzureDevOpsNotConfiguredError);
  });

  test('executeAzCommand throws AzureCliExecutionError for execution errors', async () => {
    const svc = new AzureCliService(execAsyncMock as any);

    execAsyncMock.mockImplementation(async (cmd: string) => {
      if (cmd === 'az --version') return { stdout: 'ok', stderr: '' };
      if (cmd === 'az account show') return { stdout: '{}', stderr: '' };
      if (cmd.includes('az group')) {
        const err: any = new Error('failed');
        err.stderr = 'does not exist';
        err.code = 2;
        throw err;
      }
      return { stdout: '', stderr: '' };
    });

    await expect(svc.executeAzCommand('az group show --name x')).rejects.toBeInstanceOf(AzureCliExecutionError);
  });

  test('getAzureDevOpsAccessToken returns trimmed token', async () => {
    const svc = new AzureCliService(execAsyncMock as any);

    execAsyncMock.mockImplementation(async (cmd: string) => {
      if (cmd === 'az --version') return { stdout: 'ok', stderr: '' };
      if (cmd === 'az account show') return { stdout: '{}', stderr: '' };
      if (cmd.includes('get-access-token')) return { stdout: '  mytoken\n', stderr: '' };
      return { stdout: '', stderr: '' };
    });

    await expect(svc.getAzureDevOpsAccessToken()).resolves.toBe('mytoken');
  });

  test('getAzureDevOpsAccessToken throws AzureCliNotInstalledError when az missing', async () => {
    const svc = new AzureCliService(execAsyncMock as any);

    execAsyncMock.mockImplementation(async (cmd: string) => {
      if (cmd.includes('get-access-token')) throw new Error('no az');
      if (cmd === 'az --version') throw new Error('no az');
      return { stdout: '', stderr: '' };
    });

    await expect(svc.getAzureDevOpsAccessToken()).rejects.toBeInstanceOf(AzureCliNotInstalledError);
  });

  test('getAzureDevOpsAccessToken throws AzureCliNotAuthenticatedError when not authenticated', async () => {
    const svc = new AzureCliService(execAsyncMock as any);

    execAsyncMock.mockImplementation(async (cmd: string) => {
      if (cmd === 'az --version') return { stdout: 'ok', stderr: '' };
      if (cmd === 'az account show') throw new Error('not auth');
      if (cmd.includes('get-access-token')) throw new Error('no token');
      return { stdout: '', stderr: '' };
    });

    await expect(svc.getAzureDevOpsAccessToken()).rejects.toBeInstanceOf(AzureCliNotAuthenticatedError);
  });

  test('executeAzCommand handles empty stdout', async () => {
    const svc = new AzureCliService(execAsyncMock as any);

    execAsyncMock.mockImplementation(async (cmd: string) => {
      if (cmd === 'az --version') return { stdout: 'ok', stderr: '' };
      if (cmd === 'az account show') return { stdout: '{}', stderr: '' };
      if (cmd.includes('az group')) return { stdout: '', stderr: '' };
      return { stdout: '', stderr: '' };
    });

    await expect(svc.executeAzCommand('az group list')).resolves.toEqual({});
  });

  test('executeAzCommand handles whitespace-only stdout', async () => {
    const svc = new AzureCliService(execAsyncMock as any);

    execAsyncMock.mockImplementation(async (cmd: string) => {
      if (cmd === 'az --version') return { stdout: 'ok', stderr: '' };
      if (cmd === 'az account show') return { stdout: '{}', stderr: '' };
      if (cmd.includes('az group')) return { stdout: '   \n  ', stderr: '' };
      return { stdout: '', stderr: '' };
    });

    await expect(svc.executeAzCommand('az group list')).resolves.toEqual({});
  });

  test('executeAzCommand checks for az devops commands', async () => {
    const svc = new AzureCliService(execAsyncMock as any);

    execAsyncMock.mockImplementation(async (cmd: string) => {
      if (cmd === 'az --version') return { stdout: 'ok', stderr: '' };
      if (cmd === 'az account show') return { stdout: '{}', stderr: '' };
      if (cmd.includes('extension list')) return { stdout: JSON.stringify([{ name: 'other' }]), stderr: '' };
      return { stdout: '', stderr: '' };
    });

    await expect(svc.executeAzCommand('az devops project list')).rejects.toBeInstanceOf(AzureDevOpsExtensionNotInstalledError);
  });

  test('executeAzCommand detects resource not found in stderr', async () => {
    const svc = new AzureCliService(execAsyncMock as any);

    execAsyncMock.mockImplementation(async (cmd: string) => {
      if (cmd === 'az --version') return { stdout: 'ok', stderr: '' };
      if (cmd === 'az account show') return { stdout: '{}', stderr: '' };
      if (cmd.includes('az group')) return { stdout: '', stderr: 'resource not found' };
      return { stdout: '', stderr: '' };
    });

    await expect(svc.executeAzCommand('az group show --name xyz')).rejects.toBeInstanceOf(AzureCliExecutionError);
  });

  test('getAzureDevOpsAccessToken handles general execution error', async () => {
    const svc = new AzureCliService(execAsyncMock as any);

    execAsyncMock.mockImplementation(async (cmd: string) => {
      if (cmd === 'az --version') return { stdout: 'ok', stderr: '' };
      if (cmd === 'az account show') return { stdout: '{}', stderr: '' };
      if (cmd.includes('get-access-token')) {
        const err: any = new Error('token failed');
        err.stderr = 'some error';
        throw err;
      }
      return { stdout: '', stderr: '' };
    });

    await expect(svc.getAzureDevOpsAccessToken()).rejects.toBeInstanceOf(AzureCliExecutionError);
  });

  test('hasDevOpsExtension returns false when extension list is empty', async () => {
    const svc = new AzureCliService(execAsyncMock as any);

    execAsyncMock.mockResolvedValueOnce({ stdout: JSON.stringify([]), stderr: '' });

    await expect(svc.hasDevOpsExtension()).resolves.toBe(false);
  });

  test('Error classes have correct properties', () => {
    const notInstalledErr = new AzureCliNotInstalledError();
    expect(notInstalledErr.name).toBe('AzureCliNotInstalledError');
    expect(notInstalledErr.message).toContain('Azure CLI is not installed');

    const notAuthErr = new AzureCliNotAuthenticatedError();
    expect(notAuthErr.name).toBe('AzureCliNotAuthenticatedError');
    expect(notAuthErr.message).toContain('Not authenticated');

    const extErr = new AzureDevOpsExtensionNotInstalledError();
    expect(extErr.name).toBe('AzureDevOpsExtensionNotInstalledError');
    expect(extErr.message).toContain('Azure DevOps extension not installed');

    const configErr = new AzureDevOpsNotConfiguredError();
    expect(configErr.name).toBe('AzureDevOpsNotConfiguredError');
    expect(configErr.message).toContain('organization not configured');

    const execErr = new AzureCliExecutionError('test msg', 'test stderr', 42);
    expect(execErr.name).toBe('AzureCliExecutionError');
    expect(execErr.message).toBe('test msg');
    expect(execErr.stderr).toBe('test stderr');
    expect(execErr.exitCode).toBe(42);
  });
});
