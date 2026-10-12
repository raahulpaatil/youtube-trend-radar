import { lengthBucket, parseDuration } from "./metrics";
import type { Category, Settings, Video } from "./types";

const BASE = "https://www.googleapis.com/youtube/v3";

/** search.list has its own small daily bucket (100 calls), so one run may never use more than this. */
export const MAX_SEARCH_CALLS_PER_RUN = 6;
const MIN_USABLE_VIDEOS = 10;
const MAX_STORED_VIDEOS = 300;

export class YouTubeError extends Error {
  constructor(
    message: string,
    public reason?: string,
    public status?: number,
  ) {
    super(message);
  }
}

type Params = Record<string, string | number | undefined>;

async function yt<T = any>(path: string, params: Params, revalidate?: number): Promise<T> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new YouTubeError("YOUTUBE_API_KEY is not set");
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, String(v));
  qs.set("key", key);
  const res = await fetch(`${BASE}/${path}?${qs}`, {
    signal: AbortSignal.timeout(20_000),
    ...(revalidate ? { next: { revalidate } } : { cache: "no-store" as const }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = body?.error?.errors?.[0]?.reason as string | undefined;
    throw new YouTubeError(body?.error?.message ?? `YouTube HTTP ${res.status}`, reason, res.status);
  }
  return body as T;
}

/** Valid video categories for a region (used by the Settings page). */
export async function listCategories(region: string): Promise<Category[]> {
  const data = await yt<any>("videoCategories", { part: "snippet", regionCode: region }, 86_400);
  return (data.items ?? [])
    .filter((c: any) => c.snippet?.assignable !== false)
    .map((c: any) => ({ id: String(c.id), title: String(c.snippet.title) }))
    .sort((a: Category, b: Category) => a.title.localeCompare(b.title));
}

const DETAIL_PARTS = "snippet,contentDetails,statistics";

async function fetchChart(region: string, categoryId: string) {
  const data = await yt<any>("videos", {
    part: DETAIL_PARTS,
    chart: "mostPopular",
    regionCode: region,
    videoCategoryId: categoryId,
    maxResults: 50,
  });
  return (data.items ?? []) as any[];
}

async function searchRecentIds(q: string, region: string, publishedAfter: string) {
  const data = await yt<any>("search", {
    part: "snippet",
    type: "video",
    q,
    regionCode: region,
    publishedAfter,
    order: "viewCount",
    maxResults: 50,
  });
  return ((data.items ?? []) as any[]).map((i) => i.id?.videoId).filter(Boolean) as string[];
}

async function fetchDetails(ids: string[]) {
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += 50) batches.push(ids.slice(i, i + 50));
  const pages = await Promise.all(
    batches.map((batch) => yt<any>("videos", { part: DETAIL_PARTS, id: batch.join(","), maxResults: 50 })),
  );
  return pages.flatMap((p) => (p.items ?? []) as any[]);
}

function toVideo(item: any, now: number, sources: string[]): Video | null {
  const sn = item.snippet;
  const st = item.statistics;
  if (!sn || !st || st.viewCount === undefined) return null;
  if (sn.liveBroadcastContent && sn.liveBroadcastContent !== "none") return null;
  const durationSec = parseDuration(item.contentDetails?.duration);
  if (durationSec <= 0) return null;
  const views = Number(st.viewCount);
  const likes = st.likeCount !== undefined ? Number(st.likeCount) : null;
  const comments = st.commentCount !== undefined ? Number(st.commentCount) : null;
  const ageHours = Math.max((now - new Date(sn.publishedAt).getTime()) / 3_600_000, 1);
  return {
    id: String(item.id),
    title: String(sn.title ?? "").slice(0, 200),
    channelId: String(sn.channelId),
    channelTitle: String(sn.channelTitle ?? ""),
    publishedAt: sn.publishedAt,
    views,
    likes,
    comments,
    durationSec,
    ageHours: Math.round(ageHours * 10) / 10,
    viewsPerHour: Math.round((views / ageHours) * 10) / 10,
    lengthBucket: lengthBucket(durationSec),
    engagement:
      likes !== null && views > 0 ? Math.round(((likes + (comments ?? 0)) / views) * 10000) / 100 : null,
    tags: ((sn.tags ?? []) as string[]).slice(0, 8),
    sources,
  };
}

