"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadIdeas, removeIdea, setStage, useIdeas } from "@/lib/ideas-client";
import { formatCount, formatLength } from "@/lib/metrics";
import { BUCKET_ORDER, bucketOf, relativeTime } from "@/lib/relative-time";
import { STAGES, type Idea, type Stage } from "@/lib/types";

const STAGE_LABEL: Record<Stage, string> = { saved: "Saved", filming: "Filming", published: "Published" };

/** Server-rendered list first, then the live list once it has loaded. Time wording is worked out here, in the browser. */
export function SavedIdeas({ initial }: { initial: Idea[] }) {
  const { ideas: live, status } = useIdeas();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    void loadIdeas(true);
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const ideas = status === "ready" ? live : initial;

  if (now === null) return <p className="sub">Loading your saved ideas…</p>;

  if (ideas.length === 0 && status !== "loading") {
    return (
      <div className="empty">
        <h2>Nothing saved yet</h2>
        <p>
          Tap the bookmark on any topic in this week&rsquo;s brief to keep it here. You&rsquo;ll see when you saved it
          and when it was suggested.
        </p>
        <div className="empty-actions">
          <Link href="/#clusters" className="btn btn-solid">
            Open this week&rsquo;s brief
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="idea-groups">
      {BUCKET_ORDER.map((bucket) => {
        const items = ideas.filter((i) => bucketOf(new Date(i.savedAt).getTime(), now) === bucket);
        if (items.length === 0) return null;
        return (
          <section key={bucket} aria-labelledby={`bucket-${bucket}`}>
            <h2 id={`bucket-${bucket}`} className="bucket-title">
              {bucket} <span className="bucket-count">{items.length}</span>
            </h2>
            <ul className="idea-list">
              {items.map((idea) => (
                <li key={idea.id}>
                  <IdeaCard idea={idea} now={now} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function IdeaCard({ idea, now }: { idea: Idea; now: number }) {
  const c = idea.cluster;
  return (
    <article className="idea">
      <div className="idea-head">
        <h3>{c.name}</h3>
        <button type="button" className="idea-remove" onClick={() => void removeIdea(idea.id)} aria-label={`Remove ${c.name} from saved ideas`}>
          Remove
        </button>
      </div>
      <p className="why">{c.whyNow}</p>
      <p className="idea-times">
        <time dateTime={idea.savedAt}>Saved {relativeTime(new Date(idea.savedAt).getTime(), now)}</time>
        <span aria-hidden="true"> · </span>
        <time dateTime={idea.suggestedAt}>Suggested {relativeTime(new Date(idea.suggestedAt).getTime(), now)}</time>
      </p>

      <div className="stages" role="group" aria-label={`Stage for ${c.name}`}>
        {STAGES.map((s) => (
          <button key={s} type="button" className="stage-btn" aria-pressed={idea.stage === s} onClick={() => void setStage(idea.id, s)}>
            {STAGE_LABEL[s]}
          </button>
        ))}
      </div>

      <details className="idea-more">
        <summary>Angle and {c.videos.length} videos</summary>
        <p className="idea-angle">{c.suggestedAngle}</p>
        <ul className="videos">
          {c.videos.map((v) => (
            <li key={v.id}>
              <a className="video" href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer">
                <span className="video-title">{v.title}</span>
                <span className="video-meta">
                  {v.channelTitle} · {formatCount(v.viewsPerHour)} per hour · {formatLength(v.durationSec)} · {v.format}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}
