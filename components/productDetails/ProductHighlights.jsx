import { toPlainText } from "@/lib/richText";

/**
 * The credibility list under the buy box — "Physician-supervised",
 * "Licensed pharmacy", the short reassurances a visitor wants at the moment
 * they decide.
 *
 * Fed by the record's `highlights`, which the operator authors on the
 * Merchandising tab as `[{text, icon}]`.
 *
 * THIS IS WHAT HIGHLIGHTS ARE FOR, and it is worth stating because they used
 * to mean something else entirely. `highlights` was wired to a hardcoded
 * benefits DIAGRAM on the detail page, gated on nothing but the field being
 * non-empty — so adding one line made a large radial block appear halfway down
 * the page, and the only way to remove that block was to delete the line. A
 * merchandising field silently controlled a page section, and the operator
 * could not turn it off from the admin at all. The diagram is a section now
 * (`benefits-diagram`, added under Page Sections like anything else) and
 * highlights render here, where they were always meant to.
 *
 * The icon is a Tabler class, matching the health-goal convention. A row
 * authored before that field existed carries null and falls back to a check
 * mark, so the list never renders a hole.
 */
export default function ProductHighlights({ highlights = [] }) {
  const rows = (Array.isArray(highlights) ? highlights : [])
    .map((entry) => {
      // Tolerates the pre-icon shape (a bare string) so a stale cached payload
      // renders text rather than nothing.
      const text = typeof entry === "string" ? entry : toPlainText(entry?.text);

      return text ? { text, icon: typeof entry === "string" ? null : entry?.icon } : null;
    })
    .filter(Boolean);

  if (!rows.length) {
    return null;
  }

  return (
    <ul className="pd-highlights">
      {rows.map((row, index) => (
        // Indexed: two identical lines are unusual but legal, and duplicate keys
        // would silently drop one of them.
        <li className="pd-highlights__row" key={`${row.text}-${index}`}>
          <i
            className={`pd-highlights__icon ${row.icon || "icon icon-check"}`}
            aria-hidden="true"
          />
          <span className="pd-highlights__text">{row.text}</span>
        </li>
      ))}
    </ul>
  );
}
