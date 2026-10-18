import { getConfig } from "@/lib/api";
import { contrastRatio } from "@/lib/color";
import CtaLink from "@/components/bch/CtaLink";
import SideNote from "@/components/bch/SideNote";

export const metadata = {
  title: "Style tile",
  robots: { index: false, follow: false },
};

// Brand files beyond the two logos /config carries. Shown so the client can
// approve every lockup in one place.
const EXTRA_MARKS = [
  { src: "/brand/bch-logo-horizontal.svg", label: "Horizontal", dark: false },
  { src: "/brand/bch-logo-horizontal-dark.svg", label: "Horizontal, reversed", dark: true },
  { src: "/brand/bch-submark.svg", label: "Submark", dark: false },
];

const MASKS = [
  { className: "organic", label: "Organic edge", image: "/images/bch/cellular-detail.webp" },
  { className: "arch", label: "Arch", image: "/images/bch/shop-vanity.webp" },
  { className: "corner", label: "Soft corner", image: "/images/bch/care-two-women.webp" },
];

function Ratio({ fg, bg }) {
  const value = contrastRatio(fg, bg);
  if (value === null) {
    return null;
  }
  // AA: 4.5 for body text, 3 for large text (24px, or 18.66px bold).
  const grade = value >= 4.5 ? "AA" : value >= 3 ? "Large only" : "Decorative";

  return (
    <span className={`bch-tile__ratio bch-tile__ratio--${grade === "AA" ? "pass" : "warn"}`}>
      {value.toFixed(1)}:1 {grade}
    </span>
  );
}

/**
 * Style tile: the brand system on one page for client sign-off before any
 * section seeding. Palette, fonts and logos come from /config, so the tile
 * always shows what the install is actually serving.
 */
export default async function StyleTilePage() {
  const config = await getConfig();
  const brand = config?.brand ?? {};
  const theme = config?.theme ?? {};
  const palette = theme.palette ?? [];

  return (
    <div className="bch-tile">
      <div className="bch-container">
        <div className="bch-tile__intro">
          <span className="bch-eyebrow">Style tile · draft for review</span>
          <h1 className="bch-display bch-display--lg">
            {brand.name} <em>visual system</em>
          </h1>
          <p className="bch-lead">
            Colours, type, buttons and image shapes used across the homepage proof. Ratios are WCAG
            contrast against white and against charcoal.
          </p>
        </div>

        <section className="bch-tile__block" aria-labelledby="tile-logo">
          <h2 id="tile-logo" className="bch-eyebrow">Logo</h2>
          <div className="bch-tile__logos">
            {brand.logo_url ? (
              <figure className="bch-tile__logo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={brand.logo_url} alt="" />
                <figcaption>Primary circle</figcaption>
              </figure>
            ) : null}
            {brand.logo_light_url ? (
              <figure className="bch-tile__logo bch-tile__logo--dark">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={brand.logo_light_url} alt="" />
                <figcaption>Circle, reversed</figcaption>
              </figure>
            ) : null}
            {EXTRA_MARKS.map((mark) => (
              <figure key={mark.src} className={`bch-tile__logo bch-tile__logo--wide${mark.dark ? " bch-tile__logo--dark" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mark.src} alt="" />
                <figcaption>{mark.label}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="bch-tile__block" aria-labelledby="tile-colour">
          <h2 id="tile-colour" className="bch-eyebrow">Colour</h2>
          <ul className="bch-tile__swatches">
            {palette.map((entry) => (
              <li key={entry.name} className="bch-tile__swatch">
                <span className="bch-tile__chip" style={{ background: entry.color }} />
                <strong>{entry.name}</strong>
                <code>{entry.color.toUpperCase()}</code>
                <span className="bch-tile__ratios">
                  <span>on white <Ratio fg={entry.color} bg="#ffffff" /></span>
                  <span>on charcoal <Ratio fg={entry.color} bg="#282828" /></span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bch-tile__block" aria-labelledby="tile-type">
          <h2 id="tile-type" className="bch-eyebrow">Type</h2>
          <div className="bch-tile__type">
            <p className="bch-tile__font">
              Display: <strong>{theme.font_display}</strong> · Body: <strong>{theme.font_body}</strong>
            </p>
            <p className="bch-display bch-display--xl">
              Doing everything right, but still not feeling <em>like yourself?</em>
            </p>
            <p className="bch-display bch-display--lg">
              Your body didn&apos;t stop responding. <em>The rules changed.</em>
            </p>
            <p className="bch-display bch-display--md">
              Choose the next step <em>that fits you.</em>
            </p>
            <p className="bch-display bch-display--sm">Why your body feels different in midlife</p>
            <span className="bch-eyebrow">Eyebrow · Women&apos;s midlife telehealth + wellness</span>
            <p className="bch-lead">
              Lead. Bell Curve Health brings licensed telehealth care, personalized midlife guidance,
              and a curated wellness shop together in one modern place.
            </p>
            <p className="bch-tile__body">
              Body. Hormones, metabolism, sleep and stress can shift in midlife. Understanding what
              changed is the first step forward.
            </p>
            <SideNote value={"Real science.\nClearer answers."} />
          </div>
        </section>

        <section className="bch-tile__block" aria-labelledby="tile-buttons">
          <h2 id="tile-buttons" className="bch-eyebrow">Buttons and links</h2>
          <div className="bch-tile__buttons">
            <CtaLink label="Explore telehealth care" url="#" />
            <CtaLink label="Shop wellness" url="#" variant="outline" arrow={false} />
            <CtaLink label="See what may be changing" url="#" variant="link" />
            <span className="bch-circle-arrow" aria-hidden="true">→</span>
          </div>
          <div className="bch-tile__buttons bch-tile__buttons--dark">
            <CtaLink label="Explore membership" url="#" variant="light" />
            <CtaLink label="Start here" url="#" />
          </div>
        </section>

        <section className="bch-tile__block" aria-labelledby="tile-shapes">
          <h2 id="tile-shapes" className="bch-eyebrow">Image shapes</h2>
          <div className="bch-tile__masks">
            {MASKS.map((mask) => (
              <figure key={mask.className} className={`bch-tile__mask bch-tile__mask--${mask.className}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mask.image} alt="" loading="lazy" />
                <figcaption>{mask.label}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
