import Link from "next/link";

/**
 * Theme `components/productDetails/Breadcrumb.jsx` — the slim detail-page
 * breadcrumb bar (`breadcrumb-sec`). Crumbs are Home / listing / item name;
 * the theme's dead prev/next demo anchors are dropped, keeping only the
 * back-to-listing shop icon it wired for real.
 */
export default function Breadcrumb({ name, listingHref, listingLabel }) {
  return (
    <div className="breadcrumb-sec">
      <div className="container">
        <div className="breadcrumb-wrap">
          <div className="breadcrumb-list">
            <Link href={`/`} className="breadcrumb-item">
              Home
            </Link>
            <div className="breadcrumb-item dot">
              <span />
            </div>
            <Link href={listingHref} className="breadcrumb-item">
              {listingLabel}
            </Link>
            <div className="breadcrumb-item dot">
              <span />
            </div>
            <div className="breadcrumb-item current">{name}</div>
          </div>
          <div className="breadcrumb-prev-next">
            <Link href={listingHref} className="breadcrumb-back">
              <i className="icon icon-shop" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
