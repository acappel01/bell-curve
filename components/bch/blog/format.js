/** "2026-10-05T…" → "October 5, 2026". Null for a missing or unparseable date. */
export function postDate(iso) {
  const date = iso ? new Date(iso) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** "Oct 5, 2026 · 6 min read", from whichever parts the post has. */
export function postMeta(post, { date = true, readTime = true } = {}) {
  return [
    date && postDate(post.published_at),
    readTime && post.read_time_minutes ? `${post.read_time_minutes} min read` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
