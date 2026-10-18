import { getConfig, getLayout } from "@/lib/api";
import { contrastColor } from "@/lib/color";
import Header from "@/components/chrome/Header";
import Footer from "@/components/chrome/Footer";
import SectionRenderer from "@/components/SectionRenderer";
import BootstrapClient from "@/components/chrome/BootstrapClient";
import CartProvider from "@/components/cart/CartProvider";
import CartDrawer from "@/components/cart/CartDrawer";

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
import "../public/scss/bch/bch.scss";

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

/**
 * Google Fonts stylesheet for the theme's display and body families.
 *
 * The families are admin settings (/config theme.font_display / font_body), so
 * the stylesheet has to follow them: a hardcoded link loads one brand's fonts
 * on every install and leaves the configured ones to fall back. A value that
 * is already a CSS stack (contains a comma) or a generic family is not a
 * Google family and is skipped. With nothing to load, the previous defaults
 * are kept so the inherited theme reset still has its faces.
 */
const GOOGLE_FONT_AXES = {
  display: "ital,wght@0,400;0,500;0,600;1,400;1,500",
  body: "ital,wght@0,300;0,400;0,500;0,600;0,700;1,400",
};

function googleFontsHref(theme) {
  const families = [
    [theme.font_display, GOOGLE_FONT_AXES.display],
    [theme.font_body, GOOGLE_FONT_AXES.body],
  ]
    .filter(([family]) => family && !family.includes(",") && !/^(serif|sans-serif|system-ui)$/i.test(family))
    .filter(([family], index, list) => list.findIndex(([other]) => other === family) === index)
    .map(([family, axes]) => `family=${encodeURIComponent(family.trim()).replace(/%20/g, "+")}:${axes}`);

  if (!families.length) {
    return "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Spectral:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;1,200;1,300;1,400;1,500;1,600;1,700;1,800&display=swap";
  }

  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
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

  // The bag icon only shows once retail checkout is live (client rule: no
  // decorative account or bag icons).
  const showCart = config?.services?.shop?.state === "live";

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
          href={googleFontsHref(theme)}
        />
        {textClassCss ? <style dangerouslySetInnerHTML={{ __html: textClassCss }} /> : null}
        {theme.custom_css ? <style dangerouslySetInnerHTML={{ __html: theme.custom_css }} /> : null}
        {seo.custom_head_scripts ? (
          <div dangerouslySetInnerHTML={{ __html: seo.custom_head_scripts }} />
        ) : null}

        {brand.announcement?.text || brand.announcement?.emphasis ? (
          <p className="bch-announcement">
            {brand.announcement.emphasis ? <strong>{brand.announcement.emphasis} </strong> : null}
            {brand.announcement.text}
            <span className="bch-heart" aria-hidden="true">
              ♥
            </span>
          </p>
        ) : null}

        <CartProvider>
          <Header brand={brand} menu={headerMenu} showCart={showCart} />

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
            contact={config?.contact}
            sections={
              footerSections.length ? <SectionRenderer sections={footerSections} /> : null
            }
          />

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
