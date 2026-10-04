/**
 * Computed-style probe — the companion to shot.mjs.
 *
 * shot.mjs answers "how wide is this box"; this answers "what did the cascade
 * actually decide for this property". Those are different questions, and the
 * knob bugs found on /test-page were all the second kind: the class was on the
 * element and the rule existed, but something later in the cascade won.
 *
 * Usage:
 *   node scripts/probe.mjs /test-page --base http://127.0.0.1:3000 \
 *     --width 2560 --sel ".sx-pad--sm,.sx-pad--md" --props padding-top,color
 *
 * Prints one row per match: the element's own classes, then each property as
 * the browser computed it.
 */
import { chromium } from "playwright";

const argv = process.argv.slice(2);
const paths = argv.filter((a) => a.startsWith("/"));
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);

  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const base = flag("base", "http://127.0.0.1:3000");
const width = Number(flag("width", "1440"));
const sel = flag("sel", "[class*='sx-']");
const props = flag("props", "padding-top,padding-bottom,color,background-color").split(",");

if (!paths.length) {
  console.error("usage: node scripts/probe.mjs /path [--base URL] [--width N] [--sel SEL] [--props a,b]");
  process.exit(1);
}

const browser = await chromium.launch();

for (const path of paths) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  const res = await page.goto(`${base}${path}`, { waitUntil: "networkidle" });

  console.log(`\n${base}${path}  @${width}  [${res?.status()}]`);

  const rows = await page.evaluate(
    ([sel, props]) =>
      [...document.querySelectorAll(sel)].map((el) => {
        const cs = getComputedStyle(el);

        return {
          cls: el.className?.toString().slice(0, 60),
          text: (el.textContent || "").trim().slice(0, 34),
          vals: props.map((p) => `${p}=${cs.getPropertyValue(p).trim()}`),
        };
      }),
    [sel, props]
  );

  if (!rows.length) {
    console.log(`   (NO MATCHES for ${sel})`);
  }

  for (const r of rows) {
    console.log(`   ${r.cls}\n      ${r.vals.join("  ")}\n      "${r.text}"`);
  }

  await page.close();
}

await browser.close();
