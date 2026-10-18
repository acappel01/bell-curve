/**
 * Small uppercase note with a rose rule beneath ("REAL SCIENCE. / CLEARER
 * ANSWERS."). Line breaks in the authored value are kept, since the stacked
 * lines are part of the look.
 */
export default function SideNote({ value, className = "" }) {
  if (!value) {
    return null;
  }

  const lines = String(value).split(/\n|<br\s*\/?>/i);

  return (
    <p className={`bch-side-note ${className}`.trim()}>
      {lines.map((line, index) => (
        <span key={index}>
          {line}
          {index < lines.length - 1 ? <br /> : null}
        </span>
      ))}
    </p>
  );
}
