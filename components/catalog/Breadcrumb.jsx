import Link from "next/link";

/**
 * Theme `components/common/Breadcrumb.jsx` — page-title banner with
 * Home → current crumb, shared by the catalog listing routes.
 *
 * Wears the layout contract (.sx-section / .sx-content) so the background
 * image spans the viewport instead of being squeezed by .site-main's page
 * gutter, while the title and crumbs stay aligned to it. Before this it was
 * neither in the frame's full-bleed escape list nor wearing the classes, so
 * the banner sat inset on both sides — visible on /products and /stacks.
 */
export default function Breadcrumb({
  pageName,
  pageTitle,
  backgroundImage = "/images/banner/shop-header.jpg",
}) {
  return (
    <section
      className="tf-page-title sx-section"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="container sx-content">
        <div className="box-title text-center">
          <h2 className="title text-white">{pageTitle}</h2>
          <div className="breadcrumb-list text-white">
            <Link className="breadcrumb-item text-white" href={`/`}>
              Home
            </Link>
            <div className="breadcrumb-item text-white dot">
              <span />
            </div>
            <div className="breadcrumb-item current text-white">{pageName}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
