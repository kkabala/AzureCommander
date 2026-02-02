import { jest } from '@jest/globals';
import { ConfigService } from '../../../src/services/config.service.js';
import { AuthenticationService } from '../../../src/services/auth.service.js';

describe('ConfigService', () => {
  let mockAuthService: jest.Mocked<AuthenticationService>;
  let configService: ConfigService;

  beforeEach(() => {
    mockAuthService = {
      getAccessToken: jest.fn(),
      getSubscriptionInfo: jest.fn(),
      getAuthenticationContext: jest.fn(),
      clearCache: jest.fn(),
    } as any;

    configService = new ConfigService(undefined, mockAuthService as any);
  });

  afterEach(() => jest.clearAllMocks());

  it('delegates getAccessToken to AuthenticationService', async () => {
    mockAuthService.getAccessToken.mockResolvedValue('token-123');
    const token = await configService.getAccessToken();
    expect(token).toBe('token-123');
    expect(mockAuthService.getAccessToken).toHaveBeenCalled();
  });

  it('delegates getSubscriptionInfo to AuthenticationService', async () => {
    const sub = { id: '1', name: 'n', tenantId: 't', state: 'Enabled' } as any;
    mockAuthService.getSubscriptionInfo.mockResolvedValue(sub);
    const res = await configService.getSubscriptionInfo();
    expect(res).toBe(sub);
    expect(mockAuthService.getSubscriptionInfo).toHaveBeenCalled();
  });

  it('delegates getAuthenticationContext to AuthenticationService', async () => {
    const ctx = { accessToken: 't', source: 'environment-pat' } as any;
    mockAuthService.getAuthenticationContext.mockResolvedValue(ctx);
    const res = await configService.getAuthenticationContext();
    expect(res).toBe(ctx);
    expect(mockAuthService.getAuthenticationContext).toHaveBeenCalled();
  });

  it('clearCache calls authService.clearCache', () => {
    configService.clearCache();
    expect(mockAuthService.clearCache).toHaveBeenCalled();
  });
});
