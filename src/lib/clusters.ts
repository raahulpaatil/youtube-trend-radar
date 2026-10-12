import { z } from "zod";
import { median } from "./metrics";
import { FORMATS, type Cluster, type Format, type Status, type Video } from "./types";

/** What Gemini must return. Everything numeric is computed later, in code. */
export const GeminiOutput = z.object({
  clusters: z
    .array(
      z.object({
        name: z.string().min(3).max(80),
        why_now: z.string().min(10).max(300),
        suggested_angle: z.string().min(10).max(400),
        continues_previous: z.string().nullable(),
        videos: z
          .array(z.object({ id: z.string().min(1), format: z.enum(FORMATS) }))
          .min(2)
          .max(12),
      }),
    )
    .min(3)
    .max(5),
});
export type GeminiOutput = z.infer<typeof GeminiOutput>;

/** Words the brief must never use: it reports what has happened, it does not predict. */
const FORECAST = new RegExp(
  [
    "will (?:trend|peak|blow up|go viral|explode|be (?:big|huge|viral|the next))",
    "about to (?:blow up|explode|trend|go viral|peak|take off)",
    "going to (?:trend|peak|blow up|go viral|explode|take off)",
    "(?:expected|set|poised|likely) to (?:trend|peak|explode|rise|grow|blow up|go viral)",
    "\\bforecast",
    "\\bpredict",
    "next big thing",
  ].join("|"),
  "i",
);

export type Validated = { ok: true; clusters: Cluster[] } | { ok: false; errors: string[] };

const RISING_FACTOR = 1.2;

/**
 * Check Gemini's clusters against the supplied videos, then compute every number in code.
 * `sent` is the exact set of videos Gemini was shown.
 */
export function validateClusters(
  output: GeminiOutput,
  sent: Video[],
  previous: Cluster[] | null,
): Validated {
  const byId = new Map(sent.map((v) => [v.id, v]));
  const errors: string[] = [];
  const clusters: Cluster[] = [];

  output.clusters.forEach((c, idx) => {
    const label = `Cluster ${idx + 1} ("${c.name}")`;
    const ids = c.videos.map((v) => v.id);
    if (new Set(ids).size !== ids.length) errors.push(`${label}: lists the same video ID twice.`);
    const unknown = ids.filter((id) => !byId.has(id));
    if (unknown.length) errors.push(`${label}: video IDs not in the supplied list: ${unknown.join(", ")}.`);

    const text = `${c.name} ${c.why_now} ${c.suggested_angle}`;
    const hit = text.match(FORECAST);
    if (hit) errors.push(`${label}: uses forecast wording ("${hit[0]}"). Describe only what has already happened.`);

    const members = c.videos.filter((v) => byId.has(v.id));
    const channels = new Set(members.map((v) => byId.get(v.id)!.channelId));
    if (members.length < 2) errors.push(`${label}: needs at least 2 supplied videos.`);
    if (channels.size < 2) errors.push(`${label}: needs videos from at least 2 different channels.`);
    if (errors.length) return;

    const vids = members.map((m) => ({ meta: byId.get(m.id)!, format: m.format as Format }));
    const prev = c.continues_previous
      ? previous?.find((p) => p.name.toLowerCase() === c.continues_previous!.toLowerCase()) ?? null
      : null;

    const medianVph = median(vids.map((v) => v.meta.viewsPerHour));
    const engagements = vids.map((v) => v.meta.engagement).filter((e): e is number => e !== null);

    let status: Status;
    if (!previous) status = "First week, no comparison";
    else if (!prev) status = "New this week";
    else status = medianVph >= prev.stats.medianViewsPerHour * RISING_FACTOR ? "Rising now" : "Still going";

    const byFormat = new Map<Format, number[]>();
    for (const v of vids) byFormat.set(v.format, [...(byFormat.get(v.format) ?? []), v.meta.viewsPerHour]);
    const winningFormats = [...byFormat.entries()]
      .map(([format, vphs]) => ({
        format,
        count: vphs.length,
        medianViewsPerHour: Math.round(median(vphs)),
      }))
      .sort((a, b) => b.medianViewsPerHour - a.medianViewsPerHour || b.count - a.count)
      .slice(0, 3);

    clusters.push({
      name: c.name.trim(),
      whyNow: c.why_now.trim(),
      status,
      suggestedAngle: c.suggested_angle.trim(),
      continuesPrevious: prev ? prev.name : null,
      stats: {
        videos: vids.length,
        channels: channels.size,
        medianViewsPerHour: Math.round(medianVph),
        medianLengthSec: Math.round(median(vids.map((v) => v.meta.durationSec))),
        medianEngagement: engagements.length ? Math.round(median(engagements) * 100) / 100 : null,
      },
      winningFormats,
      videos: vids
        .map((v) => ({
          id: v.meta.id,
          title: v.meta.title,
          channelTitle: v.meta.channelTitle,
          views: v.meta.views,
          viewsPerHour: Math.round(v.meta.viewsPerHour),
          durationSec: v.meta.durationSec,
          format: v.format,
        }))
        .sort((a, b) => b.viewsPerHour - a.viewsPerHour),
    });
  });

  return errors.length ? { ok: false, errors } : { ok: true, clusters };
}
