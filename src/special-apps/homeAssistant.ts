import { Octokit } from "@octokit/rest";

interface VersionDiff {
  app: string;
  citadel: string;
  current: string;
}

export default async function checkHomeAssistant(
  octokit: InstanceType<typeof Octokit>,
  owner: string,
  repo: string,
  appVersion: string,
  appName: string
): Promise<VersionDiff | undefined> {
  const tagList = await octokit.rest.repos.listTags({
    owner,
    repo,
  });
  // Tags are in the format ${year}.${month}.${releaseNumber}
  // for beta releases, releaseNumber contains a b, otherwise, it's a plain number
  // First, remove beta releases from the array, then sort it by year, moth and release number
  const sortedTags = tagList.data
    .filter((tag) => {
      return !tag.name.includes("b");
    })
    .sort((a, b) => {
      const aNum = parseInt(a.name.split(".")[0]);
      const bNum = parseInt(b.name.split(".")[0]);
      if (aNum !== bNum) {
        return aNum - bNum;
      }
      const aNum2 = parseInt(a.name.split(".")[1]);
      const bNum2 = parseInt(b.name.split(".")[1]);
      if (aNum2 !== bNum2) {
        return aNum2 - bNum2;
      }
      const aNum3 = parseInt(a.name.split(".")[2] || "0");
      const bNum3 = parseInt(b.name.split(".")[2] || "0");
      return aNum3 - bNum3;
    });
  // Then, check if the highest tag is higher than the currently used tag by again comparing the year, the month and release number
  const highestNum = parseInt(
    sortedTags[sortedTags.length - 1].name.split(".")[0]
  );
  const highestNum2 = parseInt(
    sortedTags[sortedTags.length - 1].name.split(".")[1]
  );
  const highestNum3 = parseInt(
    sortedTags[sortedTags.length - 1].name.split(".")[2] || "0"
  );
  const currentNum = parseInt(appVersion.split(".")[0]);
  const currentNum2 = parseInt(appVersion.split(".")[1]);
  const currentNum3 = parseInt(appVersion.split(".")[2] || "0");
  if (
    highestNum > currentNum ||
    (highestNum === currentNum && highestNum2 > currentNum2) ||
    (highestNum === currentNum &&
      highestNum2 === currentNum2 &&
      highestNum3 > currentNum3)
  ) {
    return {
      citadel: appVersion,
      current: sortedTags[sortedTags.length - 1].name,
      app: appName,
    };
  }
}
