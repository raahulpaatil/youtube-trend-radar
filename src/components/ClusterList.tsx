"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { formatCount, formatLength, formatPercent } from "@/lib/metrics";
import type { Cluster, Status } from "@/lib/types";
import { Sheet } from "./Sheet";

const chipClass = (s: Status) => (s === "New this week" ? "chip chip-new" : s === "Rising now" ? "chip chip-rising" : "chip");

const EASE = [0.16, 1, 0.3, 1] as const;

export function ClusterList({ clusters }: { clusters: Cluster[] }) {
  const reduce = useReducedMotion();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // Keep the last opened cluster mounted while the sheet animates out.
  const [shown, setShown] = useState<Cluster | null>(null);

  return (
    <>
      <ul className="cards">
        {clusters.map((c, i) => (
          <motion.li
            key={c.name}
            data-motion
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            // 40 ms between neighbours, as the motion guidelines suggest.
            transition={{ duration: 0.6, ease: EASE, delay: (i % 2) * 0.04 }}
          >
            <button
              type="button"
              className="card"
              aria-haspopup="dialog"
              onClick={() => {
                setShown(c);
                setOpenIndex(i);
              }}
            >
              <span className={chipClass(c.status)}>{c.status}</span>
              <h3>{c.name}</h3>
              <p className="why">{c.whyNow}</p>
              <span className="numbers">
                <span className="num">
                  {formatCount(c.stats.medianViewsPerHour)}
                  <span className="num-label">views per hour</span>
                </span>
                <span className="num">
                  {c.stats.videos}
                  <span className="num-label">videos, {c.stats.channels} channels</span>
                </span>
                <span className="num">
                  {formatLength(c.stats.medianLengthSec)}
                  <span className="num-label">typical length</span>
                </span>
              </span>
            </button>
          </motion.li>
        ))}
      </ul>
      <Sheet open={openIndex !== null} onClose={() => setOpenIndex(null)} title={shown?.name ?? ""}>
        {shown && <ClusterDetail c={shown} />}
      </Sheet>
    </>
  );
}

function ClusterDetail({ c }: { c: Cluster }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="detail"
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div>
        <span className={chipClass(c.status)}>{c.status}</span>
        <p className="why">{c.whyNow}</p>
      </div>

      <div className="stat-grid">
        <Tile label="Videos" value={String(c.stats.videos)} />
        <Tile label="Different channels" value={String(c.stats.channels)} />
        <Tile label="Median views per hour" value={formatCount(c.stats.medianViewsPerHour)} />
        <Tile label="Median length" value={formatLength(c.stats.medianLengthSec)} />
        <Tile label="Engagement (likes + comments)" value={formatPercent(c.stats.medianEngagement)} />
      </div>

      <div>
        <div className="section-label">Winning formats</div>
        <div className="formats">
          {c.winningFormats.map((f) => (
            <span key={f.format} className="format">
              {f.format} · {f.count} {f.count === 1 ? "video" : "videos"}
            </span>
          ))}
        </div>
      </div>

      <div>
        <div className="section-label">Suggested angle</div>
        <p>{c.suggestedAngle}</p>
      </div>

      <div>
        <div className="section-label">Supporting videos</div>
        <ul className="videos">
          {c.videos.map((v) => (
            <li key={v.id}>
              <a
                className="video"
                href={`https://www.youtube.com/watch?v=${v.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="video-title">{v.title}</span>
                <span className="video-meta">
                  {v.channelTitle} · {formatCount(v.views)} views · {formatCount(v.viewsPerHour)} per hour ·{" "}
                  {formatLength(v.durationSec)} · {v.format}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-tile">
      <div className="num">{value}</div>
      <span className="num-label">{label}</span>
    </div>
  );
}
