# Task 1: Project Setup & Foundation

## Objective
Establish the foundational TypeScript project structure with proper configuration for ESM modules, Jest testing, and CLI execution. This creates the baseline infrastructure that all subsequent tasks will build upon.

## Files to Create/Modify
- `package.json`
- `tsconfig.json`
- `jest.config.js`
- `.gitignore`
- `src/` (directory)
- `tests/unit/` (directory)
- `tests/integration/` (directory)
- `tasks/` (directory)

## Implementation Details

### 1. Initialize npm project
```bash
npm init -y
```

### 2. Install dependencies
```bash
# Production dependencies
npm install commander@^12.0.0 chalk@^5.3.0 open@^10.0.0

# Development dependencies
npm install -D typescript@^5.3.0 @types/node@^20.0.0 jest@^29.0.0 @types/jest@^29.0.0 ts-jest@^29.0.0 tsx@^4.7.0
```

### 3. Configure package.json
```json
{
  "name": "azure-commander",
  "version": "0.1.0",
  "description": "TypeScript CLI wrapper around Azure CLI commands",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "azc": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "tsc --noEmit"
  },
  "keywords": ["azure", "cli", "devops", "pull-request"],
  "author": "",
  "license": "MIT"
}
```

### 4. Configure tsconfig.json for ESM
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 5. Configure Jest for TypeScript
```javascript
// jest.config.js
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
    }],
  },
};
```

### 6. Create .gitignore
```
node_modules/
dist/
coverage/
*.log
.DS_Store
.env
.vscode/
.idea/
```

### 7. Create folder structure
```bash
mkdir -p src/commands/pr/my-prs
mkdir -p src/commands/pr/comments
mkdir -p src/services
mkdir -p src/formatters
mkdir -p src/types
mkdir -p tests/unit/services
mkdir -p tests/unit/commands
mkdir -p tests/unit/formatters
mkdir -p tests/integration
mkdir -p tasks
```

### 8. Create a simple test to verify Jest setup
Create `tests/unit/setup.test.ts`:
```typescript
describe('Project Setup', () => {
  it('should have Jest configured correctly', () => {
    expect(true).toBe(true);
  });

  it('should support TypeScript', () => {
    const add = (a: number, b: number): number => a + b;
    expect(add(2, 3)).toBe(5);
  });
});
```

## Dependencies
- None (this is the foundational task)

## Acceptance Criteria
- [ ] Project initializes with `npm install` without errors
- [ ] TypeScript compiles successfully with `npm run lint`
- [ ] Jest runs successfully with `npm test`
- [ ] All directories exist as specified in project structure
- [ ] Setup test passes with 100% coverage
- [ ] `package.json` includes all required dependencies
- [ ] `tsconfig.json` is configured for ESM modules
- [ ] `jest.config.js` is configured for TypeScript with ESM support

## Test Cases
- **Test Case 1: Verify Jest Configuration**
  - Run `npm test`
  - Expected: Tests execute and pass
  
- **Test Case 2: Verify TypeScript Compilation**
  - Run `npm run lint`
  - Expected: No TypeScript errors
  
- **Test Case 3: Verify Project Structure**
  - Check that all required directories exist
  - Expected: All folders from project structure are present
  
- **Test Case 4: Verify Build Process**
  - Run `npm run build`
  - Expected: `dist/` directory is created with compiled JavaScript files
