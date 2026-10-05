import Heading from "@/components/sections/Heading";
import SideNote from "./SideNote";

/**
 * Charcoal statement panel (flexible type `bch-statement`): one large serif
 * line, its tail in italic rose, a thin organic curve and a side note. No
 * photograph, per the client's homepage notes.
 */
export default function StatementSection({ section }) {
  const data = section.data ?? {};

  return (
    <section className="bch-statement" id={section.anchor || undefined}>
      <svg className="bch-statement__curve" viewBox="0 0 1440 220" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 170 C 260 170, 420 40, 720 40 S 1180 170, 1440 170" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
      <div className="bch-container bch-statement__inner">
        <Heading className="bch-display bch-display--xl bch-statement__title" heading={data.heading} emphasis={data.emphasis} />
        <SideNote value={data.side_note} className="bch-statement__note" />
      </div>
    </section>
  );
}
