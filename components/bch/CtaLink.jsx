import Link from "next/link";

/**
 * A section call to action from a `*_label` + `*_url` pair. Renders nothing
 * unless both are set, so an unfinished field never produces a dead button.
 *
 * `variant`: "primary" | "outline" | "light" are pill buttons; "link" is the
 * uppercase text link with an arrow.
 */
export default function CtaLink({ label, url, variant = "primary", className = "", arrow = true }) {
  if (!label || !url) {
    return null;
  }

  const classes =
    variant === "link" ? `bch-link ${className}` : `bch-btn bch-btn--${variant} ${className}`;

  return (
    <Link href={url} className={classes.trim()}>
      {label}
      {arrow ? (
        <span className="bch-arrow" aria-hidden="true">
          →
        </span>
      ) : null}
    </Link>
  );
}
