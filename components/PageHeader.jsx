import Link from "next/link";

/**
 * Page title banner (Figma 337-1182), rendered above CMS page content when
 * the backend page's title_banner is enabled: background photo with a dark
 * scrim, centered display title, optional subtitle/intro, and a breadcrumb
 * trail computed from the URL segments (backend sends show_breadcrumbs only;
 * the trail itself is derived here). Data: page.title_banner {title,
 * subtitle, intro_text, show_breadcrumbs, background_image}.
 */
export default function PageHeader({ banner, slug }) {
  if (!banner) {
    return null;
  }

  const segments = (slug || "").split("/").filter(Boolean);
  const crumbs = segments.map((segment, index) => ({
    label:
      index === segments.length - 1
        ? banner.title
        : segment.replace(/-/g, " "),
    href:
      index === segments.length - 1
        ? null
        : `/${segments.slice(0, index + 1).join("/")}`,
  }));

  return (
    <section className="page-header">
      {banner.background_image?.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="page-header__bg"
          src={banner.background_image.url}
          alt={banner.background_image.alt || ""}
        />
      ) : null}
      <div className="page-header__scrim" aria-hidden />

      <div className="page-header__inner">
        {banner.show_breadcrumbs && crumbs.length ? (
          <nav className="page-header__crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            {crumbs.map((crumb, index) => (
              <span key={index} className="page-header__crumb">
                <span className="page-header__crumb-sep" aria-hidden>
                  /
                </span>
                {crumb.href ? (
                  <Link href={crumb.href}>{crumb.label}</Link>
                ) : (
                  <span aria-current="page">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}

        <h1 className="page-header__title">{banner.title}</h1>
        {banner.subtitle ? (
          <p className="page-header__subtitle">{banner.subtitle}</p>
        ) : null}
        {banner.intro_text ? (
          <p className="page-header__intro">{banner.intro_text}</p>
        ) : null}
      </div>
    </section>
  );
}
