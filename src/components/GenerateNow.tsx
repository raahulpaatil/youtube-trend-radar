"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { StepEvent, StepName, StepState } from "@/lib/types";
import { Sheet } from "./Sheet";

const STEPS: { key: StepName; label: string }[] = [
  { key: "fetching", label: "Fetching" },
  { key: "analysing", label: "Analysing" },
  { key: "saving", label: "Saving" },
  { key: "emailing", label: "Emailing" },
];

type Phase = "idle" | "running" | "finished";
type StepView = Partial<Record<StepName, { state: StepState; message?: string }>>;

export function GenerateNow({ className = "btn btn-solid" }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [alsoEmail, setAlsoEmail] = useState(false);
  const [steps, setSteps] = useState<StepView>({});
  const [blocked, setBlocked] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  async function start() {
    setPhase("running");
    setSteps({});
    setBlocked(null);
    setSucceeded(false);
    let ok = false;
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alsoEmail }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setBlocked(data.error ?? "Something went wrong starting the run. Try again in a minute.");
        setPhase("idle");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const evt = JSON.parse(line) as ({ type: "step" } & StepEvent) | { type: "end"; ok: boolean };
          if (evt.type === "step") {
            setSteps((s) => ({ ...s, [evt.step]: { state: evt.state, message: evt.message } }));
          } else {
            ok = evt.ok;
          }
        }
      }
    } catch {
      setBlocked("The connection dropped. The run may still finish; reload the page in a minute to see the result.");
    }
    setSucceeded(ok);
    setPhase("finished");
    if (ok) router.refresh();
  }

  const running = phase === "running";

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} aria-haspopup="dialog">
        {running ? "Generating…" : "Generate now"}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Generate now">
        <p className="why" style={{ color: "var(--muted)", fontSize: 15 }}>
          Pulls fresh data from YouTube and builds a new brief. It usually takes under a minute. Runs are limited to one
          every 10 minutes and 20 a day.
        </p>
        <label className="check">
          <input type="checkbox" checked={alsoEmail} disabled={running} onChange={(e) => setAlsoEmail(e.target.checked)} />
          Also email me
        </label>
        <button type="button" className="btn btn-solid" onClick={start} disabled={running}>
          {running ? "Working…" : phase === "finished" ? "Run again" : "Start"}
        </button>

        {blocked && (
          <div className="callout callout-err" role="alert" style={{ marginTop: 16, marginBottom: 0 }}>
            {blocked}
          </div>
        )}

        {(running || phase === "finished") && (
          <ol className="steps" aria-live="polite">
            {STEPS.map((s) => {
              const v = steps[s.key];
              const state = v?.state ?? "waiting";
              return (
                <li key={s.key} className="step" data-state={state}>
                  <StepIcon state={state} />
                  <span className="step-name">{s.label}</span>
                  {v?.message && <span className="step-msg">{v.message}</span>}
                </li>
              );
            })}
          </ol>
        )}

        {phase === "finished" && succeeded && (
          <button type="button" className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => setOpen(false)}>
            View the new brief
          </button>
        )}
      </Sheet>
    </>
  );
}

function StepIcon({ state }: { state: StepState | "waiting" }) {
  const common = { className: "icon", viewBox: "0 0 24 24", "aria-hidden": true } as const;
  switch (state) {
    case "running":
      return (
        <svg {...common} className="icon spin">
          <circle cx="12" cy="12" r="8" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" />
          <path d="M12 4a8 8 0 0 1 8 8" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case "done":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" fill="var(--good)" />
          <path d="M8 12.5l2.7 2.7L16 9.8" fill="none" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "warning":
      return (
        <svg {...common}>
          <path d="M12 3.5l9.5 16.5h-19z" fill="var(--warn)" strokeLinejoin="round" stroke="var(--warn)" strokeWidth="1.5" />
          <path d="M12 9.5v4.5" stroke="#000" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="12" cy="17" r="1.2" fill="#000" />
        </svg>
      );
    case "error":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" fill="var(--err)" />
          <path d="M9 9l6 6M15 9l-6 6" stroke="#000" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
        </svg>
      );
  }
}
