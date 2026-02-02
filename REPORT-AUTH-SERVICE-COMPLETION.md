Completion Report - Authentication Service Implementation

Branch: feature/config-service

Summary:
- Implemented AuthenticationService with env var and Azure CLI fallback, subscription retrieval, caching, and clearCache.
- Integrated AuthenticationService into ConfigService and updated AzureApiService to use ConfigService for tokens.
- Added unit tests for auth and config services and documentation AUTHENTICATION_SERVICE.md.

Verification:
- Ran targeted tests: npm test -- --testPathPattern="auth.service|config.service" -> All tests passed (2 suites, 31 tests)
- TypeScript compile check: npx tsc --noEmit -> Success

Notes:
- Tokens are never logged and error messages do not expose token values.
- Minimal, focused changes made to add authentication capabilities and tests.
