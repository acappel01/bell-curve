/**
 * End-to-end smoke check for the intake quiz.
 *
 * Walks all nine authored steps in a real browser, exercising the three things
 * unit tests cannot see: that a conditional question APPEARS when its
 * condition is met, that an exclusive option clears the others, and that the
 * whole thing submits to a lead and redirects to the plan page.
 *
 * It CREATES A REAL LEAD in whatever database the app points at. On this box
 * that is production — delete the row afterwards:
 *   App\Models\Lead::where('email', 'andrew.test@example.com')->forceDelete();
 *
 * Usage (from the repo root, so `playwright` resolves):
 *   node scripts/quiz-flow-check.mjs
 *
 * Assumes 127.0.0.1:3000, not the public origin — the apex points off-box.
 */
import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 900 } });
const errs = [];
p.on("console", m => m.type() === "error" && errs.push(m.text()));
p.on("pageerror", e => errs.push(String(e)));
await p.goto("http://127.0.0.1:3000/quiz", { waitUntil: "networkidle" });

const stepName = async () => (await p.$$eval('.quiz-wizard__step[data-state="current"] .quiz-wizard__step-label', n => n.map(x=>x.textContent))).join("");
const cont = async () => {
  const btn = await p.$('button.btn-fill');
  const label = (await btn.textContent()).trim();
  await btn.click();
  await p.waitForTimeout(350);
  return label;
};

console.log("steps shown:", await p.$$eval('.quiz-wizard__step-label', n=>n.map(x=>x.textContent)));

// 1 about you
await p.click('label[data-sex="female"]');
await p.evaluate(() => { const el=document.querySelector('.quiz-age__native'); const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; s.call(el,'46'); el.dispatchEvent(new Event('change',{bubbles:true})); });
console.log("step1:", await stepName(), "->", await cont());

// 2 goals — pick weight management to trigger the conditional
const goalLabels = await p.$$('.quiz-options__card');
console.log("goals offered:", await p.$$eval('.quiz-options__label', n=>n.map(x=>x.textContent)));
await goalLabels[0].click();
console.log("step2:", await stepName(), "->", await cont());

// 3 experience
await (await p.$$('.quiz-options__card'))[0].click();
console.log("step3:", await stepName(), "->", await cont());

// 4 today — height/weight/goal_weight (conditional)
const measures = await p.$$('.quiz-measure');
console.log("measurement controls on step 4:", measures.length, "(3 = the conditional target weight appeared)");
console.log("values:", await p.$$eval('.quiz-measure__value', n=>n.map(x=>x.textContent.trim())));
console.log("step4:", await stepName(), "->", await cont());

// 5 flags — exercise the exclusive option
const cards = await p.$$('.quiz-options__card');
await cards[0].click(); await cards[1].click();
console.log("after two picks:", await p.$$eval('.quiz-options__input', n=>n.filter(x=>x.checked).length));
await cards[cards.length-1].click();  // "None of these"
console.log("after picking None:", await p.$$eval('.quiz-options__input', n=>n.filter(x=>x.checked).length), "(1 = exclusive cleared the rest)");
console.log("step5:", await stepName(), "->", await cont());

// 6 medications, 7 routine
await (await p.$$('.quiz-options__card'))[0].click();
console.log("step6:", await stepName(), "->", await cont());
await (await p.$$('.quiz-options__card'))[0].click();
console.log("step7:", await stepName(), "->", await cont());

// 8 where to start — check price ranges rendered
console.log("start options:", await p.$$eval('.quiz-options__label', n=>n.map(x=>x.textContent)));
console.log("prices:", await p.$$eval('.quiz-options__price', n=>n.map(x=>x.textContent)));
await (await p.$$('.quiz-options__card'))[0].click();
await p.screenshot({ path: ".screenshots/quiz-start@390.png" });
console.log("step8:", await stepName(), "->", await cont());

// 9 contact
console.log("step9:", await stepName());
await p.fill('#quiz-name', 'Andrew Cappello');
await p.fill('#quiz-email', 'andrew.test@example.com');
await p.fill('#quiz-phone', '5551234567');
await p.screenshot({ path: ".screenshots/quiz-contact@390.png" });
const label = (await p.$('button.btn-fill').then(b=>b.textContent())).trim();
console.log("final CTA:", label);
await p.click('button.btn-fill');
await p.waitForURL(/\/plan\//, { timeout: 15000 });
console.log("redirected to:", new URL(p.url()).pathname);
console.log("plan heading:", (await p.textContent('.quiz-plan__title')).trim());
console.log("plan lede:", (await p.textContent('.quiz-plan__lede'))?.trim());
await p.screenshot({ path: ".screenshots/quiz-plan@390.png", fullPage: false });
console.log("console errors:", errs.length ? errs : "none");
await b.close();
