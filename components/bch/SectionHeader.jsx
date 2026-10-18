import Heading from "@/components/sections/Heading";
import Html from "@/components/Html";

/**
 * Eyebrow, heading (with italic emphasis) and lead shared by every BCH section
 * that has an intro, so the type treatment lives in one place.
 */
export default function SectionHeader({ data, align = "left", size = "lg", className = "" }) {
  if (!data?.heading && !data?.eyebrow && !data?.lead) {
    return null;
  }

  return (
    <div className={`bch-head bch-head--${align} ${className}`.trim()}>
      {data.eyebrow ? <p className="bch-eyebrow">{data.eyebrow}</p> : null}
      <Heading
        className={`bch-display bch-display--${size}`}
        heading={data.heading}
        emphasis={data.emphasis}
      />
      <Html value={data.lead} inline as="p" className="bch-lead bch-head__lead" />
    </div>
  );
}
