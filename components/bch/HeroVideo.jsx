"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Muted looping background video with the controls the client brief requires:
 * a visible, keyboard-reachable Pause/Play button, the still as poster, and no
 * autoplay for visitors who ask for reduced motion (they get the poster and can
 * still press Play).
 *
 * `sources` is `[{ url, type }]`, best format first (WebM, then MP4).
 */
export default function HeroVideo({ sources, poster }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!video || reduce) {
      return;
    }

    video.play().then(
      () => setPlaying(true),
      () => setPlaying(false)
    );
  }, []);

  const toggle = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (video.paused) {
      video.play().then(() => setPlaying(true));
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <>
      <video
        ref={videoRef}
        className="bch-hero__video"
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      >
        {sources.map((source) => (
          <source key={source.url} src={source.url} type={source.type} />
        ))}
      </video>
      <button type="button" className="bch-hero__pause" onClick={toggle} aria-pressed={!playing}>
        <span className="bch-hero__pause-icon" aria-hidden="true">
          {playing ? "❚❚" : "▶"}
        </span>
        {playing ? "Pause video" : "Play video"}
      </button>
    </>
  );
}
