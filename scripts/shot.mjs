/**
 * Headless screenshot helper — the substitute for a browser on this box.
 *
 * This VM is a headless EC2 instance and Claude in Chrome cannot reach it (the
 * extension bridges Chrome to a Claude Code process on the SAME machine; here
 * the browser is on the operator's laptop, at the far end of an SSH session).
 * So we drive our own browser instead: `npm i -D playwright` plus
 * `npx playwright install chromium` (and `webkit`, see below).
 *
 * Usage:
 *   node scripts/shot.mjs /stacks/performance-stack
 *   node scripts/shot.mjs / /about --widths 1440,390
 *   node scripts/shot.mjs /faq --full          # whole page, not just the fold
 *   node scripts/shot.mjs /faq --engine webkit # what an iPhone actually does
 *
 * A CHROMIUM CHECK IS NOT AN iOS CHECK, and this project has the scar to
 * prove it: the FAQ image measured perfectly here and was visibly stretched on
 * a real iPhone — `height: 75%` against an indefinite container, which WebKit
 * resolves and Chromium does not. It was reported as not reproducible on the
 * strength of a Chromium run, and that was wrong. Mobile is ~80% of this
 * site's traffic and Safari is most of it, so anything touching layout should
 * be run through `--engine webkit` before it is called verified.
 *
 * Output lands in .screenshots/ (gitignored), named {path}@{width}.png.
 *
 * Also prints the measured box of any element matching --measure, which is
 * usually what a layout question actually needs — "is .container capped at
 * 1488 and centred" is a number, not a vibe.
 */
import { chromium, webkit, firefox } from "playwright";
import { mkdir, rm } from "node:fs/promises";

const DEFAULT_WIDTHS = [1920, 1440, 768, 390];
const OUT = ".screenshots";

const argv = process.argv.slice(2);
const paths = argv.filter((a) => a.startsWith("/"));
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};

const widths = flag("widths", null)?.split(",").map(Number) ?? DEFAULT_WIDTHS;
if (widths.some((w) => !Number.isFinite(w) || w < 200 || w > 5000)) {
  console.error(`bad --widths: ${widths.join(",")} (need integers 200-5000)`);
  process.exit(1);
}
const base = flag("base", "https://atlasprotocol.com");
const measure = flag("measure", ".container, .sx-content, .sx-section");
const fullPage = argv.includes("--full");

const ENGINES = { chromium, webkit, firefox };
const engineName = flag("engine", "chromium");
const engine = ENGINES[engineName];
if (!engine) {
  console.error(`bad --engine: ${engineName} (chromium | webkit | firefox)`);
  process.exit(1);
}

if (!paths.length) {
  console.error("usage: node scripts/shot.mjs /path [/path...] [--widths 1440,390] [--full] [--measure SEL]");
  process.exit(1);
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const browser = await engine.launch();
let failures = 0;

try {
for (const path of paths) {
  for (const width of widths) {
    // A phone viewport is TALL, not letterboxed. width * 0.62 gives a sane
    // desktop window but a 242px-high phone, which shows only the header.
    const height = width < 500 ? 844 : Math.round(width * 0.62);
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
      isMobile: width < 500,
      hasTouch: width < 500,
    });

    const url = `${base}${path}`;
    try {
    // `networkidle` is the right signal but is at the mercy of admin-injected
    // tracking snippets (custom_head_scripts / custom_body_scripts), which may
    // hold a connection open forever. Fall back rather than lose the run.
    let res;
    try {
      res = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    } catch {
      console.log(`   (networkidle timed out — falling back to load)`);
      res = await page.goto(url, { waitUntil: "load", timeout: 30000 });
    }
    // Lazy-loaded imagery and Swiper need a beat before the layout settles.
    await page.waitForTimeout(600);

    const slug = path === "/" ? "home" : path.replace(/^\//, "").replace(/\//g, "-");
    // The engine goes in the filename for anything but the default, so a
    // webkit run sits BESIDE its chromium counterpart instead of overwriting
    // it — comparing the two is the entire point of having both.
    const suffix = engineName === "chromium" ? "" : `.${engineName}`;
    const file = `${OUT}/${slug}@${width}${suffix}.png`;
    await page.screenshot({ path: file, fullPage });

    const boxes = await page.evaluate((sel) => {
      // Collapse only rows identical in BOTH identity AND geometry. Deduping
      // by class alone hides the exact bug class this tool exists to catch:
      // same-class elements differ by context here ON PURPOSE. The header, the
      // topbar and each route's content column are all `.container`, and a
      // frame rule scoped to .site-main hits some and not others — dedupe by
      // class and the broken one is the row you silently drop.
      const seen = new Set();
      const out = [];
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (r.width === 0) continue;
        const row = {
          cls: el.className?.toString().trim() || el.tagName.toLowerCase(),
          w: Math.round(r.width),
          left: Math.round(r.left),
          right: Math.round(window.innerWidth - r.right),
        };
        const key = `${row.cls}|${row.w}|${row.left}|${row.right}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(row);
      }
      return out;
    }, measure);

    const status = res?.status() ?? 0;
    console.log(`\n${url}  @${width}  [${status}]  -> ${file}`);

    // A 404 still renders a perfectly good-looking page. Screenshotting the
    // not-found route and reporting its measurements as if they were the real
    // page is the same fail-quiet trap as deduping by class — call it out.
    if (status >= 400 || status === 0) {
      failures++;
      console.log(`   !! NON-OK STATUS ${status} — measurements below are NOT the page you asked for`);
    }

    // Zero matches must be loud. Silence is indistinguishable from "measured
    // and fine", and a selector goes stale exactly when the change under test
    // renames the class you were watching.
    if (!boxes.length) {
      console.log(`   (NO MATCHES for ${measure})`);
    }

    const CAP = 24;
    for (const b of boxes.slice(0, CAP)) {
      const cls = b.cls.length > 58 ? `${b.cls.slice(0, 55)}...` : b.cls;
      console.log(`   w=${String(b.w).padStart(5)}  gapL=${String(b.left).padStart(4)}  gapR=${String(b.right).padStart(4)}  ${cls}`);
    }
    if (boxes.length > CAP) {
      console.log(`   ... +${boxes.length - CAP} more rows — narrow --measure to see them`);
    }

    // A page must never scroll sideways; the frame relies on overflow-x: clip.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (overflow > 0) console.log(`   !! HORIZONTAL OVERFLOW: ${overflow}px`);

    } catch (err) {
      // One unreachable page must not cost the whole run — record it, keep going,
      // and exit non-zero at the end so this can't pass silently in CI.
      failures++;
      console.log(`\n${url}  @${width}  FAILED: ${err.message.split("\n")[0]}`);
    } finally {
      await page.close();
    }
  }
}

} finally {
  await browser.close();
}

console.log(`\nWrote screenshots to ${OUT}/`);
if (failures) {
  console.log(`${failures} page(s) FAILED — see above`);
  process.exit(1);
}
