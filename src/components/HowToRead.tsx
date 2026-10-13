"use client";

import { useState } from "react";
import { Sheet } from "./Sheet";

/** A short plain-English explainer for anyone seeing the numbers for the first time. */
export function HowToRead() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-ghost help-btn" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span aria-hidden="true">?</span> How to read this
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="How to read this">
        <dl className="howto">
          <dt>Views per hour</dt>
          <dd>How fast a video is gaining views since it was posted. The card shows the typical value across the cluster. Higher means it is catching on faster.</dd>
          <dt>The tags</dt>
          <dd>
            <b>New this week</b> wasn&rsquo;t there last week. <b>Rising now</b> was there and has sped up. <b>Still going</b> was there at a similar pace. <b>First week, no comparison</b> means there is no earlier week yet.
          </dd>
          <dt>Videos and channels</dt>
          <dd>How many videos are in the cluster and how many different channels made them. Several channels covering the same thing is a stronger signal than one viral video.</dd>
          <dt>Typical length and engagement</dt>
          <dd>The middle video length, and the share of viewers who liked or commented. Both are worked out from YouTube&rsquo;s numbers, never guessed.</dd>
          <dt>What it doesn&rsquo;t do</dt>
          <dd>It shows what has already happened. It never predicts what will trend next. What to film is your call.</dd>
        </dl>
      </Sheet>
    </>
  );
}
