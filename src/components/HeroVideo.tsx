"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260818_072341_50851634-bbc3-4c33-9acc-7647d4db44aa.mp4";

/**
 * Full-bleed hero video. It only plays while it is on screen and the tab is visible,
 * and it stays off for reduced motion and data-saver, so it never costs anything off the hero.
 */
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    setEnabled(!reduce && !saveData);
  }, [reduce]);

  useEffect(() => {
    const v = ref.current;
    if (!v || !enabled) return;
    let visible = true;
    const sync = () => {
      if (visible && !document.hidden) v.play().catch(() => {});
      else v.pause();
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      sync();
    });
    io.observe(v);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [enabled]);

  if (!enabled) return <div className="hero-photo" aria-hidden="true" />;

  return (
    <video
      ref={ref}
      className={`hero-photo${ready ? " is-ready" : ""}`}
      src={SRC}
      muted
      loop
      playsInline
      autoPlay
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
      onLoadedData={() => setReady(true)}
    />
  );
}
