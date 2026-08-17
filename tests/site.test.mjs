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

test("the timer stays static while the reminder overlay can move", async () => {
  const [html, css, app] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
  ]);

  assert.match(
    html,
    /<div class="reminder-ambient" aria-hidden="true"><\/div>/,
  );
  assert.doesNotMatch(html, /class="timer-ambient"/);
  assert.equal(
    html.match(/class="time-instrument"/g)?.length,
    1,
    "the timer actions must not become nested inside a duplicate clock wrapper",
  );
  assert.doesNotMatch(html, /class="progress-ring"/);
  assert.doesNotMatch(app, /progressRing/);
  assert.match(css, /@keyframes reminder-overlay-breathe/);
  assert.match(css, /reminder-overlay-breathe 7s/);
  assert.match(css, /reminder-overlay-drift 10s/);
  assert.match(css, /translate3d\(-8%, 7%, 0\)/);
  assert.match(css, /translate3d\(9%, -8%, 0\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.reminder-ambient::before,\s*\.reminder-ambient::after \{\s*animation: none !important;/);
  assert.match(
    app,
    /state\.settings\.reminderMotionEnabled && currentPrompt && !activeBreak/,
  );
  assert.match(app, /document\.body\.dataset\.pageVisibility/);
});

test("signals, volume, and reminder motion have calm defaults", async () => {
  const [html, app, css] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
  ]);

  assert.match(html, /Start with notifications and chime/);
  assert.match(
    html,
    /id="notificationsEnabled" type="checkbox" checked/,
  );
  assert.match(html, /id="soundEnabled" type="checkbox" checked/);
  assert.match(
    html,
    /id="chimeVolume"[\s\S]*type="range"[\s\S]*min="0"[\s\S]*max="100"[\s\S]*value="75"/,
  );
  assert.match(
    html,
    /id="reminderMotionEnabled" type="checkbox" checked/,
  );
  assert.match(app, /notificationsEnabled: true/);
  assert.match(app, /soundEnabled: true/);
  assert.match(app, /chimeVolume: DEFAULT_CHIME_VOLUME/);
  assert.match(app, /reminderMotionEnabled: true/);
  assert.match(
    app,
    /typeof sourceSettings\.notificationsEnabled === "boolean"[\s\S]*fallback\.settings\.notificationsEnabled/,
  );
  assert.match(app, /!state\.settings\.notificationsEnabled \|\|/);
  assert.match(
    app,
    /sourceSettings\.chimeVolume,\s*0,\s*1,\s*fallback\.settings\.chimeVolume/,
  );
  assert.match(
    app,
    /typeof sourceSettings\.reminderMotionEnabled === "boolean"[\s\S]*typeof sourceSettings\.ambientMotionEnabled === "boolean"/,
  );
  assert.match(
    app,
    /const peakGain = CHIME_GAIN_AT_FULL_VOLUME \* chimeVolume/,
  );
  assert.match(
    css,
    /\.break-dialog\[data-motion="animated"\] \.reminder-ambient::before/,
  );
  assert.match(
    css,
    /\.break-dialog\[data-motion="static"\]\[open\] \{\s*animation: none;/,
  );
  assert.match(
    app,
    /if \(!state\.runtime\.running\) \{\s*void startRhythmWithSignals\(\);/,
  );
  assert.match(
    app,
    /if \(state\.settings\.soundEnabled\) \{\s*void playChime\(true\);/,
  );
  assert.match(
    app,
    /function startQuietly\(\) \{\s*state\.settings\.notificationsEnabled = false;\s*state\.settings\.soundEnabled = false;\s*startRhythm\(\);/,
  );
});

test("four soothing color themes are selectable and persisted", async () => {
  const [html, app, css] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
  ]);

  for (const theme of ["forest", "sea-glass", "heather", "warm-sand"]) {
    assert.match(
      html,
      new RegExp(`name="colorTheme" value="${theme}"`),
    );
  }
  assert.match(html, />Sea Glass</);
  assert.match(html, />Heather</);
  assert.match(html, />Warm Sand</);
  assert.match(app, /colorTheme: "forest"/);
  assert.match(app, /COLOR_THEME_IDS\.includes\(sourceSettings\.colorTheme\)/);
  assert.match(
    app,
    /document\.documentElement\.dataset\.theme = state\.settings\.colorTheme/,
  );
  for (const theme of ["sea-glass", "heather", "warm-sand"]) {
    assert.match(css, new RegExp(`:root\\[data-theme="${theme}"\\]`));
  }
});

test("typography keeps serif limited to two signature titles", async () => {
  const css = await readFile(new URL("styles.css", root), "utf8");

  assert.match(css, /--display: ui-serif, Georgia, serif/);
  assert.match(
    css,
    /--ui: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif/,
  );
  assert.match(
    css,
    /h1,\s*h2,\s*h3 \{\s*font-family: var\(--ui\);/,
  );
  assert.match(
    css,
    /\.timer-heading h1 \{[\s\S]*font-family: var\(--display\);/,
  );
  assert.match(
    css,
    /\.break-copy h2 \{[\s\S]*font-family: var\(--display\);/,
  );
  assert.equal(
    css.match(/font-family: var\(--display\);/g)?.length,
    2,
  );
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

test("the full break library exposes restorative and movement filters", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  assert.match(html, />Break library<\/h2>/);
  assert.match(html, /Your four signals keep their rhythm/);
  for (const filter of ["eyes", "restore", "seated", "standing"]) {
    assert.match(html, new RegExp(`data-library-filter="${filter}"`));
  }
  assert.match(html, /Simple resistance activity trial/);
  assert.match(html, /Brief structured respiration trial/);
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
