"use client";
import { useEffect } from "react";

/**
 * Theme `components/products/LayoutHandler.jsx` — grid/list layout switch
 * items for the shop control bar. Clamps the column count on smaller
 * viewports exactly like the theme.
 */
export default function LayoutHandler({ activeLayout, setActiveLayout }) {
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1200 && window.innerWidth > 767) {
        setActiveLayout((pre) => (pre > 3 ? 3 : pre));
      } else if (window.innerWidth < 768) {
        setActiveLayout((pre) => (pre > 2 ? 2 : pre));
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <>
      <li
        className={`tf-view-layout-switch sw-layout-list list-layout ${
          activeLayout == 1 ? "active" : ""
        }`}
        onClick={() => setActiveLayout(1)}
      >
        <div className="item icon-list">
          <span />
          <span />
        </div>
      </li>
      <li
        className={`tf-view-layout-switch sw-layout-2 ${activeLayout == 2 ? "active" : ""}`}
        onClick={() => setActiveLayout(2)}
      >
        <div className="item icon-grid-2">
          <span />
          <span />
        </div>
      </li>
      <li
        className={`tf-view-layout-switch sw-layout-3 ${activeLayout == 3 ? "active" : ""}`}
        onClick={() => setActiveLayout(3)}
      >
        <div className="item icon-grid-3">
          <span />
          <span />
          <span />
        </div>
      </li>
      <li
        className={`tf-view-layout-switch sw-layout-4 ${activeLayout == 4 ? "active" : ""}`}
        onClick={() => setActiveLayout(4)}
      >
        <div className="item icon-grid-4">
          <span />
          <span />
          <span />
          <span />
        </div>
      </li>
    </>
  );
}
