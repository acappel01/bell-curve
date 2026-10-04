/**
 * Figma Product V1 trust-badge band (node 1185:2346) — full-width sand strip
 * under the gallery/info row. Check glyph is the exported Figma asset at
 * /images/trust-check.svg (swappable per deployment). Items default to the
 * Atlas spec copy; pass `items` to override per placement.
 */
const DEFAULT_ITEMS = [
  "Designed by Leading Physicians",
  "Licensed Prescribers",
  "U.S. Pharmacy Network",
  "HIPAA Compliant & Secure",
];

export default function TrustBand({ items = DEFAULT_ITEMS }) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="tb-band">
      <div className="container">
        <ul className="tb-items">
          {items.map((item) => (
            <li className="tb-item" key={item}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/trust-check.svg" alt="" width={16} height={14} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
