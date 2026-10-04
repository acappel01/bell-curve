import { getConfig, getLayout } from "@/lib/api";
import { menuLinkHref } from "@/lib/routes";
import Header from "@/components/chrome/Header";
import Footer from "@/components/chrome/Footer";
import SectionRenderer from "@/components/SectionRenderer";
import MobileMenu from "@/components/chrome/MobileMenu";
import BootstrapClient from "@/components/chrome/BootstrapClient";
import CartProvider from "@/components/cart/CartProvider";
import CartDrawer from "@/components/cart/CartDrawer";

/**
 * Black or white, whichever is readable on `color`. Null when the value cannot
 * be parsed.
 *
 * Relative luminance per WCAG, with the sRGB gamma expansion — the naive
 * `(r+g+b)/3` brightness test picks white on mid-greens and black on mid-blues,
 * both wrong, and a button label is exactly where that shows.
 *
 * The two candidate CONTRAST RATIOS are compared directly rather than testing
 * luminance against a midpoint. A 0.5 threshold is the intuitive version and
 * it is wrong: bronze (#B18D68) has luminance 0.29, so a midpoint test picks
 * white — but black gives 6.9:1 against it and white only 3.1:1. The crossover
 * is at luminance 0.1791, not 0.5, because the WCAG ratio is not linear in
 * luminance. Caught by testing the palette's own colours rather than trusting
 * the formula.
 *
 * Accepts the shapes the palette sanitizer in this file lets through: #rgb,
 * #rrggbb and rgb()/rgba(). Anything else returns null and the caller emits no
 * companion property, so the consuming rule falls back to its designed colour.
 */
function contrastColor(color) {
  const value = String(color).trim();
  let r;
  let g;
  let b;

  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const digits =
      hex[1].length === 3
        ? hex[1]
            .split("")
            .map((d) => d + d)
            .join("")
        : hex[1];
    r = parseInt(digits.slice(0, 2), 16);
    g = parseInt(digits.slice(2, 4), 16);
    b = parseInt(digits.slice(4, 6), 16);
  } else {
    const rgb = value.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    if (!rgb) {
      return null;
    }
    [, r, g, b] = rgb.map(Number);
  }

  if (![r, g, b].every((channel) => Number.isFinite(channel))) {
    return null;
  }

  const linear = (channel) => {
    const c = channel / 255;

    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };

  const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

  // WCAG contrast ratio is (lighter + 0.05) / (darker + 0.05).
  const againstBlack = (luminance + 0.05) / 0.05;
  const againstWhite = 1.05 / (luminance + 0.05);

  return againstBlack >= againstWhite ? "#000000" : "#ffffff";
}
// Vendor CSS is imported here (webpack-inlined, order-guaranteed) instead of
// via plain-CSS @import inside main.scss: webpack emits the app's css modules
// in module-graph order, and any browser-level @import that ends up after
// another module's rules is silently IGNORED per the CSS spec — which
// intermittently dropped Bootstrap/Swiper/icon fonts from the whole site.
import "../public/fonts/fonts.css";
import "../public/fonts/font-icons.css";
import "../public/css/bootstrap.min.css";
import "../public/css/bootstrap-select.min.css";
import "../public/css/swiper-bundle.min.css";
import "../public/css/animate.css";
// Tabler icon webfont. Imported HERE with the other vendor CSS, not via an
// @import in main.scss: a browser-level @import that lands after another
// module's rules is ignored per spec, which is how Bootstrap and the icon
// fonts silently vanished sitewide once already.
//
// Operator-chosen: health goals store a class like `ti ti-gender-bigender`,
// and Heroicons — which the ADMIN uses — have no equivalent vocabulary for
// bodies and conditions.
import "@tabler/icons-webfont/dist/tabler-icons.min.css";
import "../public/scss/main.scss";
import "rc-slider/assets/index.css";
import "./globals.css";

export const revalidate = 300;

