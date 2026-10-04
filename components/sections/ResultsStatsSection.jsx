import Html from "../Html";
import Heading from "./Heading";

/**
 * Icon-key → SVG map for the results-stats blueprint's built-in icon set
 * (patients, protocols, states, satisfaction, pulse, shield). The API sends
 * the semantic key; presentation (stroke color via currentColor) is ours.
 */
const ICON_PATHS = {
  patients: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  protocols: (
    <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
  ),
  states: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  satisfaction: (
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  ),
  pulse: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
};

function StatIcon({ name }) {
  const paths = ICON_PATHS[name];

  if (!paths) {
    return null;
  }

  return (
    <svg
      className="rs-icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths}
    </svg>
  );
}

/**
 * `results-stats` blueprint → dark "By the Numbers" section: centered
 * heading + grid of stat blocks. Data: eyebrow, heading, emphasis,
 * stats.* {value, label, sublabel, icon}, footer_note.
 */
export default function ResultsStatsSection({ section }) {
  const data = section.data ?? {};
  const stats = (data.stats ?? []).filter((stat) => stat?.value);

  if (!stats.length && !data.heading) {
    return null;
  }

  return (
    <section id={section.anchor || undefined} className="rs-section sx-section">
      <div className="rs-inner sx-content">
        <header className="rs-header">
          <Html as="p" inline className="rs-eyebrow" value={data.eyebrow} />
          <Heading className="rs-heading" heading={data.heading} emphasis={data.emphasis} />
        </header>

        {stats.length ? (
          <div className="rs-grid">
            {stats.map((stat, index) => (
              <div className="rs-stat" key={`${stat.label}-${index}`}>
                <StatIcon name={stat.icon} />
                <Html as="p" inline className="rs-value" value={stat.value} />
                <Html as="p" inline className="rs-label" value={stat.label} />
                <Html as="p" inline className="rs-sublabel" value={stat.sublabel} />
              </div>
            ))}
          </div>
        ) : null}

        <Html as="p" inline className="rs-footnote" value={data.footer_note} />
      </div>
    </section>
  );
}
