import fetch from "node-fetch";
import semver from "semver";
import { Octokit } from "@octokit/rest";
import marked from "marked";
import marked_terminal from "marked-terminal";
import checkHomeAssistant from "./special-apps/homeAssistant.js";
import * as fs from "fs/promises";
import { existsSync } from "fs";
import * as path from "path";
import YAML from "./yaml-tools.js";
import {
  AppYmlV1,
  getUpdateContainers,
  updateContainer,
} from "./appYml.js";

marked.setOptions({
  renderer: new marked_terminal(),
});

// Check if a semver is valid
function isValidSemver(version: string): boolean {
  // If the version starts with a v, remove it
  if (version.startsWith("v")) {
    version = version.substring(1);
  }
  const isValid = semver.valid(version) !== null;
  return isValid;
}

// Check if a semver is a prerelease version
function isPrerelease(version: string): boolean {
  // If the version starts with a v, remove it
  if (version.startsWith("v")) {
    version = version.substring(1);
  }
  let isPrerelease = semver.prerelease(version) !== null;
  isPrerelease =
    isPrerelease || version.includes("rc") || version.includes("beta");
  return isPrerelease;
}

// Get the owner and repo from a given github.com/* URL or github repo in username/repo format
function getOwnerAndRepo(repository: string): {
  owner: string;
  repo: string;
} {
  // If the repository is a URL, get the owner and repo from the URL
  if (repository.startsWith("http")) {
    const url = new URL(repository);
    const owner = url.pathname.split("/")[1];
    const repo = url.pathname.split("/")[2];
    return {
      owner,
      repo,
    };
  } else {
    // If the repository is in username/repo format, get the owner and repo from the string
    const owner = repository.split("/")[0];
    const repo = repository.split("/")[1];
    return {
      owner,
      repo,
    };
  }
}

async function checkCommits(
  repository: string,
  octokit: InstanceType<typeof Octokit>
): Promise<string> {
  const { owner, repo } = getOwnerAndRepo(repository);

  // Get the repos default branch
  const repoInfo = await octokit.repos.get({
    owner,
    repo,
  });
  // Get the latest commit from the repo
  const appRepo = await octokit.rest.repos.getCommit({
    owner,
    repo,
    ref: repoInfo.data.default_branch,
  });
  return appRepo.data.sha.substr(0, 7);
}
interface SimpleApp {
  id: string;
  name: string;
  version: string;
  repo: string;
}

interface App {
  id: string;
  category: string;
  name: string;
  version: string;
  tagline: string;
  description: string;
  developer: string;
  website: string;
  dependencies: string[];
  repo: string;
  support: string;
  port: number;
  gallery: string[];
  path: string;
  defaultPassword: string;
  torOnly?: boolean;
}

interface VersionDiff {
  app: string;
  id: string;
  citadel: string;
  current: string;
}

// IDs of apps which don't have releases which aren't prerelease
const appsInBeta: string[] = ["lightning-terminal"];

