#!/usr/bin/env node

import { Command } from "commander";
import { createPRCommand } from "./commands/pr/index.js";

const program = new Command();

program.name("azc").description("Azure Commander - CLI wrapper for Azure DevOps").version("0.1.0");

// Register commands
program.addCommand(createPRCommand());

program.parse();
