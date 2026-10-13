"use client";

import { motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { findSaved, loadIdeas, removeIdea, saveIdea, useIdeas } from "@/lib/ideas-client";
import { formatCount, formatLength, formatPercent } from "@/lib/metrics";
import type { Cluster, Status } from "@/lib/types";
import { SaveButton } from "./SaveButton";
import { Sheet } from "./Sheet";

const chipClass = (s: Status) => (s === "New this week" ? "chip chip-new" : s === "Rising now" ? "chip chip-rising" : "chip");

const EASE = [0.16, 1, 0.3, 1] as const;
const SWIPE_DISTANCE = 80;

type BriefRef = { id: number; weekStart: string; createdAt: string };

export function ClusterList({ clusters, brief }: { clusters: Cluster[]; brief: BriefRef }) {
  const reduce = useReducedMotion();
  const { ideas } = useIdeas();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // Keep the last opened cluster mounted while the sheet animates out.
  const [shownIndex, setShownIndex] = useState<number | null>(null);
  // Which cards this browser has opened. null until read, so the "new" dot never flashes.
  const [opened, setOpened] = useState<Set<number> | null>(null);
  const [coarse, setCoarse] = useState(false);
  const openedKey = `tr:opened:${brief.id}`;

  useEffect(() => {
    void loadIdeas();
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(openedKey);
      setOpened(new Set(raw ? (JSON.parse(raw) as number[]) : []));
    } catch {
      setOpened(new Set());
    }
  }, [openedKey]);

  const open = useCallback(
    (i: number) => {
      setShownIndex(i);
      setOpenIndex(i);
      setOpened((prev) => {
        const next = new Set(prev ?? []);
        next.add(i);
        try {
          localStorage.setItem(openedKey, JSON.stringify([...next]));
        } catch {
          // storage blocked: the dot just won't be remembered
        }
        return next;
      });
    },
    [openedKey],
  );

  // Email links look like /?b=<briefId>#topic-<n>; they only apply to the brief they were made for.
  useEffect(() => {
    const m = window.location.hash.match(/^#topic-(\d+)$/);
    if (!m || new URLSearchParams(window.location.search).get("b") !== String(brief.id)) return;
    const i = Number(m[1]) - 1;
    if (i < 0 || i >= clusters.length) return;
    // A timer, not requestAnimationFrame: email links usually open in a background tab, where frames are paused.
    const t = window.setTimeout(() => {
      document.getElementById(`topic-${i + 1}`)?.scrollIntoView({ block: "center" });
      open(i);
    }, 60);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (i: number) => {
    const saved = findSaved(ideas, brief.weekStart, clusters[i].name);
    if (saved) void removeIdea(saved.id);
    else void saveIdea(brief, i, clusters[i]);
  };

  const shown = shownIndex !== null ? clusters[shownIndex] : null;

  return (
    <>
      <ul className="cards">
        {clusters.map((c, i) => {
          const saved = !!findSaved(ideas, brief.weekStart, c.name);
          const isNew = opened !== null && !opened.has(i);
          return (
            <motion.li
              key={c.name}
              id={`topic-${i + 1}`}
              data-motion
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              // 40 ms between neighbours, as the motion guidelines suggest.
              transition={{ duration: 0.6, ease: EASE, delay: (i % 2) * 0.04 }}
            >
              <SwipeToSave enabled={coarse && !reduce} saved={saved} onSwipe={() => toggle(i)}>
                {(swiped) => (
                  <div className="card-shell">
                    <button
                      type="button"
                      className="card"
                      aria-haspopup="dialog"
                      onClick={() => {
                        if (!swiped.current) open(i);
                      }}
                    >
                      <span className="card-top">
                        <span className={chipClass(c.status)}>{c.status}</span>
                        {isNew && (
                          <span className="new-dot" title="New to you">
                            <span className="sr-only">New to you</span>
                          </span>
                        )}
                      </span>
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
                    <div className="card-save">
                      <SaveButton saved={saved} onToggle={() => toggle(i)} />
                    </div>
                  </div>
                )}
              </SwipeToSave>
            </motion.li>
          );
        })}
      </ul>
      <Sheet open={openIndex !== null} onClose={() => setOpenIndex(null)} title={shown?.name ?? ""}>
        {shown && shownIndex !== null && (
          <ClusterDetail
            c={shown}
            saved={!!findSaved(ideas, brief.weekStart, shown.name)}
            onToggle={() => toggle(shownIndex)}
          />
        )}
      </Sheet>
    </>
  );
}

/**
 * Touch screens only: drag a card to the right to save it. Vertical scrolling is untouched (the
 * gesture locks to one axis), and the bookmark button always works as the alternative.
 */
function SwipeToSave({
  enabled,
  saved,
  onSwipe,
  children,
}: {
  enabled: boolean;
  saved: boolean;
  onSwipe: () => void;
  children: (swiped: { current: boolean }) => ReactNode;
}) {
  const x = useMotionValue(0);
  const hint = useTransform(x, [0, SWIPE_DISTANCE], [0, 1]);
  const swiped = useRef(false);

  return (
    <div className="swipe-wrap">
      {enabled && (
        <motion.span className="swipe-hint" style={{ opacity: hint }} aria-hidden="true">
          {saved ? "Release to remove" : "Release to save"}
        </motion.span>
      )}
      <motion.div
        className="swipe-drag"
        style={{ x }}
        drag={enabled ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: 0.5 }}
        dragSnapToOrigin
        onDragStart={() => {
          swiped.current = true;
        }}
        onDragEnd={(_, info) => {
          if (info.offset.x > SWIPE_DISTANCE) onSwipe();
          // a drag can end with a click on the card; swallow that one
          setTimeout(() => (swiped.current = false), 80);
        }}
      >
        {children(swiped)}
      </motion.div>
    </div>
  );
}

function ClusterDetail({ c, saved, onToggle }: { c: Cluster; saved: boolean; onToggle: () => void }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="detail"
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div>
        <div className="detail-top">
          <span className={chipClass(c.status)}>{c.status}</span>
          <SaveButton saved={saved} onToggle={onToggle} labelled />
        </div>
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
