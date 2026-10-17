// Checks the clock in docs/clock the way Vercel serves it: the app files
// (manifest, icons, service worker) and a smoke test in headless Chromium.
//
//   npm ci && npx playwright install chromium && npm test
//
// CHROMIUM_PATH points Playwright at an already installed Chromium.

import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname, "../..");
let failures = 0;

const TIMEOUT = 20000;

async function check(name, fn) {
  let timer;
  try {
    // A broken service worker never becomes ready, so every check is time-boxed.
    await Promise.race([
      fn(),
      new Promise((_, fail) => { timer = setTimeout(() => fail(new Error(`timed out after ${TIMEOUT / 1000}s`)), TIMEOUT); }),
    ]);
    console.log(`ok   ${name}`);
  } catch (err) {
    failures++;
    console.log(`FAIL ${name}\n     ${err.message.split("\n").join("\n     ")}`);
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------- build

// Same as vercel.json's buildCommand: docs/clock plus a copy of bdate.js.
const site = mkdtempSync(join(tmpdir(), "bclock-"));
cpSync(join(ROOT, "docs/clock"), site, { recursive: true });
cpSync(join(ROOT, "js/src/bdate.js"), join(site, "bdate.js"));

const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml",
};
const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path.endsWith("/")) path += "index.html";
  const file = join(site, path);
  if (!file.startsWith(site) || !existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const BASE = `http://127.0.0.1:${server.address().port}/`;

// ---------------------------------------------------------------- app files

const pngSize = (file) => {
  const b = readFileSync(file);
  assert.equal(b.toString("ascii", 1, 4), "PNG", `${file} is not a PNG`);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};

await check("vercel.json builds and serves docs/clock", () => {
  const v = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8"));
  assert.equal(v.outputDirectory, "docs/clock");
  assert.match(v.buildCommand, /js\/src\/bdate\.js docs\/clock\/bdate\.js/);
});

await check("manifest has what browsers need to install the app", () => {
  const m = JSON.parse(readFileSync(join(site, "manifest.webmanifest"), "utf8"));
  for (const key of ["name", "short_name", "start_url", "display", "icons"]) assert.ok(m[key], `missing ${key}`);
  const sizes = new Set();
  for (const icon of m.icons) {
    const file = join(site, icon.src);
    assert.ok(existsSync(file), `missing icon ${icon.src}`);
    if (icon.type === "image/png") {
      const [w, h] = pngSize(file);
      assert.equal(`${w}x${h}`, icon.sizes, `${icon.src} is ${w}x${h}, manifest says ${icon.sizes}`);
      sizes.add(icon.sizes);
    }
  }
  for (const s of ["192x192", "512x512"]) assert.ok(sizes.has(s), `no ${s} PNG icon`);
  assert.ok(m.icons.some((i) => i.purpose === "maskable"), "no maskable icon");
});

await check("files linked from the page and cached by sw.js exist", () => {
  const html = readFileSync(join(site, "index.html"), "utf8");
  const linked = [...html.matchAll(/<link[^>]+href="([^"]+)"/g)].map((m) => m[1]).filter((h) => !/^https?:/.test(h));
  const core = JSON.parse(readFileSync(join(site, "sw.js"), "utf8").match(/const CORE = (\[[^\]]*\])/)[1]);
  for (const path of [...linked, ...core]) {
    if (path === "./") continue;
    assert.ok(existsSync(join(site, path)), `missing ${path}`);
  }
});

