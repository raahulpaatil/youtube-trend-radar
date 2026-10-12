"use client";

import { motion, useReducedMotion } from "motion/react";
import { intro } from "@/lib/intro";
import { Appear, AppearLink } from "./Appear";
import { HeroVideo } from "./HeroVideo";

type Props = {
  regionName: string;
  dataAsOf: string;
  stale: boolean;
  clusters: number;
  videos: number;
  channels: number;
  weekLabel: string;
};

const EASE = [0.16, 1, 0.3, 1] as const;

function Sparkle() {
  return (
    <motion.svg
      className="badge-star"
      viewBox="0 0 24 24"
      fill="#fff"
      aria-hidden="true"
      data-motion
      {...useIntroMotion({ opacity: 0, scale: 0.2, rotate: -50 }, { opacity: 1, scale: [0.2, 1.2, 1], rotate: [-50, 8, 0] }, 0.9, 0.28)}
    >
      <path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z" />
    </motion.svg>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useIntroMotion(from: any, to: any, duration: number, delay: number) {
  const reduce = useReducedMotion();
  const play = !reduce && !intro.played;
  return { initial: play ? from : false, animate: to, transition: { duration, delay, ease: EASE } };
}

function Line({ delay, children }: { delay: number; children: React.ReactNode }) {
  return (
    <span className="headline-line">
      <Appear as="span" kind="mask" delay={delay} className="headline-inner">
        {children}
      </Appear>
    </span>
  );
}

function Em({ children }: { children: React.ReactNode }) {
  return (
    <motion.em
      data-motion
      {...useIntroMotion({ opacity: 0.35, filter: "blur(4px)" }, { opacity: 1, filter: "blur(0px)" }, 1.2, 0.72)}
    >
      {children}
    </motion.em>
  );
}

export function BriefHero({ regionName, dataAsOf, stale, clusters, videos, channels, weekLabel }: Props) {
  return (
    <section className="hero-page" aria-labelledby="hero-title">
      <HeroVideo />

      <div className="hero">
        <div className="hero-copy">
          <Appear as="span" kind="pop" delay={0.22} className="badge">
            <Sparkle />
            {weekLabel}
          </Appear>

          <h1 id="hero-title" className="display">
            <Line delay={0.42}>
              What&rsquo;s <Em>clustering</Em> on YouTube
            </Line>
            <Line delay={0.62}>this week, in one brief.</Line>
          </h1>

          <Appear as="p" kind="soft" delay={0.82} duration={1.25} className="lede">
            Fresh YouTube data for {regionName}, grouped into topic clusters with the formats that are winning. Data as
            of {dataAsOf}.
          </Appear>

          {stale && (
            <p className="hero-notice" role="status">
              YouTube could not be reached, so this brief uses older saved data.
            </p>
          )}

          <div className="hero-actions">
            <AppearLink href="#clusters" kind="btn" delay={0.96} className="btn btn-solid">
              See the clusters
            </AppearLink>
            <AppearLink href="/weeks" kind="side" delay={1.1} className="btn btn-ghost">
              Earlier weeks
            </AppearLink>
          </div>
        </div>
      </div>

      <div className="stats">
        <Appear as="div" kind="stat" delay={1.12} className="stat">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <defs>
              <linearGradient id="pill-a" x1="3" y1="2" x2="14" y2="22" gradientUnits="userSpaceOnUse">
                <stop offset="0.38" stopColor="#ffffff" />
                <stop offset="0.62" stopColor="#3a3a3a" />
              </linearGradient>
              <linearGradient id="pill-b" x1="3" y1="2" x2="14" y2="22" gradientUnits="userSpaceOnUse">
                <stop offset="0.38" stopColor="#3a3a3a" />
                <stop offset="0.62" stopColor="#ffffff" />
              </linearGradient>
            </defs>
            <rect x="3.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#pill-a)" />
            <rect x="13.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#pill-b)" />
            <rect x="9.2" y="10.9" width="5.6" height="2.2" rx="1.1" fill="#4a4a4a" />
          </svg>
          <span>{clusters} topic clusters this week</span>
        </Appear>

        <Appear as="div" kind="stat" delay={1.28} className="stat">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="6.2" fill="#ffffff" />
            <path d="M12 7.1v7.4M8.15 12.35L12 16.2l3.85-3.85" fill="none" stroke="#111" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{videos} supporting videos linked</span>
        </Appear>

        <Appear as="div" kind="stat" delay={1.44} className="stat">
          <svg className="stat-icon-wide" viewBox="0 0 40 22" aria-hidden="true">
            <circle cx="10.2" cy="11" r="9.2" fill="#2b2b2b" />
            <path d="M5.4 5.6l2.3 1.6-2.7 1.7zM15 5.6l-2.3 1.6 2.7 1.7z" fill="#f4f4f4" />
            <ellipse cx="10.2" cy="12.1" rx="4.15" ry="3.7" fill="#f4f4f4" />
            <circle cx="8.7" cy="11.4" r="0.7" fill="#1a1a1a" />
            <circle cx="11.7" cy="11.4" r="0.7" fill="#1a1a1a" />
            <circle cx="20.2" cy="11" r="9.2" fill="#ffffff" />
            <circle cx="17.6" cy="9.6" r="1.7" fill="#111" />
            <circle cx="22.8" cy="9.6" r="1.7" fill="#111" />
            <ellipse cx="20.2" cy="12.7" rx="1.1" ry="0.8" fill="#111" />
            <path d="M17.6 14.8Q20.2 17.2 22.8 14.8" fill="none" stroke="#111" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="30.2" cy="11" r="9.2" fill="#f26b1d" />
            <text x="30.2" y="15.1" fontSize="12.5" fontWeight="700" textAnchor="middle" fill="#ffffff" fontFamily="Inter, system-ui, sans-serif">
              e
            </text>
          </svg>
          <span>{channels} different channels covered</span>
        </Appear>
      </div>
    </section>
  );
}
