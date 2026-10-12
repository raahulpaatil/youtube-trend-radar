"use client";

import { useState } from "react";
import { formatCount, formatLength, formatPercent } from "@/lib/metrics";
import type { Cluster, Status } from "@/lib/types";
import { Sheet } from "./Sheet";

const chipClass = (s: Status) => (s === "New this week" ? "chip chip-new" : s === "Rising now" ? "chip chip-rising" : "chip");

export function ClusterList({ clusters }: { clusters: Cluster[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // Keep the last opened cluster mounted while the sheet animates out.
  const [shown, setShown] = useState<Cluster | null>(null);

  return (
    <>
      <ul className="cards">
        {clusters.map((c, i) => (
          <li key={c.name}>
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
              <h2>{c.name}</h2>
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
          </li>
        ))}
      </ul>
      <Sheet open={openIndex !== null} onClose={() => setOpenIndex(null)} title={shown?.name ?? ""}>
        {shown && <ClusterDetail c={shown} />}
      </Sheet>
    </>
  );
}

function ClusterDetail({ c }: { c: Cluster }) {
  return (
    <div className="detail">
      <div>
        <span className={chipClass(c.status)}>{c.status}</span>
        <p className="why" style={{ marginTop: "0.5rem", color: "var(--text)" }}>
          {c.whyNow}
        </p>
      </div>

      <div className="stats">
        <Stat label="Videos" value={String(c.stats.videos)} />
        <Stat label="Different channels" value={String(c.stats.channels)} />
        <Stat label="Median views per hour" value={formatCount(c.stats.medianViewsPerHour)} />
        <Stat label="Median length" value={formatLength(c.stats.medianLengthSec)} />
        <Stat label="Engagement (likes + comments)" value={formatPercent(c.stats.medianEngagement)} />
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
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="num">{value}</div>
      <span className="num-label">{label}</span>
    </div>
  );
}