await check("search and social tags point to bdate.app", () => {
  const html = readFileSync(join(site, "index.html"), "utf8");
  const meta = (attr, name) => html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`))?.[1];
  const ORIGIN = "https://bdate.app/";
  assert.equal(html.match(/<link rel="canonical" href="([^"]+)"/)?.[1], ORIGIN, "canonical link");
  assert.equal(meta("property", "og:url"), ORIGIN, "og:url");
  for (const [attr, name] of [["name", "description"], ["property", "og:title"], ["property", "og:description"], ["name", "twitter:card"]]) {
    assert.ok(meta(attr, name), `missing ${name}`);
  }
  const image = meta("property", "og:image");
  assert.ok(image?.startsWith(ORIGIN), `og:image should be under ${ORIGIN}`);
  const [w, h] = pngSize(join(site, image.slice(ORIGIN.length)));
  assert.equal(`${w}x${h}`, `${meta("property", "og:image:width")}x${meta("property", "og:image:height")}`, "og:image size");
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(ld.url, ORIGIN, "structured data url");
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, "exactly one h1");
  const robots = readFileSync(join(site, "robots.txt"), "utf8");
  const sitemap = robots.match(/^Sitemap: (\S+)/m)?.[1];
  assert.equal(sitemap, `${ORIGIN}sitemap.xml`, "robots.txt sitemap");
  assert.match(readFileSync(join(site, "sitemap.xml"), "utf8"), new RegExp(`<loc>${ORIGIN}</loc>`));
});

// ---------------------------------------------------------------- browser

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errors = [];
const watch = (page) => page.on("pageerror", (e) => errors.push(e.message));
const fonts = (route) => route.abort(); // keep the test offline-safe

await check("clock renders its readout", async () => {
  const page = await browser.newPage();
  watch(page);
  await page.route(/fonts\.(googleapis|gstatic)\.com/, fonts);
  await page.goto(`${BASE}?place=athens`);
  assert.match(await page.textContent("#r-hour"), /hour of the (day|night)|no seasonal hours/);
  assert.match(await page.textContent("#r-meta"), /^Athens · Julian \d{4}-\d\d-\d\d/);
  assert.ok((await page.$$("#wedges path")).length >= 24, "dial has no hour wedges");
  await page.close();
});

await check("footer shows the version from version.json, and leaves it out without one", async () => {
  const sha = "0123456789abcdef0123456789abcdef01234567";
  writeFileSync(join(site, "version.json"), JSON.stringify({
    commit: sha, shortCommit: sha.slice(0, 7), commitUrl: `https://github.com/thekyria/bdate/commit/${sha}`, environment: "preview",
  }));
  const page = await browser.newPage();
  watch(page);
  await page.route(/fonts\.(googleapis|gstatic)\.com/, fonts);
  await page.goto(BASE);
  await page.waitForSelector("#version:not([hidden])");
  assert.equal(await page.textContent("#version"), "Version 0123456 (preview)");
  assert.equal(await page.getAttribute("#version a", "href"), `https://github.com/thekyria/bdate/commit/${sha}`);
  assert.ok(await page.isVisible(".version-sep"), "separator hidden");

  rmSync(join(site, "version.json"));
  await page.reload();
  await page.waitForLoadState("networkidle");
  assert.ok(!(await page.isVisible("#version")), "version shown without version.json");
  assert.ok(!(await page.isVisible(".version-sep")), "separator shown without version.json");
  await page.close();
});

await check("installable: manifest parses and the service worker takes over", async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  watch(page);
  await page.route(/fonts\.(googleapis|gstatic)\.com/, fonts);
  await page.goto(BASE);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  assert.ok(await page.evaluate(() => !!navigator.serviceWorker.controller), "page not controlled by sw.js");
  const cdp = await ctx.newCDPSession(page);
  const manifest = await cdp.send("Page.getAppManifest");
  assert.deepEqual(manifest.errors, [], "manifest errors");
  const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors");
  // Test browser contexts are incognito, which Chromium reports on its own.
  const blocking = installabilityErrors.filter((e) => e.errorId !== "in-incognito");
  assert.deepEqual(blocking, [], "installability errors");

  await ctx.setOffline(true);
  await page.goto(`${BASE}?place=rome`);
  assert.match(await page.textContent("#r-meta"), /^Rome/, "offline reload did not render");
  await ctx.close();
});

await check("last place is remembered; a place in the URL wins", async () => {
  const page = await browser.newPage();
  watch(page);
  await page.route(/fonts\.(googleapis|gstatic)\.com/, fonts);
  await page.goto(BASE);
  await page.selectOption("#place", "ravenna");
  await page.goto(BASE);
  assert.match(await page.textContent("#r-meta"), /^Ravenna/);
  await page.goto(`${BASE}?place=rome`);
  assert.match(await page.textContent("#r-meta"), /^Rome/);
  await page.close();
});

await check("menu opens and closes; embed code follows the place", async () => {
  const page = await browser.newPage();
  watch(page);
  await page.route(/fonts\.(googleapis|gstatic)\.com/, fonts);
  await page.goto(`${BASE}?place=jerusalem`);
  assert.ok(!(await page.isVisible("#menu")), "menu open on load");
  await page.click("#menu-toggle");
  assert.ok(await page.isVisible("#menu"), "menu did not open");
  assert.match(await page.textContent("#embed-code"), /compact=1&place=jerusalem/);
  await page.keyboard.press("Escape");
  assert.ok(!(await page.isVisible("#menu")), "Escape did not close the menu");
  await page.close();
});

await check("compact mode shows the dial alone", async () => {
  const page = await browser.newPage({ viewport: { width: 320, height: 320 } });
  watch(page);
  await page.route(/fonts\.(googleapis|gstatic)\.com/, fonts);
  await page.goto(`${BASE}?compact=1`);
  assert.ok(await page.isVisible("#dial"));
  for (const sel of ["#menu-toggle", ".site-footer", ".controls"]) {
    assert.ok(!(await page.isVisible(sel)), `${sel} visible in compact mode`);
  }
  await page.close();
});

await check("no horizontal scroll at phone width", async () => {
  const page = await browser.newPage({ viewport: { width: 360, height: 740 } });
  watch(page);
  await page.route(/fonts\.(googleapis|gstatic)\.com/, fonts);
  await page.goto(BASE);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.close();
});

await check("no script errors", () => assert.deepEqual(errors, []));

await browser.close();
server.close();
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
