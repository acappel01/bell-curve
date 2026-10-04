/**
 * Emits a JSON-LD block.
 *
 * `dangerouslySetInnerHTML` is the only way to put raw JSON inside a script
 * tag — React would otherwise escape it into text and the crawler would see
 * nothing. Same mechanism the root layout already uses for the operator's
 * custom head scripts, and the same trust model: the payload is built here
 * from API data, never from a visitor.
 *
 * `<` is escaped anyway. A string in the data containing `</script>` would
 * otherwise close the tag early and turn the rest of the page into markup —
 * and compound copy is operator-editable, so "it will never contain that" is
 * an assumption with an admin form behind it.
 */
export default function JsonLd({ data }) {
  if (!data) {
    return null;
  }

  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