export async function generateMetadata() {
  const config = await getConfig();
  const seo = config?.seo ?? {};
  const brand = config?.brand ?? {};

  return {
    title: {
      default: seo.default_title || brand.name || "Site",
      template: `%s | ${brand.name || seo.default_title || "Site"}`,
    },
    description: seo.default_description || undefined,
    icons: brand.favicon_url ? { icon: brand.favicon_url } : undefined,
    robots: seo.allow_indexing === false ? { index: false, follow: false } : undefined,
  };
}

/** First menu mounted in a region's item list, or null. */
function regionMenu(region) {
  return region?.find((item) => item.kind === "menu")?.menu ?? null;
}

/** All menus mounted in a region, in admin-defined order. */
function regionMenus(region) {
  return (region ?? []).filter((item) => item.kind === "menu").map((item) => item.menu);
}

/**
 * All SECTIONS mounted in a region, in admin-defined order.
 *
 * A region item is `{kind}` plus one payload key — `menu` or `section` — and
 * until now only `menu` was ever read. Anything an operator mounted in a
 * region as a section or a global block was fetched, sent over the wire, and
 * silently dropped on the floor: the admin offers six regions and advertises
 * sections in all of them, and the shell rendered menus from two.
 *
 * That is how the "Footer Disclaimer" global block came to exist, be mounted,
 * report has_content: true, and appear nowhere on the site.
 *
 * The envelope is the same one `SectionRenderer` takes on a page, so a global
 * block behaves identically in a region and in page content — which is the
 * point of a global block: authored once, injected everywhere the template
 * puts that region.
 */
function regionSections(region) {
  return (region ?? [])
    .filter((item) => item.kind === "section")
    .map((item) => item.section)
    // An empty scaffold must leave NO DOM, not an empty wrapper. The layout
    // controller serves a section envelope whether or not it has content — it
    // only drops a disabled global or an unresolvable type — so filtering on
    // item COUNT would render the wrapper (and its border) for a block an
    // operator created and has not written yet, on every page of the site.
    // SectionRenderer already renders nothing per section; the wrapper is the
    // part that leaks. Same rule as hard rule 3, one level up.
    .filter((section) => section?.has_content !== false);
}

/**
 * Root shell — the universal page template. Server component: fetches
 * /api/v1/config + /api/v1/layout once per ISR window and hands chrome data
 * to client components (which own all interaction). Everything brand-specific
 * is DB-driven: theme tokens become CSS custom properties, custom CSS and
 * tracking scripts are injected verbatim, header/nav/footer render menus
 * mounted in the backend's layout regions.
 *
 * SECURITY: custom_css / custom_head_scripts / custom_body_scripts are injected
 * unsanitized BY DESIGN — executing pasted tracking scripts is the feature.
 * They come only from this install's own backend, writable solely by
 * permission-gated admins (same trust level as the deploy itself). Never
 * point API_BASE_URL at an untrusted backend, and never route user-generated
 * content through these fields.
 */
