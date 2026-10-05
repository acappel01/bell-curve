import Link from "next/link";

/**
 * Three-part strip under the hero (flexible type `bch-trust-strip`):
 * `items: [{ label, url }]`. Each label links to its service so the strip
 * doubles as a second, quiet set of first-screen routes.
 */
export default function TrustStripSection({ section }) {
  const items = (section.data?.items ?? []).filter((item) => item?.label);

  if (!items.length) {
    return null;
  }

  return (
    <nav className="bch-trust" aria-label="What Bell Curve Health offers" id={section.anchor || undefined}>
      <ul className="bch-container bch-trust__list">
        {items.map((item) => (
          <li key={item.label}>
            {item.url ? <Link href={item.url}>{item.label}</Link> : <span>{item.label}</span>}
          </li>
        ))}
      </ul>
    </nav>
  );
}
