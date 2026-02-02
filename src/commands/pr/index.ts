import { Command } from "commander";
import { createMyPRsCommand } from "./my-prs/my-prs.command.js";
import { createPRCommentsCommand } from "./comments/comments.command.js";

/**
 * Create the PR command group
 */
export function createPRCommand(): Command {
  const command = new Command("pr");

  command.description("Pull request commands").addCommand(createMyPRsCommand()).addCommand(createPRCommentsCommand());

  return command;
}
