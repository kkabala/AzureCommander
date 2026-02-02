---
name: azure-commander-cli
description: Use the Azure Commander (azc) CLI tool to interact with Azure DevOps Pull Requests. Use this skill when you need to list PRs, view PR comments, or work with Azure DevOps code reviews. Requires Azure CLI to be installed and configured.
---

# Azure Commander (azc) - Pull Request Tool

## Overview

Azure Commander (`azc`) is a TypeScript CLI tool that wraps Azure CLI commands for Azure DevOps operations, specifically focused on Pull Request management. Use this skill when working with Azure DevOps PRs.

## Prerequisites

Before using `azc`, ensure:

1. **Azure CLI is installed**
   ```bash
   az --version
   ```
   If not installed: https://aka.ms/install-azure-cli

2. **Azure DevOps extension is installed**
   ```bash
   az extension add --name azure-devops
   ```

3. **User is logged in**
   ```bash
   az login
   ```

4. **Azure DevOps organization is configured**
   ```bash
   az devops configure --defaults organization=https://dev.azure.com/YOUR_ORG project=YOUR_PROJECT
   ```
   Or for Visual Studio-style URLs:
   ```bash
   az devops configure --defaults organization=https://YOUR_ORG.visualstudio.com/ project=YOUR_PROJECT
   ```

## Setup (One-time)

```bash
cd /path/to/AzureCommander
npm install
npm run build
npm link
```

## Verify Installation

```bash
azc --help
```

Expected output:
```
Usage: azc [options] [command]
Azure Commander - CLI wrapper for Azure DevOps
Options:
  -V, --version   output the version number
  -h, --help      display help for command
Commands:
  pr              Pull request commands
  help [command]  display help for command
```

## Available Commands

### List My Pull Requests

```bash
# Show all PRs where you are author or reviewer
azc pr my-prs

# Filter by status
azc pr my-prs --status active
azc pr my-prs --status completed
azc pr my-prs --status abandoned
azc pr my-prs --status all

# Filter by role
azc pr my-prs --role author
azc pr my-prs --role reviewer
azc pr my-prs --role all

# Other options
azc pr my-prs --repo <repository-name>
azc pr my-prs --top <number>
azc pr my-prs --output table|json
```

### View PR Comments

```bash
# Show all comments for a specific PR
azc pr pr-comments <PR_ID>

# Examples
azc pr pr-comments 12345
azc pr pr-comments 12345 --output json
azc pr pr-comments 12345 --chronological    # Sort oldest first
azc pr pr-comments 12345 --open             # Open PR in browser

# Specify project/repo if needed
azc pr pr-comments 12345 --project <project-name>
azc pr pr-comments 12345 --repo <repository-name>
```

## Common Use Cases

| Task | Command |
|------|---------|
| List my active PRs | `azc pr my-prs --status active` |
| List PRs I need to review | `azc pr my-prs --role reviewer` |
| View PR comments | `azc pr pr-comments <PR_ID>` |
| Export comments as JSON | `azc pr pr-comments <PR_ID> --output json > comments.json` |
| Open PR in browser | `azc pr pr-comments <PR_ID> --open` |

## Troubleshooting

| Error | Solution |
|-------|----------|
| "Organization URL not configured" | Run: `az devops configure --defaults organization=https://dev.azure.com/YOUR_ORG` |
| "Azure CLI is not installed" | Install from: https://aka.ms/install-azure-cli |
| "Not authenticated" | Run: `az login` |
| "Azure DevOps extension not installed" | Run: `az extension add --name azure-devops` |
| Command `azc` not found | Run: `cd /path/to/AzureCommander && npm run build && npm link` |