export async function getAppUpgrades(
  node: "Umbrel" | "Citadel",
  directory: undefined | string
): Promise<string> {
  const octokitOptions = process.env.GITHUB_TOKEN
    ? {
        auth: process.env.GITHUB_TOKEN,
      }
    : {};
  let githubRepo: string;
  let githubBranch: string;
  let registryFile: string;
  switch (node) {
    case "Umbrel":
      githubRepo = "getumbrel/umbrel";
      githubBranch = "master";
      registryFile = "registry.json";
      break;
    case "Citadel":
    default:
      githubRepo = "runcitadel/compose-nonfree";
      githubBranch = "main";
      registryFile = "apps.json";
      break;
  }
  const octokit = new Octokit(octokitOptions);
  let data: App[] | SimpleApp[] = [];
  if (directory)
    data = JSON.parse(
      await fs.readFile(path.join(directory, registryFile), "utf8")
    ) as SimpleApp[];
  else
    data = (await (
      await fetch(
        `https://raw.githubusercontent.com/${githubRepo}/${githubBranch}/apps/${registryFile}`
      )
    ).json()) as App[];

  const potentialUpdates: VersionDiff[] = [];

  for (const app of data) {
    console.info(`Checking app ${app.name}...`);
    if (!app.repo.includes("github.com")) {
      console.info("Version checking is not supported/disabled for this app.");
      continue;
    }

    const { owner, repo } = getOwnerAndRepo(app.repo);
    const appVersion = app.version;
    if (app.id === "lnbits") {
      const currentCommit = await checkCommits(app.repo, octokit);
      if (currentCommit !== app.version) {
        potentialUpdates.push({
          citadel: appVersion,
          current: currentCommit,
          app: app.name,
          id: app.id,
        });
      }
    } else if (app.id === "photoprism") {
      const tagList = await octokit.rest.repos.listTags({
        owner,
        repo,
      });
      // Tags are just dates as number
      // First, sort the tags by their number
      const sortedTags = tagList.data.sort((a, b) => {
        const aNum = parseInt(a.name);
        const bNum = parseInt(b.name);
        return aNum - bNum;
      });
      // Then, check if the highest number is higher than the number of the currently used version
      const highestNum = parseInt(sortedTags[sortedTags.length - 1].name);
      if (highestNum > parseInt(appVersion)) {
        potentialUpdates.push({
          citadel: appVersion,
          current: sortedTags[sortedTags.length - 1].name,
          app: app.name,
          id: app.id,
        });
      }
    } else if (app.id === "home-assistant" || app.id === "pi-hole") {
      const homeAssistantVersion = await checkHomeAssistant(
        octokit,
        owner,
        repo,
        app.version,
        app.name
      );
      if (homeAssistantVersion) {
        potentialUpdates.push({ ...homeAssistantVersion, id: app.id });
      }
    } else {
      if (!semver.valid(app.version)) {
        console.info(`${app.name}: ${app.version} is not a valid semver.`);
        potentialUpdates.push({
          citadel: appVersion,
          current: "Check failed.",
          app: app.name,
          id: app.id,
        });
        continue;
      }
      const tagList = await octokit.rest.repos.listTags({
        owner,
        repo,
      });
      // Remove all tags which aren't semver compatible or, then sort them by semver
      // Also remove all tags that contain a "-" and then letters at the end.
      const sortedTags = tagList.data
        .filter((tag) => {
          return appsInBeta.includes(app.id) || !isPrerelease(tag.name);
        })
        .filter((tag) => {
          return isValidSemver(tag.name);
        })
        .sort((a, b) => {
          return semver.compare(
            a.name.replace("v", ""),
            b.name.replace("v", "")
          );
        });
      // Now compare the tag with the highest semver against the currently used version
      if (
        semver.gt(
          sortedTags[sortedTags.length - 1].name.replace("v", ""),
          app.version.replace("v", "")
        )
      ) {
        potentialUpdates.push({
          citadel: appVersion.replace("v", ""),
          current: sortedTags[sortedTags.length - 1].name.replace("v", ""),
          app: app.name,
          id: app.id,
        });
      }
    }
  }
  if (potentialUpdates == []) {
    return "No updates were found, everything seems up-to-date.";
  }
  if (directory) {
    let appsDirectory = directory;
    for (let update of potentialUpdates) {
      const appDirectory = path.join(appsDirectory, update.id);
      if (!existsSync(appDirectory)) continue;
      const appYml = path.join(appDirectory, "app.yml");
      if (!existsSync(appYml)) continue;
      const appYmlData = YAML.parse(
        await fs.readFile(appYml, "utf8")
      ) as YAML & { yaml: AppYmlV1 };
      if (appYmlData.yaml.version?.toString() !== "1") continue;
      console.log(`Updating ${update.app}...`);
      let updateAbleContainers = getUpdateContainers(appYmlData.yaml);
      let promises: Promise<void>[] = [];
      updateAbleContainers.forEach((container) => {
        promises.push(
          (async () => {
            let containerIndex = appYmlData.yaml.containers.indexOf(container);
            try {
              appYmlData.yaml.containers[containerIndex] =
                await updateContainer(container, update.current);
            } catch (e) {
              console.error(e);
            }
          })()
        );
      });
      await Promise.all(promises);
      appYmlData.yaml.metadata.version = update.current;
      // Now write the new app.yml
      await fs.writeFile(appYml, YAML.stringify(appYmlData));
      potentialUpdates.splice(potentialUpdates.indexOf(update), 1);
    }
  }
  let table = `| app | current release | used in ${node} |\n`;
  table += "|-----|-----------------|----------------|\n";
  potentialUpdates.forEach((update) => {
    table += `| ${update.app} | ${update.current} | ${update.citadel} |\n`;
  });
  return table;
}

export async function formatData(
  node: "Umbrel" | "Citadel" | undefined,
  outputPlain: boolean = false,
  directory: undefined | string
): Promise<string> {
  const upgrades = await getAppUpgrades(node ? node : "Citadel", directory);
  if (outputPlain) {
    return upgrades;
  } else {
    return marked(upgrades);
  }
}
