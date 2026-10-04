/**
 * Normalizes admin-authored copy into an HTML string.
 *
 * Admins type into rich editors, so a field's value is markup
 * (`Longevity<br />Protocols`, `<p>…</p>`). Older values predating the rich
 * inputs are plain text; those get their newlines converted to <br /> so
 * legacy content keeps its line breaks.
 *
 * The backend guarantees the two field kinds it emits (see the API contract
 * in prx-backend `docs/frontend/dev.md` §4a): inline fields carry no block
 * markup, prose fields carry their own blocks. `toInlineHtml` re-asserts the
 * inline half locally rather than trusting it, because this app also renders
 * content written before that guarantee existed, and a stray block node
 * inside a heading is invalid HTML that browsers paper over silently.
 *
 * Trust model: this is permission-gated admin content from the install's own
 * backend — the same path as FAQ answers and custom scripts. Never route
 * user-generated content through it.
 */

const HTML_PATTERN = /<[a-z][\s\S]*>/i;

/** Block tags that must not survive inside a heading or label element. */
const BLOCK_PATTERN = /<\/?(p|div|h[1-6]|ul|ol|li|blockquote|pre|table|thead|tbody|tr|td|th|figure|figcaption|section|article)\b[^>]*>/gi;

/** True when the value already contains markup and should pass through as-is. */
export function looksLikeHtml(value) {
  return HTML_PATTERN.test(value ?? "");
}

/**
 * Flattens a ProseMirror/TipTap document node to text.
 *
 * WHY THIS EXISTS, because it should not have to. Every normalizer below used
 * to reach `String(value)` on whatever arrived, and `String({})` is the literal
 * text `[object Object]` — which is what a visitor saw in an <h2> on the live
 * home page. A rich editor stores its document as a node TREE, so a field that
 * was authored as rich text and later re-declared as a plain one keeps its old
 * object shape in the database forever, and nothing between there and the page
 * looked at the type.
 *
 * A doc reaching here is a data fault, not an authoring path — the backend's
 * contract is HTML strings. So this recovers the words rather than trying to
 * reproduce the formatting: block nodes become newlines (which `toHtml` turns
 * into <br />), marks are dropped. Losing a bold is the right trade against
 * printing `[object Object]`, and the honest fix is upstream in the data.
 */
function documentToText(node) {
  if (Array.isArray(node)) {
    return node.map(documentToText).join("");
  }

  if (node === null || typeof node !== "object") {
    return node === null || node === undefined ? "" : String(node);
  }

  if (typeof node.text === "string") {
    return node.text;
  }

  const inner = documentToText(node.content ?? []);

  // `hardBreak` carries no content of its own, so it has to be recognised
  // rather than walked, or a deliberate line break silently disappears.
  if (node.type === "hardBreak") {
    return "\n";
  }

  return BLOCK_NODES.has(node.type) ? `${inner}\n` : inner;
}

/** Node types whose boundary is a line break once flattened. */
const BLOCK_NODES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "listItem",
  "bulletList",
  "orderedList",
  "codeBlock",
]);

/**
 * Everything below takes `unknown`, so this is the one place that decides what
 * a non-string is. Returning "" for an unrecognised object is deliberate: a
 * section's emptiness guard then treats it as absent and renders nothing, which
 * is the correct outcome for a value nobody can read anyway.
 */
function toSourceString(value) {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    return documentToText(value).replace(/\n{2,}/g, "\n").trim();
  }

  return String(value);
}

/**
 * Wraps every top-level `<table>` so a wide one scrolls inside its own box.
 *
 * A table cannot be made to scroll without a wrapper — `overflow-x` on the
 * table itself needs `display: block`, which drops the table formatting
 * context and wrecks the layout. So the wrapper is added here rather than
 * asked of the author, who is writing in a rich editor and has no way to
 * supply one.
 *
 * This matters because knowledge-base monographs carry dosing-titration
 * tables — 82 of the 102 imported ones do — and a table wider than the phone
 * viewport otherwise makes the whole PAGE scroll sideways, which the project's
 * responsive rule forbids.
 */
function wrapTables(html) {
  return html.replace(/<table\b/gi, '<div class="rich-text__scroll"><table')
    .replace(/<\/table>/gi, "</table></div>");
}

/**
 * @param {string|null|undefined} value
 * @returns {string|null} HTML ready for injection, or null when empty.
 */
export function toHtml(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const text = toSourceString(value);

  if (text === "") {
    return null;
  }

  if (!looksLikeHtml(text)) {
    return text.replace(/\n/g, "<br />");
  }

  // The guard must be as case-insensitive as the transform, or `<TABLE` skips
  // wrapping and reverts to the sideways-scrolling page this exists to stop.
  // Nested tables would produce mismatched wrappers, but the prose contract
  // has no way to author one — the editor's table tool inserts a flat grid.
  return /<table\b/i.test(text) ? wrapTables(text) : text;
}

/**
 * Same as toHtml, but flattened to inline markup — for values injected into
 * an element this app chooses (a heading, a label, a list item). Block
 * boundaries become <br /> so a multi-paragraph value keeps its line
 * structure instead of running together.
 *
 * @param {string|null|undefined} value
 * @returns {string|null} Inline HTML, or null when nothing readable remains.
 */
export function toInlineHtml(value) {
  const html = toHtml(value);

  if (html === null) {
    return null;
  }

  const flattened = html
    .replace(/<br\s*\/?>/gi, "<br />")
    .replace(BLOCK_PATTERN, (tag) => (tag.startsWith("</") ? "<br />" : ""))
    .replace(/(\s*<br \/>\s*){2,}/g, "<br />")
    .replace(/^(\s*<br \/>)+/, "")
    .replace(/(<br \/>\s*)+$/, "")
    .trim();

  // A value that was only empty markup renders nothing rather than an empty
  // element, so a section's own emptiness guard still sees it as absent.
  return flattened.replace(/<[^>]*>/g, "").replace(/&nbsp;|\s/g, "") === "" &&
    !/<img|<br \/>/i.test(flattened)
    ? null
    : flattened;
}

/**
 * Strips markup to readable text, for the places authored copy lands in an
 * attribute rather than the document: `alt`, `title`, `aria-label`. Injecting
 * HTML there would print the tags, since attributes have no markup context.
 *
 * @param {string|null|undefined} value
 * @returns {string} Plain text, empty when there is none.
 */
export function toPlainText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return toSourceString(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
