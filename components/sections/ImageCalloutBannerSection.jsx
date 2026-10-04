import Heading from "./Heading";
import Html from "../Html";
import SectionCta from "./SectionCta";

/**
 * `image-callout-banner` blueprint → full-width rounded background image
 * with floating callouts (Figma 1268-2811, extended for 339-2041). Data:
 * background_image, background_alt, background_treatment "none"|"tint",
 * tint_color, callouts [{position "0" (left) | "1" (right), variant
 * "card"|"media-card"|"feature", align "center"|"top"|"bottom", color,
 * icon, icon_width, title, content, cta_*}]. "tint" recolors the photo to
 * a single hue via mix-blend color. Cards default to the design's frosted
 * light glass; an authored color replaces it. Mobile-first: callouts stack
 * in flow over the image; ≥992px they float into their slots.
 */
export default function ImageCalloutBannerSection({ section }) {
  const data = section.data ?? {};
  const callouts = (data.callouts ?? []).filter(
    (callout) => callout?.title || callout?.content,
  );

  if (!data.background_image?.url && !callouts.length) {
    return null;
  }

  return (
    <section id={section.anchor || undefined} className="image-callout sx-section">
      <div className="sx-content">
        {/* The frame is the card AND the media: media_width "full" bleeds it
            past the content column and the page gutter alike. */}
        <div className="image-callout__frame sx-media">
          {data.background_image?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="image-callout__bg"
              src={data.background_image.url}
              alt={data.background_alt || data.background_image.alt || ""}
            />
          ) : null}
          {data.background_treatment === "tint" ? (
            <div
              className="image-callout__tint"
              style={data.tint_color ? { background: data.tint_color } : undefined}
              aria-hidden
            />
          ) : null}

          <div className="image-callout__cards">
            {callouts.map((callout, index) => {
              const variant = callout.variant || "card";
              const align = callout.align || "center";
              const classes = [
                "image-callout__card",
                `image-callout__card--slot-${String(callout.position) === "1" ? "1" : "0"}`,
                variant !== "card" ? `image-callout__card--${variant}` : null,
                align !== "center" ? `image-callout__card--align-${align}` : null,
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <div
                  key={index}
                  className={classes}
                  style={
                    callout.color
                      ? { background: callout.color, backdropFilter: "none" }
                      : undefined
                  }
                >
                  {callout.icon?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className="image-callout__icon"
                      src={callout.icon.url}
                      alt=""
                      style={
                        callout.icon_width
                          ? { width: `${callout.icon_width}px` }
                          : undefined
                      }
                    />
                  ) : null}
                  {callout.title ? (
                    <Heading as="h3" className="image-callout__title" heading={callout.title} />
                  ) : null}
                  <Html className="image-callout__content" value={callout.content} />
                  <SectionCta data={callout} className="image-callout__cta" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
