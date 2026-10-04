"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  addCartItem,
  clearCart,
  fetchCart,
  getCartToken,
  removeCartItem,
  updateCartItem,
} from "@/lib/cartClient";

/**
 * Client cart state — the single source of truth for cart contents, count,
 * and the drawer's open state. Mounted once in the root layout; consumers
 * use useCart(). The cart hydrates lazily: on mount only when a token
 * already exists (no gratuitous cart rows for every visitor), otherwise on
 * the first add.
 */
const CartContext = createContext(null);

/**
 * The drawer auto-opens after an add only on desktop (matching the theme's
 * xl breakpoint). Below that, add feedback is the header cart-bag bump —
 * a near-fullscreen offcanvas popping open uninvited is hostile on touch
 * viewports. Tapping the bag still opens the drawer at any size.
 */
const DRAWER_AUTO_OPEN_QUERY = "(min-width: 1200px)";

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside <CartProvider>");
  }

  return context;
}

export default function CartProvider({ children }) {
  const [cart, setCart] = useState(null);
  const [busy, setBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (getCartToken()) {
      fetchCart().then(setCart).catch(() => {});
    }
  }, []);

  const run = useCallback(async (operation) => {
    setBusy(true);
    try {
      const next = await operation();
      setCart(next);
      return next;
    } finally {
      setBusy(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      cart,
      busy,
      itemCount: cart?.item_count ?? 0,
      subtotal: cart?.subtotal ?? 0,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      addItem: (payload) =>
        run(() => addCartItem(payload)).then((next) => {
          if (window.matchMedia(DRAWER_AUTO_OPEN_QUERY).matches) {
            setDrawerOpen(true);
          }
          return next;
        }),
      updateItem: (itemId, quantity) => run(() => updateCartItem(itemId, quantity)),
      removeItem: (itemId) => run(() => removeCartItem(itemId)),
      clear: () => run(() => clearCart()),
    }),
    [cart, busy, drawerOpen, run],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
