# Authentication Service - Implementation Documentation

## Overview

The Authentication Service provides a centralized and secure way to retrieve Azure authentication context for the Azure Commander CLI. It supports multiple authentication methods with automatic fallback mechanisms.

## Features

1. **Multiple Authentication Sources**: 
   - Azure CLI (`az account get-access-token`)
   - Environment variable: `AZURE_DEVOPS_EXT_PAT`
   - Environment variable: `AZ_ACCESS_TOKEN`

2. **Automatic Fallback**: Tries environment variables first, then falls back to Azure CLI

3. **Security**: 
   - Tokens are never logged
   - Tokens are read from secure sources only
   - Error messages do not expose token values

4. **Azure Subscription Information**: 
   - Retrieves subscription details when using Azure CLI
   - Includes subscription ID, name, tenant ID, and state

5. **Caching**: 
   - Tokens and subscription info are cached after first retrieval
   - Cache can be manually cleared when needed

## Architecture

### New Services

#### `AuthenticationService` (`src/services/auth.service.ts`)
Handles all authentication-related operations including token retrieval and subscription information.

**Public Methods:**
- `getAccessToken(): Promise<string>` - Retrieves access token from env vars or Azure CLI
- `getSubscriptionInfo(): Promise<AzureSubscriptionInfo | undefined>` - Gets Azure subscription details
- `getAuthenticationContext(): Promise<AzureAuthenticationContext>` - Gets complete auth context
- `clearCache(): void` - Clears cached tokens and subscription info

### Updated Services

#### `ConfigService` (`src/services/config.service.ts`)
Enhanced to expose authentication capabilities through delegation to AuthenticationService.

**New Methods:**
- `getAccessToken(): Promise<string>` - Delegates to AuthenticationService
- `getSubscriptionInfo(): Promise<AzureSubscriptionInfo | undefined>` - Delegates to AuthenticationService  
- `getAuthenticationContext(): Promise<AzureAuthenticationContext>` - Delegates to AuthenticationService

**Updated Methods:**
- `clearCache(): void` - Now also clears authentication cache

#### `AzureApiService` (`src/services/azure-api.service.ts`)
Updated to use ConfigService for token retrieval, inheriting the fallback mechanism.

## Usage

### Basic Token Retrieval

```typescript
import { ConfigService } from './services/config.service.js';

const configService = new ConfigService();

// Get access token (tries env vars first, then Azure CLI)
const token = await configService.getAccessToken();
```

### Get Full Authentication Context

```typescript
import { ConfigService } from './services/config.service.js';

const configService = new ConfigService();

// Get complete authentication context
const context = await configService.getAuthenticationContext();

console.log(`Token source: ${context.source}`);
console.log(`Access token: ${context.accessToken.substring(0, 10)}...`);

if (context.subscription) {
  console.log(`Subscription: ${context.subscription.name}`);
  console.log(`Subscription ID: ${context.subscription.id}`);
  console.log(`Tenant ID: ${context.subscription.tenantId}`);
}
```

### Get Subscription Information

```typescript
import { ConfigService } from './services/config.service.js';

const configService = new ConfigService();

// Get subscription info (only available with Azure CLI)
const subscription = await configService.getSubscriptionInfo();

if (subscription) {
  console.log(`Using subscription: ${subscription.name} (${subscription.id})`);
} else {
  console.log('No subscription information available (using env var token)');
}
```

## Environment Variables

### AZURE_DEVOPS_EXT_PAT
Personal Access Token (PAT) for Azure DevOps.

**Priority**: Highest (checked first)

**Use Case**: 
- CI/CD pipelines
- Automated scripts
- Environments without Azure CLI

**Example**:
```bash
export AZURE_DEVOPS_EXT_PAT="your-pat-token-here"
```

### AZ_ACCESS_TOKEN
Azure access token.

**Priority**: Medium (checked second)

**Use Case**: 
- When you have a pre-fetched token
- Custom authentication flows

**Example**:
```bash
export AZ_ACCESS_TOKEN="your-access-token-here"
```

### Azure CLI
Uses `az account get-access-token` command.

**Priority**: Lowest (fallback)

**Use Case**: 
- Interactive development
- Local machine with Azure CLI installed
- Provides subscription information

**Requires**:
```bash
az login
```

## Security Considerations

1. **Token Protection**:
   - Tokens are stored in private fields
   - Tokens are never included in error messages
   - No logging of sensitive data

2. **Environment Variables**:
   - Whitespace is trimmed from env vars
   - Empty strings are treated as unset
   - Validates token presence before use

3. **Error Handling**:
   - Descriptive errors without exposing tokens
   - Original errors are preserved as cause
   - Clear guidance on how to resolve issues

4. **Cache Management**:
   - Tokens are cached for performance
   - Cache can be cleared when tokens expire
   - Independent caching for tokens and subscription info

## Types Reference

### AzureSubscriptionInfo

```typescript
interface AzureSubscriptionInfo {
  id: string;              // Subscription ID
  name: string;            // Subscription name
  tenantId: string;        // Azure AD Tenant ID
  state: string;           // Subscription state (e.g., "Enabled")
}
```

### AzureAuthenticationContext

```typescript
interface AzureAuthenticationContext {
  accessToken: string;                                    // Access token
  subscription?: AzureSubscriptionInfo;                   // Subscription (only with Azure CLI)
  source: 'azure-cli' | 'environment-pat' | 'environment-token';  // Token source
}
```

## Testing

### Running Tests

```bash
# Run all auth service tests
npm test -- --testPathPattern=auth.service.test

# Run all config service tests (includes new auth methods)
npm test -- --testPathPattern=config.service.test

# Run with coverage
npm test -- --coverage --testPathPattern=auth.service.test
```

## Integration with Existing Code

The implementation integrates seamlessly with existing services:

1. **AzureApiService**: Automatically uses the new authentication with fallback
2. **ConfigService**: Maintains backward compatibility while adding new capabilities
3. **No Breaking Changes**: Existing code continues to work without modifications

## Troubleshooting

### "Failed to retrieve access token"

**Cause**: No authentication method is available or working.

**Solutions**:
1. Run `az login` to authenticate with Azure CLI
2. Set `AZURE_DEVOPS_EXT_PAT` environment variable
3. Set `AZ_ACCESS_TOKEN` environment variable

### Subscription info is undefined

**Cause**: Using PAT or environment token instead of Azure CLI.

**Solution**: This is expected behavior. Subscription info is only available when using Azure CLI authentication.

### Token seems expired

**Cause**: Cached token has expired.

**Solution**: 
```typescript
configService.clearCache();
const newToken = await configService.getAccessToken();
```
