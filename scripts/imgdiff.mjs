// Pixel-diff two PNGs.
//
//   node scripts/imgdiff.mjs before.png after.png
//
// The companion to shot.mjs: that one measures elements, this one answers
// "did anything else move?". A layout change is only safe if the pixels
// OUTSIDE the thing you changed are identical, and eyeballing two 7,000px
// screenshots does not establish that — the sub-blocks rework looked correct
// by eye while the hero had silently grown 40px on each side.
//
// Reports the differing-pixel count, the row range it spans, and the worst
// rows, so a diff confined to one band reads as such.
//
// Uses the Chromium playwright already installs for shot.mjs to decode and
// compare, rather than pulling in an image library for a two-file compare.
// .screenshots/ is WIPED at the start of every shot.mjs run, so copy a
// baseline somewhere else before rebuilding.
import { chromium } from "playwright";
import fs from "fs";
const [, , A, B] = process.argv;
const url = (f) =>
  "data:image/png;base64," + fs.readFileSync(f).toString("base64");
const b = await chromium.launch();
const p = await b.newPage();
const out = await p.evaluate(
  async ([a, c]) => {
    const load = (src) =>
      new Promise((res) => {
        const i = new Image();
        i.onload = () => res(i);
        i.src = src;
      });
    const [ia, ib] = await Promise.all([load(a), load(c)]);
    const w = Math.min(ia.width, ib.width),
      h = Math.min(ia.height, ib.height);
    const g = (img) => {
      const cv = document.createElement("canvas");
      cv.width = w;
      cv.height = h;
      const x = cv.getContext("2d");
      x.drawImage(img, 0, 0);
      return x.getImageData(0, 0, w, h).data;
    };
    const da = g(ia),
      db = g(ib);
    let diff = 0,
      first = -1,
      last = -1;
    const rows = [];
    for (let y = 0; y < h; y++) {
      let rd = 0;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (
          Math.abs(da[i] - db[i]) > 8 ||
          Math.abs(da[i + 1] - db[i + 1]) > 8 ||
          Math.abs(da[i + 2] - db[i + 2]) > 8
        )
          rd++;
      }
      if (rd > 0) {
        if (first < 0) first = y;
        last = y;
        diff += rd;
        rows.push([y, rd]);
      }
    }
    return {
      sizeA: [ia.width, ia.height],
      sizeB: [ib.width, ib.height],
      compared: [w, h],
      diff,
      pct: ((100 * diff) / (w * h)).toFixed(3),
      first,
      last,
      worst: rows.sort((p, q) => q[1] - p[1]).slice(0, 8),
    };
  },
  [url(A), url(B)],
);
console.log(JSON.stringify(out, null, 2));
await b.close();
