// Writes docs/clock/version.json for the clock's footer. The site is deployed
// continuously, so the deployed git commit acts as the version. Values come
// from Vercel's system environment variables or, for the Pages build, GitHub
// Actions'. Without a commit nothing is written and the footer leaves it out.

import { writeFileSync } from "node:fs";

const env = process.env;
const commit = env.VERCEL_GIT_COMMIT_SHA || env.GITHUB_SHA;
if (!commit) {
  console.log("clock-version: no commit in the environment, skipping version.json");
  process.exit(0);
}

const repo = env.VERCEL_GIT_COMMIT_SHA
  ? env.VERCEL_GIT_PROVIDER === "github" && env.VERCEL_GIT_REPO_OWNER && env.VERCEL_GIT_REPO_SLUG
    ? `${env.VERCEL_GIT_REPO_OWNER}/${env.VERCEL_GIT_REPO_SLUG}`
    : null
  : env.GITHUB_REPOSITORY || null;

const info = {
  commit,
  shortCommit: commit.slice(0, 7),
  commitUrl: repo ? `https://github.com/${repo}/commit/${commit}` : null,
  environment: env.VERCEL_ENV || null,
};

const out = new URL("../docs/clock/version.json", import.meta.url);
writeFileSync(out, `${JSON.stringify(info, null, 2)}\n`);
console.log(`clock-version: ${info.shortCommit}${info.environment ? ` (${info.environment})` : ""}`);
