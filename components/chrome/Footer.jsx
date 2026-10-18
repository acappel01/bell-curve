import Link from "next/link";
import { menuLinkHref } from "@/lib/routes";

/** Tabler icon per /config contact.social key. Unknown keys are skipped. */
const SOCIAL_ICONS = {
  instagram: "ti-brand-instagram",
  facebook: "ti-brand-facebook",
  twitter: "ti-brand-x",
  linkedin: "ti-brand-linkedin",
  tiktok: "ti-brand-tiktok",
  youtube: "ti-brand-youtube",
};

function MenuLinks({ menu }) {
  return (
    <ul>
      {menu.items.map((item) => (
        <li key={item.id}>
          <Link href={menuLinkHref(item.link)} target={item.target || undefined}>
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Charcoal site footer. Every piece is API-driven:
 *
 * - the light logo variant from /config brand (`logo_light_url`, falling back
 *   to `logo_url`), and the brand tagline;
 * - the FIRST menu mounted in the footer region as the main link row, and any
 *   further menus (legal, contact) as the small links on the bottom bar;
 * - social links from /config contact.social, shown only when set;
 * - `sections`: already-rendered global blocks an operator mounted in the
 *   footer region. They arrive as JSX because rendering SectionRenderer in
 *   here would pull every section component into this module.
 *
 * Kept deliberately restrained: the client asked for no long disclaimers in
 * the footer. Full policies live in the legal pages the menus link to.
 */
export default function Footer({ brand, menus, contact = null, sections = null }) {
  const [primary, ...secondary] = menus ?? [];
  const logo = brand?.logo_light_url || brand?.logo_url;
  const social = Object.entries(contact?.social ?? {}).filter(
    ([key, url]) => url && SOCIAL_ICONS[key]
  );

  return (
    <footer className="bch-footer">
      <div className="bch-container bch-footer__main">
        <Link href="/" className="bch-footer__logo">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={brand?.name || "Home"} width={88} height={88} />
          ) : (
            <strong>{brand?.name}</strong>
          )}
        </Link>

        <div>
          {primary ? (
            <nav className="bch-footer__nav" aria-label={primary.name}>
              <MenuLinks menu={primary} />
            </nav>
          ) : null}
          {social.length ? (
            <div className="bch-footer__social">
              {social.map(([key, url]) => (
                <a key={key} href={url} target="_blank" rel="noopener noreferrer">
                  <i className={`ti ${SOCIAL_ICONS[key]}`} aria-hidden="true" />
                  <span className="bch-visually-hidden">{key}</span>
                </a>
              ))}
            </div>
          ) : null}
        </div>

        {brand?.tagline ? (
          <p className="bch-footer__tagline">
            {brand.tagline}
            <span className="bch-heart" aria-hidden="true">
              ♥
            </span>
          </p>
        ) : null}
      </div>

      {sections ? <div className="bch-footer__sections">{sections}</div> : null}

      <div className="bch-footer__bottom">
        <div className="bch-container">
          <p>
            © {new Date().getFullYear()} {brand?.name}. All rights reserved.
          </p>
          {secondary.map((menu) => (
            <nav key={menu.slug} aria-label={menu.name}>
              <MenuLinks menu={menu} />
            </nav>
          ))}
        </div>
      </div>
    </footer>
  );
}
