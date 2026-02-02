Azure Commander — Quick Start

Prerequisites
- Azure CLI installed: https://learn.microsoft.com/cli/azure/install-azure-cli
- Node.js >= 18 (optional for local run)

Authenticate
1. Interactive (recommended for local use):
   az login
2. CI or non-interactive environments: set a token
   export AZURE_DEVOPS_EXT_PAT="<your-pat>"     # Preferred for Azure DevOps
   or
   export AZ_ACCESS_TOKEN="<your-token>"

Install / Run
- Install locally (global):
  npm install -g .
- Or run without installing (project root):
  npx tsx src/index.ts <command>

Commands (MVP)
1) List your PRs
  azc my-prs [--role author|reviewer|all] [--status active|completed|all] [--repo <name>] [-n <number>] [-o json|table]
  Example: azc my-prs --role author --status active -n 10

2) Show comments for a PR
  azc pr-comments <PR_ID> [--chronological] [--open] [-o json|table]
  Example: azc pr-comments 12345 --open

Notes
- The tool will reuse your Azure CLI authentication (az account get-access-token) when available; otherwise it falls back to AZURE_DEVOPS_EXT_PAT or AZ_ACCESS_TOKEN.
- For scripts prefer JSON output: -o json
- If a command is already available in your environment, the CLI will detect and skip re-authentication.

Troubleshooting
- If you see authentication errors, verify: az login or that AZURE_DEVOPS_EXT_PAT is set.
- To check token source, run a command with -o json and inspect metadata (if available).

That's it — minimal steps to login, list your PRs, and view PR comments.