// Writes the old GitHub Pages site (thekyria.github.io/bdate/) as redirects to
// bdate.app, where the docs and the clock now live: one page per docs page,
// pointing to the same page under https://bdate.app/docs/, the clock to
// https://bdate.app/, and a 404 page to the docs. Used by
// .github/workflows/pages.yml; the output directory is the first argument.
import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const DOCS = new URL("../docs/", import.meta.url).pathname;
const out = process.argv[2];
if (!out) {
  console.error("usage: node scripts/write-redirects.mjs <output directory>");
  process.exit(1);
}

const page = (to) => `<!DOCTYPE html>
<html lang="en">
<meta charset="utf-8">
<title>Moved to bdate.app</title>
<link rel="canonical" href="${to}">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${to}">
<script>location.replace(${JSON.stringify(to)} + location.hash);</script>
<p>This page has moved to <a href="${to}">${to}</a>.</p>
</html>
`;

const write = (path, to) => {
  const file = join(out, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, page(to));
};

// Markdown pages, skipping Jekyll's own folders (_layouts, _data) and the clock.
const pages = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  if (e.name.startsWith("_") || e.name.startsWith(".") || e.name === "clock") return [];
  const path = join(dir, e.name);
  if (e.isDirectory()) return pages(path);
  return e.name.endsWith(".md") ? [relative(DOCS, path)] : [];
});

let count = 0;
for (const md of pages(DOCS)) {
  const html = md.replace(/\.md$/, ".html");
  const url = html.replace(/(^|\/)index\.html$/, "$1");
  write(html, `https://bdate.app/docs/${url}`);
  count++;
}
write("clock/index.html", "https://bdate.app/");
write("404.html", "https://bdate.app/docs/");
// Google Search Console ownership check for the github.io address.
copyFileSync(join(DOCS, "googleca204926ec3d65c5.html"), join(out, "googleca204926ec3d65c5.html"));
console.log(`write-redirects: ${count} docs pages, the clock and 404.html into ${out}`);
