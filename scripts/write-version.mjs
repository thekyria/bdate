// Writes the deployed version for the site footers: docs/clock/version.json
// (fetched by the clock at bdate.app) and docs/_data/version.json (read by
// the Jekyll docs layout). The sites are deployed continuously, so the
// deployed git commit acts as the version. Values come from Vercel's system
// environment variables or, when run in GitHub Actions, its own. Without a
// commit nothing is written and the footers leave the version out.

import { mkdirSync, writeFileSync } from "node:fs";

const env = process.env;
const commit = env.VERCEL_GIT_COMMIT_SHA || env.GITHUB_SHA;
if (!commit) {
  console.log("write-version: no commit in the environment, skipping");
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

const json = `${JSON.stringify(info, null, 2)}\n`;
for (const path of ["../docs/clock/version.json", "../docs/_data/version.json"]) {
  const out = new URL(path, import.meta.url);
  mkdirSync(new URL(".", out), { recursive: true });
  writeFileSync(out, json);
}
console.log(`write-version: ${info.shortCommit}${info.environment ? ` (${info.environment})` : ""}`);
