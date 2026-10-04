/**
 * Browser-side cart API client. Identity is the X-Cart-Token ULID, persisted
 * in localStorage and re-read from every response (the backend mints a fresh
 * cart when the token is absent or expired).
 *
 * Calls go through this app's own proxy rather than straight to the backend,
 * so the bearer token stays server-side — see `lib/browserBase.js`. The proxy
 * forwards X-Cart-Token upstream; without that the cart would look new on
 * every request.
 */
import { API_BASE } from "./browserBase";

const TOKEN_KEY = "cart_token";

const base = () => API_BASE;

export function getCartToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

function storeCartToken(token) {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token);
    }
  } catch {
    // Storage unavailable (private mode) — cart lives for the page session.
  }
}

async function cartFetch(path, options = {}) {
  const token = getCartToken();

  const response = await fetch(`${base()}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { "X-Cart-Token": token } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || `Cart request failed (${response.status})`);
  }

  const body = await response.json();
  const cart = body?.data ?? null;

  if (cart?.token) {
    storeCartToken(cart.token);
  }

  return cart;
}

export const fetchCart = () => cartFetch("/cart");

export const addCartItem = ({ type, id, planId = null, quantity = 1 }) =>
  cartFetch("/cart/items", {
    method: "POST",
    body: JSON.stringify({ type, id, ...(planId ? { plan_id: planId } : {}), quantity }),
  });

export const updateCartItem = (itemId, quantity) =>
  cartFetch(`/cart/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });

export const removeCartItem = (itemId) =>
  cartFetch(`/cart/items/${itemId}`, { method: "DELETE" });

export const clearCart = () => cartFetch("/cart", { method: "DELETE" });
