// Checks the bucket and wording rules. Run: npm run test:time
import { bucketOf, relativeTime } from "../src/lib/relative-time.ts";

// IST helpers: build a timestamp from an IST wall-clock time.
const ist = (y, m, d, h = 0, min = 0) => Date.UTC(y, m - 1, d, h, min) - 330 * 60_000;
let failed = 0;
const check = (name, got, want) => {
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${got}${ok ? "" : `  (wanted ${want})`}`);
};

// "now" = Wednesday 14 Oct 2026, 10:00 IST. That week started on Sunday 11 Oct.
const now = ist(2026, 10, 14, 10, 0);
check("same day, earlier", bucketOf(ist(2026, 10, 14, 0, 5), now), "Today");
check("11:59 pm yesterday", bucketOf(ist(2026, 10, 13, 23, 59), now), "Yesterday");
check("start of yesterday", bucketOf(ist(2026, 10, 13, 0, 0), now), "Yesterday");
check("Sunday of this week", bucketOf(ist(2026, 10, 11, 8, 0), now), "Earlier this week");
check("Saturday before", bucketOf(ist(2026, 10, 10, 23, 0), now), "Last week");
check("Sunday a week earlier", bucketOf(ist(2026, 10, 4, 0, 0), now), "Last week");
check("Saturday before that", bucketOf(ist(2026, 10, 3, 23, 59), now), "Older");
// A UTC date that is already the next day in IST must count as that IST day.
check("late UTC evening = next IST day", bucketOf(Date.UTC(2026, 9, 13, 19, 0), ist(2026, 10, 14, 9, 0)), "Today");
// On a Sunday, "yesterday" (Saturday) is still Yesterday, not Last week.
check("Sunday looks back at Saturday", bucketOf(ist(2026, 10, 10, 12, 0), ist(2026, 10, 11, 9, 0)), "Yesterday");

const t = ist(2026, 10, 14, 10, 0);
check("30 seconds", relativeTime(t - 30_000, t), "just now");
check("59 seconds", relativeTime(t - 59_000, t), "just now");
check("1 minute", relativeTime(t - 60_000, t), "1 min ago");
check("59 minutes", relativeTime(t - 59 * 60_000, t), "59 min ago");
check("60 minutes", relativeTime(t - 60 * 60_000, t), "1 hour ago");
check("2 hours", relativeTime(t - 2 * 3_600_000, t), "2 hours ago");
check("23h59m", relativeTime(t - (24 * 3_600_000 - 60_000), t), "23 hours ago");
check("24 hours", relativeTime(t - 24 * 3_600_000, t), "1 day ago");
check("2 days", relativeTime(t - 2 * 86_400_000, t), "2 days ago");
check("13 days", relativeTime(t - 13 * 86_400_000, t), "13 days ago");
check("14 days", relativeTime(t - 14 * 86_400_000, t), "2 weeks ago");
check("clock skew (future)", relativeTime(t + 5_000, t), "just now");

console.log(failed ? `\n${failed} check(s) failed.` : "\nAll time checks passed.");
process.exit(failed ? 1 : 0);
