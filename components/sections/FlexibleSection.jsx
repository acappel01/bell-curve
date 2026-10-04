import { productHref } from "@/lib/routes";
import Html from "../Html";
import Heading from "./Heading";

/**
 * Generic renderer for admin-defined flexible section types (milestone 3).
 *
 * The envelope carries a `schema` field-kind map ({key: {kind}} — repeaters
 * nest {kind: "repeater", fields: {...}}), so any type an admin invents
 * renders acceptably without a bespoke component. Register a real component
 * in SectionRenderer (keyed on the type slug) whenever a flexible type
 * deserves exact theme markup — this is the fallback, not the ceiling.
 *
 * `richtext` and `svg` values are injected as HTML: both are authored in the
 * backend admin and svg markup is sanitized server-side on save + read.
 */
export default function FlexibleSection({ section }) {
  const data = section.data ?? {};
  const schema = section.schema ?? {};

  return (
    <section
      id={section.anchor || undefined}
      className={`flexible-section sx-section flexible--${section.type}`}
    >
      <div className="flexible-inner sx-content">
        {Object.entries(schema).map(([key, field]) => (
          <FlexibleField key={key} fieldKey={key} field={field} value={data[key]} />
        ))}
      </div>
    </section>
  );
}

function FlexibleField({ fieldKey, field, value }) {
  if (value === null || value === undefined || value === "" || (Array.isArray(value) && !value.length)) {
    return null;
  }

  const className = `flexible-field flexible-field--${fieldKey}`;

  switch (field.kind) {
    case "richtext":
      return <Html className={className} value={value} />;

    case "svg":
      return <div className={className} dangerouslySetInnerHTML={{ __html: value }} />;

    case "image":
      return value?.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={className}
          src={value.url}
          alt={value.alt || ""}
          width={value.width || undefined}
          height={value.height || undefined}
        />
      ) : null;

    case "link":
      return value?.url ? (
        <a className={className} href={value.url} target={value.target || undefined}>
          {value.label || value.url}
        </a>
      ) : null;

    case "boolean":
      return null;

    case "products":
    case "packages":
      return (
        <ul className={className}>
          {value.map((item) => (
            <li key={item.slug ?? item.id}>
              <a href={field.kind === "products" ? productHref(item.slug) : "#"}>
                {item.hero_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.hero_image_url} alt={item.name || ""} loading="lazy" />
                ) : null}
                <span>{item.name}</span>
              </a>
            </li>
          ))}
        </ul>
      );

    case "repeater":
      return (
        <ul className={className}>
          {value.map((item, index) => (
            <li key={index}>
              {Object.entries(field.fields ?? {}).map(([childKey, child]) => (
                <FlexibleField
                  key={childKey}
                  fieldKey={`${fieldKey}-${childKey}`}
                  field={child}
                  value={item?.[childKey]}
                />
              ))}
            </li>
          ))}
        </ul>
      );

    default:
      // Text fields on admin-defined types are authored HTML like every other
      // CMS string. The heading branch flattens to inline markup so a pasted
      // block can't nest inside the <h2> this component picks for it.
      return /heading|title/.test(fieldKey) ? (
        <Heading className={className} heading={value} />
      ) : (
        <Html as="p" inline className={className} value={value} />
      );
  }
}
