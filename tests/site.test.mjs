import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("application shell references only local runtime assets", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  assert.match(html, /<link rel="manifest" href="\.\/manifest\.webmanifest">/);
  assert.match(html, /<script type="module" src="\.\/app\.js"><\/script>/);
  assert.doesNotMatch(html, /https?:\/\/[^"']+\.(?:js|css|woff2?)/i);
});

test("privacy and browser reliability limits are visible in the shell", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  assert.match(html, /No account\. No camera\. No analytics\./);
  assert.match(html, /Keep this tab open/);
});

test("quick moments cover the core break choices", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  for (const quickMoment of [
    "eyes",
    "stand",
    "walk",
    "water",
    "exercise",
    "coffee",
  ]) {
    assert.match(html, new RegExp(`data-quick="${quickMoment}"`));
  }
});

test("service worker precaches every runtime module", async () => {
  const worker = await readFile(new URL("sw.js", root), "utf8");
  for (const asset of [
    "index.html",
    "styles.css",
    "app.js",
    "content.js",
    "scheduler.js",
  ]) {
    assert.match(worker, new RegExp(asset.replace(".", "\\.")));
  }
});
