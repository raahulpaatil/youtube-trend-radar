/** Pure time helpers for the Saved ideas page. Everything is in IST (UTC+5:30), weeks start on Sunday. */

const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;

export type Bucket = "Today" | "Yesterday" | "Earlier this week" | "Last week" | "Older";
export const BUCKET_ORDER: Bucket[] = ["Today", "Yesterday", "Earlier this week", "Last week", "Older"];

/** Whole IST calendar days since 1970-01-01. */
const istDay = (ms: number) => Math.floor((ms + IST_OFFSET_MS) / DAY_MS);

export function bucketOf(thenMs: number, nowMs: number): Bucket {
  const today = istDay(nowMs);
  const day = istDay(thenMs);
  if (day >= today) return "Today";
  if (day === today - 1) return "Yesterday";
  // 1970-01-01 was a Thursday, so (day + 4) % 7 gives 0 for Sunday.
  const weekStart = today - ((today + 4) % 7);
  if (day >= weekStart) return "Earlier this week";
  if (day >= weekStart - 7) return "Last week";
  return "Older";
}

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"} ago`;

/** "just now", "5 min ago", "3 hours ago", "1 day ago", "2 weeks ago". */
export function relativeTime(thenMs: number, nowMs: number): string {
  const diff = nowMs - thenMs;
  if (diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return plural(hours, "hour");
  const days = Math.floor(diff / DAY_MS);
  if (days < 14) return plural(days, "day");
  return plural(Math.floor(days / 7), "week");
}
