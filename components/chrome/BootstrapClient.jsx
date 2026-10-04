"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Client-side Bootstrap bootstrapping: loads the JS bundle (offcanvas,
 * collapse, modal) on mount and closes any open offcanvas/modal on route
 * change so the mobile menu doesn't stay open after navigation.
 */
export default function BootstrapClient() {
  const pathname = usePathname();

  useEffect(() => {
    import("bootstrap/dist/js/bootstrap.esm");
  }, []);

  useEffect(() => {
    (async () => {
      const bootstrap = await import("bootstrap/dist/js/bootstrap.esm");

      document.querySelectorAll(".offcanvas.show").forEach((el) => {
        bootstrap.Offcanvas.getInstance(el)?.hide();
      });
      document.querySelectorAll(".modal.show").forEach((el) => {
        bootstrap.Modal.getInstance(el)?.hide();
      });
      document.querySelectorAll(".modal-backdrop, .offcanvas-backdrop").forEach((el) => {
        el.remove();
      });
    })();
  }, [pathname]);

  return null;
}
