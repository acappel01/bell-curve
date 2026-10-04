import Html from "../Html";
import Heading from "./Heading";
import { toPlainText } from "@/lib/richText";

/**
 * `video-embed` blueprint → responsive YouTube / Vimeo iframe band. Data:
 * heading, caption, video_url (watch-page URL, converted to the embed
 * form), poster_image (unused by the iframe embed), theme. Unrecognized
 * URLs render a plain link instead of an iframe.
 */
function embedUrl(url) {
  if (!url) {
    return null;
  }

  const youtube = url.match(
    /(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/,
  );

  if (youtube) {
    return `https://www.youtube-nocookie.com/embed/${youtube[1]}`;
  }

  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);

  if (vimeo) {
    return `https://player.vimeo.com/video/${vimeo[1]}`;
  }

  return null;
}

export default function VideoEmbedSection({ section }) {
  const data = section.data ?? {};

  if (!data.video_url) {
    return null;
  }

  const src = embedUrl(data.video_url);

  return (
    <section
      id={section.anchor || undefined}
      className={`video-embed sx-section video-embed--${data.theme || "light"}`}
    >
      <div className="video-embed__inner sx-content">
        <Heading className="video-embed__heading" heading={data.heading} />
        {src ? (
          <div className="video-embed__frame">
            <iframe
              src={src}
              title={toPlainText(data.heading) || "Video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
        ) : (
          <a className="video-embed__link" href={data.video_url} target="_blank" rel="noopener noreferrer">
            Watch the video
          </a>
        )}
        <Html as="p" inline className="video-embed__caption" value={data.caption} />
      </div>
    </section>
  );
}
