/**
 * Field definitions for the BCH lead forms.
 *
 * A form is a list of `{ name, label, kind, required, width, options,
 * placeholder, autocomplete, help }` — the repeater an operator edits on the
 * `bch-form` section. `normalizeFields` fills defaults and drops anything
 * unusable, so a half-authored row never renders a broken control.
 *
 * Kinds: text, email, tel, textarea, select, state, checkbox.
 */

export const FIELD_KINDS = ["text", "email", "tel", "textarea", "select", "state", "checkbox"];

// Two-letter codes the provider network is licensed by; DC included.
export const US_STATES =
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(
    " "
  );

const AUTOCOMPLETE = {
  first_name: "given-name",
  last_name: "family-name",
  email: "email",
  phone: "tel",
  state: "address-level1",
};

export function normalizeFields(fields) {
  return (fields ?? [])
    .filter((field) => field?.name && field?.label)
    .map((field) => {
      const kind = FIELD_KINDS.includes(field.kind) ? field.kind : "text";

      return {
        name: String(field.name),
        label: field.label,
        kind,
        required: field.required === true,
        width: field.width === "half" ? "half" : "full",
        options: (field.options ?? []).map((option) =>
          typeof option === "string" ? { value: option, label: option } : option
        ),
        placeholder: field.placeholder ?? null,
        help: field.help ?? null,
        autocomplete: field.autocomplete ?? AUTOCOMPLETE[field.name] ?? "off",
      };
    })
    .filter((field) => field.kind !== "select" || field.options.length > 0);
}
