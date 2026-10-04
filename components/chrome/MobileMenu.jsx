"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { menuLinkHref } from "@/lib/routes";

/**
 * Mobile offcanvas menu (port of theme MobileMenu, minus search — no search
 * module yet). Same menu data as the desktop header; items with children
 * collapse via Bootstrap. The CTA item renders as a highlighted last entry.
 *
 * ─── NEVER PUT `data-bs-dismiss` ON A LINK IN HERE ─────────────────────
 *
 * Every link in this menu used to carry `data-bs-dismiss="offcanvas"`, and the
 * whole mobile menu was dead: tapping any item closed the drawer and navigated
 * nowhere. Bootstrap's dismiss delegate is unconditional about it —
 *
 *     EventHandler.on(document, clickEvent, `[data-bs-dismiss="${name}"]`, function (event) {
 *       if (['A', 'AREA'].includes(this.tagName)) {
 *         event.preventDefault();
 *       }
 *
 * — so the click was cancelled before Next's router ever saw it. The drawer
 * still animated shut, which is exactly why it read as "nothing happens"
 * rather than as an error: the one visible effect of the tap still worked.
 *
 * Everything closes through `closeDrawer` below instead — the links, and the
 * close button too. The button could safely keep the attribute, since
 * preventDefault on a `<button>` cancels nothing, but one mechanism is easier
 * to reason about than two that differ only in a footgun.
 */
export default function MobileMenu({ menu, contactHref }) {
  const pathname = usePathname();
  const items = menu?.items ?? [];
  const cta = items.find((item) => item.badge === "cta");
  const navItems = items.filter((item) => item.badge !== "cta");

  const isActive = (href) => href?.split("/")[1] === pathname.split("/")[1];

  /**
   * Close the drawer without touching the click.
   *
   * `BootstrapClient` already closes any open offcanvas on a route change, so
   * this is belt and braces for the case that does NOT change the route: a link
   * to the page you are already on, where the pathname never fires and the
   * drawer would otherwise sit there looking broken.
   *
   * Failing quietly is right here. If Bootstrap's JS has not loaded yet the
   * drawer cannot have been opened by it either, and a menu that navigates but
   * does not close beats one that does neither.
   */
  const closeDrawer = async () => {
    try {
      const bootstrap = await import("bootstrap/dist/js/bootstrap.esm");
      const drawer = document.getElementById("mobileMenu");

      if (drawer) {
        bootstrap.Offcanvas.getInstance(drawer)?.hide();
      }
    } catch {
      // See above — nothing to recover, and nothing worth breaking navigation for.
    }
  };

  return (
    <div className="offcanvas offcanvas-start canvas-mb" id="mobileMenu">
      <button
        className="icon-close icon-close-popup"
        onClick={closeDrawer}
        aria-label="Close"
      />
      <div className="mb-canvas-content">
        <div className="mb-body">
          <div className="mb-content-top">
            <ul className="nav-ul-mb" id="wrapper-menu-navigation">
              {navItems.map((item) => {
                const href = menuLinkHref(item.link);
                const hasChildren = item.children?.length > 0;

                if (!hasChildren) {
                  return (
                    <li key={item.id} className="nav-mb-item">
                      <Link
                        href={href}
                        className={`mb-menu-link ${isActive(href) ? "menuActive" : ""}`}
                        onClick={closeDrawer}
                      >
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                }

                return (
                  <li key={item.id} className="nav-mb-item">
                    <a
                      href={`#mb-menu-${item.id}`}
                      className={`collapsed mb-menu-link ${isActive(href) ? "menuActive" : ""}`}
                      data-bs-toggle="collapse"
                      aria-expanded="false"
                      aria-controls={`mb-menu-${item.id}`}
                    >
                      <span>{item.label}</span>
                      <span className="btn-open-sub" />
                    </a>
                    <div id={`mb-menu-${item.id}`} className="collapse">
                      <ul className="sub-nav-menu">
                        {item.children.map((child) => {
                          const childHref = menuLinkHref(child.link);

                          return (
                            <li key={child.id}>
                              <Link
                                href={childHref}
                                className={`sub-nav-link ${isActive(childHref) ? "menuActive" : ""}`}
                                onClick={closeDrawer}
                              >
                                {child.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </li>
                );
              })}
              {cta ? (
                <li className="nav-mb-item">
                  <Link
                    href={menuLinkHref(cta.link)}
                    className="mb-menu-link fw-bold"
                    onClick={closeDrawer}
                  >
                    <span>{cta.label}</span>
                  </Link>
                </li>
              ) : null}
            </ul>
          </div>
          {contactHref ? (
            <div className="mb-other-content">
              <div className="mb-notice">
                <Link href={contactHref} className="text-need" onClick={closeDrawer}>
                  Need Help?
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
