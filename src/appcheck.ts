import fetch from "node-fetch";
import semver from "semver";
import { Octokit } from "@octokit/rest";
import { marked } from "marked";
import marked_terminal from "marked-terminal";
import checkHomeAssistant from "./special-apps/homeAssistant.js";
import * as fs from "fs/promises";
import { existsSync } from "fs";
import * as path from "path";
import YAML from "./yaml-tools.js";
import { AppYmlV1, AppYmlV3, getUpdateContainers, updateContainer } from "./appYml.js";
import { TwitterApi } from 'twitter-api-v2';

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
  directory: string,
  consumerkey: undefined | string,
  consumersecret: undefined | string,
  accesstoken: undefined | string,
  accesstokensecret: undefined | string
): Promise<string> {
  let failedApps: string[] = [];
  const octokitOptions = process.env.GITHUB_TOKEN
    ? {
        auth: process.env.GITHUB_TOKEN,
      }
    : {};
  let twitter: TwitterApi | false = false;
  if(consumerkey && consumersecret && accesstoken && accesstokensecret)
    twitter = new TwitterApi({
      appKey: consumerkey,
      appSecret: consumersecret,
      accessToken: accesstoken,
      accessSecret: accesstokensecret,
    });
  const octokit = new Octokit(octokitOptions);
  let data: App[] | SimpleApp[] = [];
  let apps = await fs.readdir(directory);
  const potentialUpdates: VersionDiff[] = [];

  for (const appName of apps) {
    console.info(`Checking app ${appName}...`);
    const appDirectory = path.join(directory, appName);
    if (!existsSync(appDirectory)) continue;
    const appYml = path.join(appDirectory, "app.yml");
    if (!existsSync(appYml)) continue;
    const appYmlData = YAML.parse(
      await fs.readFile(appYml, "utf8")
    ) as YAML & { yaml: AppYmlV1 | AppYmlV3 };
    if (appYmlData.yaml.version?.toString() !== "1" && appYmlData.yaml.version?.toString() !== "2" && appYmlData.yaml.version?.toString() !== "3") continue;
    const app = appYmlData.yaml.metadata;
    if (typeof appYmlData.yaml.metadata.repo !== "string" || !appYmlData.yaml.metadata.repo?.startsWith("https://github.com/")) {
      console.info("Version checking is not supported/disabled for this app.");
      failedApps.push(app.name);
      continue;
    }
    const { owner, repo } = getOwnerAndRepo(app.repo as string);
    if(!repo || !owner) {
      console.info("Version checking is not supported/disabled for this app.");
      failedApps.push(app.name);
      continue;
    }
    const appVersion = app.version;
    if (appName === "lnbits") {
      const currentCommit = await checkCommits(app.repo as string, octokit);
      if (currentCommit !== app.version) {
        potentialUpdates.push({
          citadel: appVersion,
          current: currentCommit,
          app: app.name,
          id: appName,
        });
      }
    } else if (appName === "photoprism") {
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
          id: appName,
        });
      }
    } else if (appName === "home-assistant" || appName === "pi-hole") {
      const homeAssistantVersion = await checkHomeAssistant(
        octokit,
        owner,
        repo,
        app.version,
        app.name
      );
      if (homeAssistantVersion) {
        potentialUpdates.push({ ...homeAssistantVersion, id: appName });
      }
    } else {
      if (!semver.valid(app.version)) {
        console.info(`${app.name}: ${app.version} is not a valid semver.`);
        potentialUpdates.push({
          citadel: appVersion,
          current: "Check failed.",
          app: app.name,
          id: appName,
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
          return appsInBeta.includes(appName) || !isPrerelease(tag.name);
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
      if(sortedTags.length == 0) {
        failedApps.push(appName);
        continue;
      }
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
          id: appName,
        });
      }
    }
  }
  if (potentialUpdates == []) {
    return "No updates were found, everything seems up-to-date.";
  }
    let appsDirectory = directory;
    for (let update of potentialUpdates) {
      const appDirectory = path.join(appsDirectory, update.id);
      if (!existsSync(appDirectory)) continue;
      const appYml = path.join(appDirectory, "app.yml");
      if (!existsSync(appYml)) continue;
      const appYmlData = YAML.parse(
        await fs.readFile(appYml, "utf8")
      ) as YAML & { yaml: AppYmlV1 | AppYmlV3 };
      if (appYmlData.yaml.version?.toString() !== "1" && appYmlData.yaml.version?.toString() !== "2") continue;
      console.log(`Updating ${update.app}...`);
      let updateAbleContainers = getUpdateContainers(appYmlData.yaml);
      let wasUpdated = true;
      appYmlData.yaml.metadata.version = update.current;
      for (let container of updateAbleContainers) {
        let containerIndex = appYmlData.yaml.containers.indexOf(container as any);
        try {
          appYmlData.yaml.containers[containerIndex] = await updateContainer(
            container,
            update.id === "gitea" ? `${update.current}-rootless` : update.current
          );
        } catch (e) {
          console.error(e);
          appYmlData.yaml.metadata.version = update.citadel;
          wasUpdated = false;
        }
      }
      // Now write the new app.yml
      await fs.writeFile(appYml, YAML.stringify(appYmlData));
      potentialUpdates.splice(potentialUpdates.indexOf(update), 1);
      if(wasUpdated && twitter)
        await twitter.v1.tweet(`I just updated ${update.app} to ${update.current} on Citadel! Press the "Update apps" button on the dashboard to update.`);
      else if(twitter)
        await twitter.v1.tweet(`I failed to update ${update.app} to ${update.current} on Citadel! @AaronDewes Please fix this!`);
    }
  let table = `| app | current release | used in Citadel |\n`;
  table += "|-----|-----------------|----------------|\n";
  potentialUpdates.forEach((update) => {
    if(twitter)
      twitter.v1.tweet(`I failed to update ${update.app} to ${update.current} on Citadel! @AaronDewes Please fix this!`);
    table += `| ${update.app} | ${update.current} | ${update.citadel} |\n`;
  });
  failedApps.forEach(app => {
    table += `| ${app} |  Couldn't check | Couldn't check |`;
  });
  return table;
}

export async function formatData(
  outputPlain: boolean = false,
  directory: string,
  consumerkey: undefined | string,
  consumersecret: undefined | string,
  accesstoken: undefined | string,
  accesstokensecret: undefined | string
): Promise<string> {
  const upgrades = await getAppUpgrades(directory, consumerkey, consumersecret, accesstoken, accesstokensecret);
  if (outputPlain) {
    return upgrades;
  } else {
    return marked(upgrades);
  }
}
