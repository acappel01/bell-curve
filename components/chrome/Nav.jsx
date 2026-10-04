"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { menuLinkHref } from "@/lib/routes";

/**
 * Desktop nav list driven by a backend menu tree (`/api/v1/menus/{slug}`
 * item shape). Active state matches on the first path segment, like the
 * theme reference. Items with children get the theme's dropdown markup.
 */
export default function Nav({ items }) {
  const pathname = usePathname();

  const isActive = (href) => href?.split("/")[1] === pathname.split("/")[1];

  return (items ?? []).map((item) => {
    const href = menuLinkHref(item.link);
    const hasChildren = item.children?.length > 0;

    return (
      <li key={item.id} className={`menu-item ${hasChildren ? "position-relative" : ""}`}>
        <Link
          href={href}
          target={item.target || undefined}
          className={`item-link ${isActive(href) ? "menuActive" : ""}`}
        >
          {item.label}
          {hasChildren ? <i className="icon icon-arrow-down" /> : null}
        </Link>
        {hasChildren ? (
          <div className="sub-menu">
            <ul className="menu-list">
              {item.children.map((child) => (
                <li key={child.id}>
                  <Link
                    href={menuLinkHref(child.link)}
                    target={child.target || undefined}
                    className={`menu-link-text link ${isActive(menuLinkHref(child.link)) ? "menuActive" : ""}`}
                  >
                    {child.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </li>
    );
  });
}