export default async function RootLayout({ children }) {
  const [config, regions] = await Promise.all([getConfig(), getLayout()]);
  const theme = config?.theme ?? {};
  const brand = config?.brand ?? {};
  const seo = config?.seo ?? {};

  const headerMenu = regionMenu(regions?.header);
  const footerMenus = regionMenus(regions?.footer);
  // Site-wide sections. The footer's land above the copyright line; this is
  // where a legal disclaimer belongs, set once and shown on every page.
  const footerSections = regionSections(regions?.footer);
  const preFooterSections = regionSections(regions?.pre_footer);

  // "Need Help?" link in the mobile menu: reuse the first contact-ish footer
  // link if the admin mounted one; otherwise the block is omitted.
  const contactHref =
    footerMenus
      .flatMap((menu) => menu.items)
      .filter((item) => item.link?.type === "page" && item.link.slug.startsWith("contact"))
      .map((item) => menuLinkHref(item.link))[0] ?? null;

  // The install's named color palette. One admin-owned vocabulary feeding
  // two things: a --palette-{name} custom property that section Style knobs
  // resolve against (SectionRenderer emits `--sx-bg: var(--palette-sand)`),
  // and a .tx-{name} utility for rich text.
  //
  // `text_classes` is the pre-palette name for the same rows and is read as
  // a fallback so an older backend still colors text. Names and colors are
  // sanitized to CSS-safe characters before injection — these reach a
  // <style> tag and an inline style attribute.
  const palette = (theme.palette?.length ? theme.palette : (theme.text_classes ?? []))
    .filter((entry) => entry?.name && entry?.color)
    .map((entry) => ({
      name: String(entry.name).replace(/[^a-z0-9-]/g, ""),
      color: String(entry.color).replace(/[^#a-zA-Z0-9(),.%\s-]/g, ""),
    }))
    .filter((entry) => entry.name && entry.color);

  const textClassCss = palette
    .map((entry) => `.tx-${entry.name} { color: ${entry.color}; }`)
    .join("\n");

  // Each palette colour also emits a CONTRAST companion — black or white,
  // whichever stays readable on it. That is what lets `style_button_color` be
  // a single operator choice: the frontend derives the label rather than
  // asking for it, so nobody can pick sand-on-white. CSS cannot do this
  // (contrast-color() is not broadly available), but CSS does not have to —
  // this is the one place that holds the actual hex.
  //
  // A colour we cannot parse simply emits no companion. The button's own
  // `var(--sx-btn-text, <original>)` fallback then fires and the label keeps
  // its designed colour: the fill follows, the label degrades safely.
  const paletteVars = Object.fromEntries(
    palette.flatMap((entry) => {
      const contrast = contrastColor(entry.color);

      return [
        [`--palette-${entry.name}`, entry.color],
        ...(contrast ? [[`--palette-${entry.name}-contrast`, contrast]] : []),
      ];
    }),
  );

  const themeVars = Object.fromEntries(
    Object.entries({
      ...paletteVars,
      "--color-primary": theme.primary_color,
      "--color-accent": theme.accent_color,
      "--color-accent-secondary": theme.accent_secondary_color,
      "--color-background": theme.background_color,
      "--color-text": theme.text_color,
      "--font-display": theme.font_display,
      "--font-body": theme.font_body,
    }).filter(([, value]) => Boolean(value)),
  );

  return (
    <html lang="en" style={themeVars} data-template={theme.frontend_template || "default"}>
      <body>
        {/* React hoists precedence-tagged stylesheet links into <head>. */}
        <link
          rel="stylesheet"
          precedence="default"
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Spectral:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;1,200;1,300;1,400;1,500;1,600;1,700;1,800&display=swap"
        />
        {textClassCss ? <style dangerouslySetInnerHTML={{ __html: textClassCss }} /> : null}
        {theme.custom_css ? <style dangerouslySetInnerHTML={{ __html: theme.custom_css }} /> : null}
        {seo.custom_head_scripts ? (
          <div dangerouslySetInnerHTML={{ __html: seo.custom_head_scripts }} />
        ) : null}

        {brand.announcement ? (
          <div className="tf-topbar text-center">
            <div className="container">
              <p className="top-bar-text">
                {brand.announcement.emphasis ? (
                  <span className="fw-medium">{brand.announcement.emphasis} </span>
                ) : null}
                {brand.announcement.text}
              </p>
            </div>
          </div>
        ) : null}

        <CartProvider>
          <Header brand={brand} menu={headerMenu} />

          <main className="site-main">{children}</main>

          {/* Sections an operator mounted in the pre-footer region: a
              site-wide band between page content and the footer proper. */}
          {preFooterSections.length ? (
            <div className="site-pre-footer">
              <SectionRenderer sections={preFooterSections} />
            </div>
          ) : null}

          {/* Footer sections are rendered HERE, in the server shell, and handed
              to the client Footer as JSX. Importing SectionRenderer inside
              Footer would pull every section component across the "use client"
              boundary with it. */}
          <Footer
            brand={brand}
            menus={footerMenus}
            sections={
              footerSections.length ? <SectionRenderer sections={footerSections} /> : null
            }
          />

          <MobileMenu menu={headerMenu} contactHref={contactHref} />
          <CartDrawer />
        </CartProvider>
        <BootstrapClient />

        {seo.custom_body_scripts ? (
          <div dangerouslySetInnerHTML={{ __html: seo.custom_body_scripts }} />
        ) : null}
      </body>
    </html>
  );
}
