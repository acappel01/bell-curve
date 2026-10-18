/**
 * Section image from the API's `{ url, alt }` shape, with an optional mobile
 * source for an intentional small-screen crop (client rule: no cut-off faces
 * on mobile, and no relying on CSS to rescue a badly composed crop).
 *
 * Images are lazy unless `priority` (the hero). Alt text comes from the
 * payload; an empty alt marks a decorative image, which is what the client's
 * accessibility notes ask for on textures.
 */
export default function Picture({ image, mobile = null, className = "", priority = false, sizes }) {
  if (!image?.url) {
    return null;
  }

  return (
    <picture className={className || undefined}>
      {mobile?.url ? <source media="(max-width: 767px)" srcSet={mobile.url} /> : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt={image.alt ?? ""}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        sizes={sizes}
      />
    </picture>
  );
}
