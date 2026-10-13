import { sendBriefEmail, siteUrl } from "./email";
import { buildClusters } from "./gemini";
import { weekOf } from "./metrics";
import {
  finishRun,
  getLastGoodSnapshot,
  getPreviousWeekBrief,
  getSettings,
  insertBrief,
  insertSnapshot,
  type Snapshot,
} from "./store";
import { geminiModel } from "./gemini";
import type { Brief, Emit, StepName } from "./types";
import { collectVideos } from "./youtube";
import { formatIST } from "./metrics";

/** Asks the site to rebuild its cached brief pages (see /api/revalidate for why this is a request, not a direct call). */
async function refreshCachedPages(origin: string | undefined, note: (line: string) => void) {
  try {
    const res = await fetch(`${siteUrl(origin)}/api/revalidate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    note(`Could not refresh cached pages: ${(e as Error).message}`);
  }
}

export type PipelineResult =
  | { ok: true; brief: Brief; stale: boolean; emailed: boolean }
  | { ok: false; error: string };

/**
 * Trigger -> Input -> Context -> Processing -> AI -> Output.
 * Every outcome is written to the runs table; a failed run never touches the visible brief.
 */
export async function runPipeline(args: {
  runId: number;
  trigger: "cron" | "manual";
  emailRequested: boolean;
  origin?: string;
  emit?: Emit;
  simulateYoutubeFailure?: boolean;
}): Promise<PipelineResult> {
  const { runId, trigger, emailRequested, origin, simulateYoutubeFailure } = args;
  const emit: Emit = args.emit ?? (() => {});
  const log: string[] = [];
  const note = (line: string) => log.push(line);
  let step: StepName = "fetching";
  let searchCalls = 0;
  let stale = false;
  let snapshot: Snapshot | null = null;

  try {
    // ---- Input: settings + live YouTube data ----
    const settings = await getSettings();
    note(`Settings: region ${settings.region}; categories ${settings.categories.map((c) => c.title).join(", ")}; keywords ${settings.keywords.join(", ")}`);
    emit({ step: "fetching", state: "running", message: "Getting live data from YouTube" });

    try {
      const collected = await collectVideos(settings, { simulateFailure: simulateYoutubeFailure });
      searchCalls = collected.searchCalls;
      collected.notes.forEach(note);
      snapshot = await insertSnapshot(runId, settings.region, collected.videos);
      note(`Live snapshot #${snapshot.id}: ${collected.videos.length} videos, ${searchCalls} search calls.`);
      emit({
        step: "fetching",
        state: "done",
        message: `${collected.videos.length} videos collected${collected.notes.length ? ` (${collected.notes.length} note${collected.notes.length > 1 ? "s" : ""} in the run log)` : ""}`,
      });
    } catch (e) {
      // ---- Context: fall back to the last good snapshot ----
      const last = await getLastGoodSnapshot();
      note(`YouTube failed: ${(e as Error).message}`);
      if (!last) throw new Error("YouTube could not be reached and there is no earlier saved data to fall back on.");
      snapshot = last;
      stale = true;
      note(`Using last good snapshot #${last.id} from ${last.fetchedAt}.`);
      emit({
        step: "fetching",
        state: "warning",
        message: `YouTube could not be reached. Using saved data from ${formatIST(last.fetchedAt)}.`,
      });
    }

    // ---- Processing + AI ----
    step = "analysing";
    emit({ step, state: "running", message: "Finding topic clusters with Gemini" });
    const week = weekOf(new Date());
    const previousBrief = await getPreviousWeekBrief(week.start);
    const result = await buildClusters({
      videos: snapshot.videos,
      settings,
      dataAsOf: snapshot.fetchedAt,
      previous: previousBrief?.clusters ?? null,
      log: note,
    });
    note(`Gemini answered on attempt ${result.attempts}: ${result.clusters.length} clusters.`);
    emit({ step, state: "done", message: `${result.clusters.length} clusters found` });

    // ---- Output: save ----
    step = "saving";
    emit({ step, state: "running", message: "Saving the brief" });
    const brief = await insertBrief({
      runId,
      snapshotId: snapshot.id,
      weekLabel: week.label,
      weekStart: week.start,
      model: geminiModel(),
      stale,
      clusters: result.clusters,
      settings,
      dataAsOf: snapshot.fetchedAt,
    });
    await refreshCachedPages(origin, note);
    emit({ step, state: stale ? "warning" : "done", message: stale ? "Saved, marked as older data" : "Brief saved" });

    // ---- Output: email ----
    step = "emailing";
    let emailed = false;
    if (trigger === "cron" || emailRequested) {
      emit({ step, state: "running", message: "Emailing the brief" });
      try {
        await sendBriefEmail(brief, siteUrl(origin));
        emailed = true;
        note("Email sent to SELF_EMAIL.");
        emit({ step, state: "done", message: "Email sent" });
      } catch (e) {
        note(`Email failed: ${(e as Error).message}`);
        emit({
          step,
          state: "warning",
          message: "The brief is saved, but the email did not send. Check RESEND_API_KEY and SELF_EMAIL.",
        });
      }
    } else {
      emit({ step, state: "done", message: "Skipped (\"Also email me\" was not ticked)" });
    }

    await finishRun(runId, {
      status: "success",
      log,
      stale,
      emailed,
      searchCalls,
      snapshotId: snapshot.id,
      briefId: brief.id,
    });
    return { ok: true, brief, stale, emailed };
  } catch (e) {
    const message = (e as Error).message;
    note(`Run failed at ${step}: ${message}`);
    emit({
      step,
      state: "error",
      message: `${message} The previous brief is still shown. Try again in 10 minutes.`,
    });
    await finishRun(runId, {
      status: "failed",
      error: message,
      log,
      stale,
      emailed: false,
      searchCalls,
      snapshotId: snapshot?.id ?? null,
    }).catch(() => {});
    return { ok: false, error: message };
  }
}
