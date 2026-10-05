"use client";

import { useState } from "react";
import { ProductImage } from "./ProductCard";

/**
 * Detail-page images: one large image and a thumbnail row when there is more
 * than one. No zoom or lightbox; product photography for BCH is still to come,
 * and the placeholder tile stands in until it does.
 */
export default function Gallery({ item }) {
  const images = [item.hero_image_url, ...(item.gallery ?? [])].filter(
    (url, index, list) => url && list.indexOf(url) === index,
  );
  const [active, setActive] = useState(0);

  return (
    <div className="bch-gallery">
      <ProductImage item={item} src={images[active] ?? null} className="bch-gallery__main" priority />

      {images.length > 1 ? (
        <div className="bch-gallery__thumbs" role="group" aria-label="Product images">
          {images.map((url, index) => (
            <button
              key={url}
              type="button"
              aria-pressed={index === active}
              aria-label={`Image ${index + 1} of ${images.length}`}
              onClick={() => setActive(index)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
