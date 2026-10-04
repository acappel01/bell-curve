import { revalidateTag } from "next/cache";

/**
 * On-demand revalidation webhook.
 *
 * The backend caches its own API payloads under a versioned namespace and
 * bumps that version the instant an admin saves (CmsCacheObserver), so the
 * API is fresh immediately. This endpoint carries that invalidation across
 * the repo boundary: without it the frontend keeps serving its cached render
 * for up to `API_REVALIDATE` seconds after the save.
 *
 * The backend POSTs the tags affected by the write; `lib/api.js` attaches the
 * matching tags to every content fetch. Tags rather than paths, deliberately:
 * the backend names entities (`page:faq`), this app owns the URL those
 * entities live at.
 *
 *   POST /api/revalidate
 *   x-revalidate-secret: <REVALIDATE_SECRET>
 *   { "tags": ["cms", "page:faq"] }
 *
 * Returns 200 with the tags revalidated. Never trust the body without the
 * secret — revalidation is cheap but it is still a write against the cache,
 * and an open endpoint is a free cache-stampede lever.
 */

const MAX_TAGS = 64;

function unauthorized() {
  return Response.json({ message: "Unauthorized" }, { status: 401 });
}

export async function POST(request) {
  const secret = process.env.REVALIDATE_SECRET;

  // No secret configured = endpoint disabled. Failing closed matters: an
  // unset env var must never silently mean "allow everyone".
  if (!secret) {
    return Response.json(
      { message: "Revalidation is not configured" },
      { status: 503 },
    );
  }

  if (request.headers.get("x-revalidate-secret") !== secret) {
    return unauthorized();
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const tags = Array.isArray(body?.tags)
    ? body.tags.filter((tag) => typeof tag === "string" && tag.length > 0 && tag.length <= 256)
    : [];

  if (!tags.length) {
    return Response.json({ message: "No tags supplied" }, { status: 400 });
  }

  if (tags.length > MAX_TAGS) {
    return Response.json(
      { message: `Too many tags (max ${MAX_TAGS})` },
      { status: 422 },
    );
  }

  for (const tag of tags) {
    revalidateTag(tag);
  }

  return Response.json({ revalidated: tags, now: Date.now() });
}