export type Collected = { videos: Video[]; searchCalls: number; notes: string[] };

/** Fetch live data for the settings. Throws if nothing usable came back. */
export async function collectVideos(
  settings: Settings,
  opts: { simulateFailure?: boolean } = {},
): Promise<Collected> {
  if (opts.simulateFailure) throw new YouTubeError("Simulated YouTube outage", "simulated");

  const now = Date.now();
  const since = new Date(now - 7 * 86_400_000).toISOString();
  const notes: string[] = [];

  const keywords = settings.keywords.slice(0, MAX_SEARCH_CALLS_PER_RUN);
  if (settings.keywords.length > keywords.length) {
    notes.push(
      `Used the first ${keywords.length} keywords only (search limit per run); skipped: ${settings.keywords
        .slice(keywords.length)
        .join(", ")}.`,
    );
  }

  const chartJobs = settings.categories.map(async (c) => {
    try {
      const items = await fetchChart(settings.region, c.id);
      if (items.length === 0) notes.push(`Trending chart for "${c.title}" was empty in ${settings.region}; skipped.`);
      return items.map((i) => ({ item: i, source: `chart:${c.title}` }));
    } catch (e) {
      if (e instanceof YouTubeError && e.reason === "quotaExceeded") throw e;
      notes.push(`Trending chart for "${c.title}" failed in ${settings.region} (${(e as Error).message}); skipped.`);
      return [];
    }
  });

  let searchCalls = 0;
  const searchJobs = keywords.map(async (q) => {
    searchCalls++;
    try {
      const ids = await searchRecentIds(q, settings.region, since);
      if (ids.length === 0) notes.push(`Search "${q}" returned no uploads from the last 7 days.`);
      return ids.map((id) => ({ id, source: `search:${q}` }));
    } catch (e) {
      if (e instanceof YouTubeError && e.reason === "quotaExceeded") throw e;
      notes.push(`Search "${q}" failed (${(e as Error).message}); skipped.`);
      return [];
    }
  });

  const [chartResults, searchResults] = await Promise.all([Promise.all(chartJobs), Promise.all(searchJobs)]);

  const sourcesById = new Map<string, Set<string>>();
  const items = new Map<string, any>();
  for (const { item, source } of chartResults.flat()) {
    items.set(String(item.id), item);
    (sourcesById.get(String(item.id)) ?? sourcesById.set(String(item.id), new Set()).get(String(item.id))!).add(source);
  }
  const searchIds = new Map<string, Set<string>>();
  for (const { id, source } of searchResults.flat()) {
    (searchIds.get(id) ?? searchIds.set(id, new Set()).get(id)!).add(source);
  }
  const needDetails = [...searchIds.keys()].filter((id) => !items.has(id));
  if (needDetails.length) {
    for (const item of await fetchDetails(needDetails)) items.set(String(item.id), item);
  }
  for (const [id, srcs] of searchIds) {
    const set = sourcesById.get(id) ?? sourcesById.set(id, new Set()).get(id)!;
    srcs.forEach((s) => set.add(s));
  }

  const videos: Video[] = [];
  for (const [id, item] of items) {
    const v = toVideo(item, now, [...(sourcesById.get(id) ?? [])]);
    if (v) videos.push(v);
  }
  videos.sort((a, b) => b.viewsPerHour - a.viewsPerHour);
  const kept = videos.slice(0, MAX_STORED_VIDEOS);

  if (kept.length < MIN_USABLE_VIDEOS) {
    throw new YouTubeError(`YouTube returned only ${kept.length} usable videos`);
  }
  return { videos: kept, searchCalls, notes };
}
