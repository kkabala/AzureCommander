# Azure Commander (azc)

Azure Commander is a small TypeScript CLI wrapper around the Azure CLI focused on Azure DevOps pull request workflows. It provides commands to list pull requests where you are the author or reviewer and to display comment threads for a specific PR, reusing Azure CLI authentication or environment tokens.

## Features
- List pull requests where you are an author or reviewer
- Show and filter PR comment threads (chronological/reverse)
- Open a pull request in the browser
- Supports JSON and table output for easy scripting or interactive use

## Prerequisites
- Azure CLI installed: https://learn.microsoft.com/cli/azure/install-azure-cli
- (Recommended) Azure DevOps extension: `az extension add --name azure-devops`
- Node.js >= 18 (only required for running from source)

## Authentication and configuration
The tool will attempt to obtain an access token from these sources (in this order):
1. AZURE_DEVOPS_EXT_PAT environment variable (Personal Access Token)
2. AZ_ACCESS_TOKEN environment variable
3. Azure CLI: `az account get-access-token` (requires `az login`)

Set a default Azure DevOps organization and project with the Azure CLI if desired:

  az devops configure --defaults organization=https://dev.azure.com/YOUR_ORG project=YOUR_PROJECT

Or set the organization URL via the environment variable:

  export AZURE_DEVOPS_ORG_URL="https://dev.azure.com/YOUR_ORG"

## Installation
Install globally from the project root:

  npm install -g .

Or run directly without installing (for development):

  npx tsx src/index.ts pr <subcommand>

The installed binary is available as `azc` (program name).

## Usage
Commands are grouped under `pr`:

- List PRs where you are the author or reviewer:

  azc pr my-prs --role author|reviewer|all --status active|completed|abandoned|all -n <number> -o table|json

  Example:
  azc pr my-prs --role author --status active -n 10 -o table

- Show comment threads for a pull request:

  azc pr pr-comments <PR_ID> [--chronological] [--open] -o table|json

  Example:
  azc pr pr-comments 12345 --open -o table

Notes:
- Use `-o json` for machine-readable output suitable for scripts.
- The CLI will reuse Azure CLI authentication when available; set environment tokens for CI/non-interactive usage.

## Development
- Build: `npm run build`
- Run locally (no install): `npm run dev` (uses `tsx`)
- Run tests: `npm test`
- Type-check: `npm run lint`

The source code is in `src/` and compiled output goes to `dist/`.

## Project structure (important files)
- src/index.ts — CLI entry point
- src/commands/pr — PR-related command group and subcommands (my-prs, pr-comments)
- src/services — services for Azure CLI interaction, REST API calls, and authentication
- src/types — TypeScript types used across the project

## Contributing
Contributions and issues are welcome. Please open a PR with clear summary and tests where applicable.

## License
MIT
