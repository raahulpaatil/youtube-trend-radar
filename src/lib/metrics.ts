import type { LengthBucket } from "./types";

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** ISO 8601 duration (PT1H2M3S, P1DT2H) to seconds. */
export function parseDuration(iso: string | undefined): number {
  if (!iso) return 0;
  const m = iso.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return 0;
  const [, d, h, min, s] = m.map((x) => (x ? Number(x) : 0));
  return d * 86400 + h * 3600 + min * 60 + s;
}

export function lengthBucket(sec: number): LengthBucket {
  if (sec < 60) return "Under 1 min";
  if (sec < 300) return "1-5 min";
  if (sec < 600) return "5-10 min";
  if (sec < 1200) return "10-20 min";
  return "20+ min";
}

export function formatLength(sec: number): string {
  if (sec < 60) return `${Math.round(sec)} sec`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });
export function formatCount(n: number): string {
  return compact.format(Math.round(n));
}

export function formatPercent(n: number | null): string {
  return n === null ? "n/a" : `${n.toFixed(1)}%`;
}

const IST = "Asia/Kolkata";

export function formatIST(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: IST,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return `${date}, ${time} IST`;
}

/** The most recent Sunday (in IST) on or before `now`, as YYYY-MM-DD and a label. */
export function weekOf(now: Date): { start: string; label: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  const day = new Date(Date.UTC(Number(get("year")), Number(get("month")) - 1, Number(get("day"))));
  day.setUTCDate(day.getUTCDate() - weekdayIndex);
  const start = day.toISOString().slice(0, 10);
  const label = `Week of ${new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(day)}`;
  return { start, label };
}
