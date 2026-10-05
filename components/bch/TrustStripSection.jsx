import Link from "next/link";

/**
 * Row of linked labels (flexible type `bch-trust-strip`):
 * `items: [{ label, url }]`, optional `heading`.
 *
 * Under the homepage hero it is the three-part service strip, a second quiet
 * set of first-screen routes. With a heading it is the compact topic
 * navigation the handoff asks for on Midlife Health ("Start with what you're
 * noticing."), and on How It Works the closing three-route action.
 */
export default function TrustStripSection({ section }) {
  const data = section.data ?? {};
  const items = (data.items ?? []).filter((item) => item?.label);

  if (!items.length) {
    return null;
  }

  return (
    <nav
      className={`bch-trust${data.heading ? " bch-trust--headed" : ""}`}
      aria-label={data.heading || "What Bell Curve Health offers"}
      id={section.anchor || undefined}
    >
      {data.heading ? (
        <div className="bch-container">
          <h2 className="bch-display bch-display--sm bch-trust__heading">{data.heading}</h2>
        </div>
      ) : null}
      <ul
        className="bch-container bch-trust__list"
        style={{
          "--bch-trust-cols": Math.min(items.length, 6),
          "--bch-trust-cols-sm": Math.min(items.length, 3),
        }}
      >
        {items.map((item) => (
          <li key={item.label}>
            {item.url ? <Link href={item.url}>{item.label}</Link> : <span>{item.label}</span>}
          </li>
        ))}
      </ul>
    </nav>
  );
}
