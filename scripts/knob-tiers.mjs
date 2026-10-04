/**
 * The responsive-knob falsifier, as an executable.
 *
 * The fourth tool beside shot.mjs (how big is this box), probe.mjs (what did
 * the cascade decide) and imgdiff.mjs (did anything else move). Those three
 * read the page as it is; this one asserts what the CASCADE does across
 * breakpoints, which is the thing per-breakpoint knobs can silently get wrong.
 *
 * Why it INJECTS markup rather than reading a /test-page band: it has to cover
 * combinations the bench cannot hold at once — a base value with no override, an
 * override with NO base class, and flush against a width cap. Those are the
 * three shapes that fail silently, and none of them looks wrong in the SCSS.
 *
 *   node scripts/knob-tiers.mjs        # needs the server on :3000
 *
 * The two claims it exists to falsify:
 *
 *   1. ORDER. A media query adds no specificity, so every tier setter is
 *      (0,1,0) exactly like its base. If the base is emitted after the tiers,
 *      it wins at every width and the override is dead. Compiled CSS reads
 *      fine either way — this is the only cheap way to tell.
 *   2. THE MARKER. A section may set ONLY a tablet override, carrying no base
 *      class at all. A consumer rule guarded on the list of base classes would
 *      then match nothing. Case 2 below is that exact payload.
 *
 * A failure here means the emission design is wrong, not that a value needs
 * nudging. Read _layout-frame.scss's ordering notes before changing anything.
 */
import { chromium } from "playwright";

const base = "http://127.0.0.1:3000";
const browser = await chromium.launch();
const page = await browser.newPage();

const CASES = [
  { name: "align: base=left, md=center", cls: "sx-align sx-align--left sx-align-md--center",
    read: "text-align", inner: true, expect: { 390: "left", 768: "center", 1200: "center" } },
  { name: "align: md ONLY (no base class)", cls: "sx-align sx-align-md--center",
    read: "text-align", inner: true, expect: { 390: "start", 1200: "center" } },
  { name: "inset: flush on phone, md from tablet", cls: "sx-inset sx-inset--flush sx-inset-md--md",
    read: "margin-left", inner: true, expect: { 390: "-16px", 1200: null } },
  // The ordering trap: .sx-width--* sets `margin-inline: auto` at the SAME
  // (0,2,0) specificity, so if the inset consumer were emitted above the width
  // block, auto would win and flush would silently do nothing on any section
  // that also has a width cap. Gutter is clamp(24px, 4.5vw, 64px) above md, so
  // 1200 -> 54px and 1440 -> 64px (the ceiling engages at 1422).
  { name: "inset flush + a width cap (the ordering trap)", cls: "sx-inset sx-inset--flush sx-width--medium",
    read: "margin-left", inner: true, expect: { 390: "-16px", 1200: "-54px", 1440: "-64px" } },
  { name: "padding: top only, bottom untouched", cls: "sx-pad-top sx-pad-top--lg",
    read: "padding-top,padding-bottom", inner: false, expect: { 1200: "80px|0px" } },
  { name: "padding: top base=lg, md=sm", cls: "sx-pad-top sx-pad-top--lg sx-pad-top-md--sm",
    read: "padding-top", inner: false, expect: { 390: "80px", 1200: "24px" } },
];

let fails = 0;
for (const c of CASES) {
  const widths = Object.keys(c.expect).map(Number);
  const got = {};
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto(`${base}/test-page`, { waitUntil: "domcontentloaded" });
    got[w] = await page.evaluate(({ cls, read, inner }) => {
      const main = document.querySelector(".site-main");
      const wrap = document.createElement("div");
      wrap.className = cls;
      wrap.innerHTML = '<section class="sx-section"><div class="sx-content">x</div></section>';
      main.appendChild(wrap);
      const el = inner ? wrap.querySelector(".sx-content") : wrap;
      const cs = getComputedStyle(el);
      const out = read.split(",").map((p) => cs.getPropertyValue(p)).join("|");
      wrap.remove();
      return out;
    }, { cls: c.cls, read: c.read, inner: c.inner });
  }
  const lines = widths.map((w) => {
    const want = c.expect[w];
    const ok = want === null ? true : got[w] === want;
    if (!ok) fails++;
    return `    ${w}px -> ${got[w]}${want === null ? "  (informational)" : ok ? "  OK" : `  EXPECTED ${want}  <-- FAIL`}`;
  });
  console.log(`  ${c.name}\n${lines.join("\n")}`);
}
console.log(fails === 0 ? "\nALL TIER ASSERTIONS PASS" : `\n${fails} FAILED`);
await browser.close();
