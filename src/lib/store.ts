import { db } from "./db";
import type { Brief, Cluster, Settings, Video } from "./types";

export const COOLDOWN_MINUTES = 10;
export const MAX_MANUAL_RUNS_PER_DAY = 20;

const j = (v: unknown) => JSON.stringify(v);

/** A Postgres `date` as YYYY-MM-DD. The driver returns a Date at local midnight, so read it with local getters. */
function dateOnly(v: unknown): string {
  if (typeof v === "string") return v.slice(0, 10);
  const d = v as Date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---------- settings ----------

export async function getSettings(): Promise<Settings> {
  const rows = await db()`SELECT region, categories, keywords FROM settings WHERE id = 1`;
  const r = rows[0];
  return { region: r.region, categories: r.categories, keywords: r.keywords };
}

export async function saveSettings(s: Settings) {
  await db()`UPDATE settings
    SET region = ${s.region}, categories = ${j(s.categories)}::jsonb, keywords = ${j(s.keywords)}::jsonb, updated_at = now()
    WHERE id = 1`;
}

// ---------- runs ----------

export type ClaimResult =
  | { ok: true; runId: number }
  | { ok: false; reason: "cooldown"; retryAfterSec: number }
  | { ok: false; reason: "daily_limit" };

/** Atomically start a manual run, enforcing the cooldown and the daily cap in Neon. */
export async function claimManualRun(emailRequested: boolean): Promise<ClaimResult> {
  const sql = db();
  const rows = await sql`INSERT INTO runs (trigger, email_requested)
    SELECT 'manual', ${emailRequested}
    WHERE NOT EXISTS (
      SELECT 1 FROM runs WHERE trigger = 'manual' AND started_at > now() - make_interval(mins => ${COOLDOWN_MINUTES})
    )
    AND (
      SELECT count(*) FROM runs
      WHERE trigger = 'manual'
        AND started_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata')
    ) < ${MAX_MANUAL_RUNS_PER_DAY}
    RETURNING id`;
  if (rows.length) return { ok: true, runId: rows[0].id as number };

  const last = await sql`SELECT extract(epoch FROM (started_at + make_interval(mins => ${COOLDOWN_MINUTES}) - now())) AS wait
    FROM runs WHERE trigger = 'manual' ORDER BY started_at DESC LIMIT 1`;
  const wait = Number(last[0]?.wait ?? 0);
  if (wait > 0) return { ok: false, reason: "cooldown", retryAfterSec: Math.ceil(wait) };
  return { ok: false, reason: "daily_limit" };
}

export async function createCronRun(): Promise<number> {
  const rows = await db()`INSERT INTO runs (trigger, email_requested) VALUES ('cron', true) RETURNING id`;
  return rows[0].id as number;
}

export async function finishRun(
  runId: number,
  f: {
    status: "success" | "failed";
    error?: string;
    log: string[];
    stale: boolean;
    emailed: boolean;
    searchCalls: number;
    snapshotId?: number | null;
    briefId?: number | null;
  },
) {
  await db()`UPDATE runs SET status = ${f.status}, error = ${f.error ?? null}, log = ${j(f.log)}::jsonb,
    stale = ${f.stale}, emailed = ${f.emailed}, search_calls = ${f.searchCalls},
    snapshot_id = ${f.snapshotId ?? null}, brief_id = ${f.briefId ?? null}, finished_at = now()
    WHERE id = ${runId}`;
}

// ---------- snapshots ----------

export type Snapshot = { id: number; region: string; fetchedAt: string; videos: Video[] };

export async function insertSnapshot(runId: number, region: string, videos: Video[]): Promise<Snapshot> {
  const rows = await db()`INSERT INTO snapshots (run_id, region, videos) VALUES (${runId}, ${region}, ${j(videos)}::jsonb)
    RETURNING id, fetched_at`;
  return { id: rows[0].id, region, fetchedAt: new Date(rows[0].fetched_at).toISOString(), videos };
}

export async function getLastGoodSnapshot(): Promise<Snapshot | null> {
  const rows = await db()`SELECT id, region, fetched_at, videos FROM snapshots ORDER BY id DESC LIMIT 1`;
  if (!rows.length) return null;
  const r = rows[0];
  return { id: r.id, region: r.region, fetchedAt: new Date(r.fetched_at).toISOString(), videos: r.videos };
}

// ---------- briefs ----------

function toBrief(r: any): Brief {
  return {
    id: r.id,
    runId: r.run_id,
    snapshotId: r.snapshot_id,
    weekLabel: r.week_label,
    weekStart: dateOnly(r.week_start),
    model: r.model,
    stale: r.stale,
    clusters: r.clusters,
    settings: r.settings,
    dataAsOf: new Date(r.data_as_of).toISOString(),
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export async function insertBrief(b: {
  runId: number;
  snapshotId: number;
  weekLabel: string;
  weekStart: string;
  model: string;
  stale: boolean;
  clusters: Cluster[];
  settings: Settings;
  dataAsOf: string;
}): Promise<Brief> {
  const rows = await db()`INSERT INTO briefs (run_id, snapshot_id, week_label, week_start, model, stale, clusters, settings, data_as_of)
    VALUES (${b.runId}, ${b.snapshotId}, ${b.weekLabel}, ${b.weekStart}, ${b.model}, ${b.stale}, ${j(b.clusters)}::jsonb,
            ${j(b.settings)}::jsonb, ${b.dataAsOf})
    RETURNING *`;
  return toBrief(rows[0]);
}

export async function getLatestBrief(): Promise<Brief | null> {
  const rows = await db()`SELECT * FROM briefs ORDER BY id DESC LIMIT 1`;
  return rows.length ? toBrief(rows[0]) : null;
}

export async function getBrief(id: number): Promise<Brief | null> {
  const rows = await db()`SELECT * FROM briefs WHERE id = ${id}`;
  return rows.length ? toBrief(rows[0]) : null;
}

export async function listBriefs(): Promise<Brief[]> {
  const rows = await db()`SELECT * FROM briefs ORDER BY id DESC LIMIT 60`;
  return rows.map(toBrief);
}

/** The newest brief from an earlier week than `weekStart`, used for "is this cluster new?". */
export async function getPreviousWeekBrief(weekStart: string): Promise<Brief | null> {
  const rows = await db()`SELECT * FROM briefs WHERE week_start < ${weekStart}::date ORDER BY id DESC LIMIT 1`;
  return rows.length ? toBrief(rows[0]) : null;
}

// ---------- saved ideas ----------

import { MAX_IDEAS, topicKey, type Idea, type Stage } from "./types";

function toIdea(r: any): Idea {
  return {
    id: r.id,
    topicKey: r.topic_key,
    briefId: r.brief_id,
    clusterIndex: r.cluster_index,
    weekStart: dateOnly(r.week_start),
    cluster: r.cluster,
    suggestedAt: new Date(r.suggested_at).toISOString(),
    savedAt: new Date(r.saved_at).toISOString(),
    stage: r.stage,
    stageChangedAt: new Date(r.stage_changed_at).toISOString(),
  };
}

export async function listIdeas(): Promise<Idea[]> {
  const rows = await db()`SELECT * FROM ideas ORDER BY saved_at DESC, id DESC LIMIT ${MAX_IDEAS}`;
  return rows.map(toIdea);
}

export type SaveResult =
  | { ok: true; idea: Idea }
  | { ok: false; reason: "no_such_cluster" | "full" };

/** Copies the cluster from the stored brief itself, so the browser can never invent content. Idempotent per topic and week. */
export async function saveIdea(briefId: number, clusterIndex: number): Promise<SaveResult> {
  const brief = await getBrief(briefId);
  const cluster = brief?.clusters[clusterIndex];
  if (!brief || !cluster) return { ok: false, reason: "no_such_cluster" };

  const key = topicKey(brief.weekStart, cluster.name);
  const existing = await db()`SELECT * FROM ideas WHERE topic_key = ${key}`;
  if (existing.length) return { ok: true, idea: toIdea(existing[0]) };

  const count = await db()`SELECT count(*)::int AS n FROM ideas`;
  if (Number(count[0].n) >= MAX_IDEAS) return { ok: false, reason: "full" };

  const rows = await db()`INSERT INTO ideas (topic_key, brief_id, cluster_index, week_start, cluster, suggested_at)
    VALUES (${key}, ${brief.id}, ${clusterIndex}, ${brief.weekStart}, ${j(cluster)}::jsonb, ${brief.createdAt})
    ON CONFLICT (topic_key) DO UPDATE SET topic_key = EXCLUDED.topic_key
    RETURNING *`;
  return { ok: true, idea: toIdea(rows[0]) };
}

export async function setIdeaStage(id: number, stage: Stage): Promise<Idea | null> {
  const rows = await db()`UPDATE ideas SET stage = ${stage}, stage_changed_at = now() WHERE id = ${id} RETURNING *`;
  return rows.length ? toIdea(rows[0]) : null;
}

export async function deleteIdea(id: number): Promise<boolean> {
  const rows = await db()`DELETE FROM ideas WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}
