#!/usr/bin/env node
/*
 * Renders scripts/og-image.html to images/og-image.png at 1200x630.
 *
 *   npx -p playwright node scripts/render-og-image.js
 *
 * Playwright is deliberately not a dependency in package.json: the host runs
 * npm install on every deploy, and pulling a browser in for an image that
 * changes a few times a year would slow every build for nothing.
 *
 * Serves the repo root over a throwaway local server so the template's
 * root-absolute font and image paths resolve exactly as they do on the site,
 * and waits for the fonts before capturing — otherwise the card can be shot in
 * a fallback face.
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "images", "og-image.png");
const TYPES = {
  ".html": "text/html",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
  );
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    await page.goto(`http://localhost:${port}/scripts/og-image.html`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    const loaded = await page.evaluate(() =>
      [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family)
    );
    for (const family of ["Inter", "Raleway"]) {
      if (!loaded.includes(family)) throw new Error(`${family} did not load — refusing to render with a fallback`);
    }

    await page.locator(".card").screenshot({ path: OUT });
    console.log(`wrote ${path.relative(ROOT, OUT)}`);
  } finally {
    await browser.close();
    server.close();
  }
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
