import { formatData } from "./appcheck.js";
import dotenv from "dotenv";
import { Command } from "commander";
import enquirer from "enquirer";

const program = new Command();

dotenv.config();

// Ask user for GitHub access token or to press enter for none.
// If a token is provided, add it to process.env.GITHUB_TOKEN.
async function askForToken() {
  if (process.env.GITHUB_TOKEN) return;
  const answers = (await enquirer.prompt({
    type: "input",
    name: "token",
    message: "Enter your GitHub access token (optional, but appcheck might fail for many apps without it):",
  })) as { token: string | undefined };
  if (answers.token) {
    process.env.GITHUB_TOKEN = answers.token;
  }
}

program
  .option("-t, --token <token>", "GitHub access token")
  .option("-p, --plain", "Specify this if you don't want markdown output to be formatted")
  .option(
    "-n, --node <node>",
    "'Umbrel' or 'Citadel', depending on what public repo you want to check."
  );

program
  .command("appcheck")
  .description("Check if all apps are up-to-date")
  .action(async (arg1, options) => {
    if (!process.env.GITHUB_TOKEN)
      program.opts().token
        ? (process.env.GITHUB_TOKEN = program.opts().token)
        : await askForToken();
    console.log(await formatData(program.opts().node, program.opts().plain));
  });

program.parse(process.argv);
