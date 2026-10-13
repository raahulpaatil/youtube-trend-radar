import Link from "next/link";
import { PageHead } from "@/components/PageHead";
import { formatIST } from "@/lib/metrics";
import { getLatestBrief, listBriefs } from "@/lib/store";
import type { Brief } from "@/lib/types";

// Pre-built and cached. Refreshed on demand when a brief or the settings change (see revalidatePath),
// with an hourly safety refresh. Page views never call YouTube or Gemini.
export const revalidate = 3600;

/** One row per week: the newest brief of that week, with any other runs tucked underneath. */
function groupByWeek(briefs: Brief[]): { week: Brief; others: Brief[] }[] {
  const groups = new Map<string, Brief[]>();
  for (const b of briefs) groups.set(b.weekStart, [...(groups.get(b.weekStart) ?? []), b]);
  return [...groups.values()].map(([week, ...others]) => ({ week, others }));
}

export default async function EarlierWeeksPage() {
  const [latest, all] = await Promise.all([getLatestBrief(), listBriefs()]);
  const rows = groupByWeek(all.filter((b) => b.id !== latest?.id));

  return (
    <div className="shell">
      <PageHead title={<>Earlier <em>weeks</em></>} sub="Past briefs, one row per week, newest first." />
      {rows.length === 0 ? (
        <div className="empty">
          <h2>Nothing earlier yet</h2>
          <p>Past briefs appear here once a newer one replaces the current brief.</p>
          <div className="empty-actions">
            <Link href="/" className="btn btn-solid">
              Back to this week
            </Link>
          </div>
        </div>
      ) : (
        <ul className="week-list">
          {rows.map(({ week: b, others }) => (
            <li key={b.id}>
              <Link className="week-link" href={`/weeks/${b.id}`}>
                <h2>{b.weekLabel}</h2>
                <p className="meta">
                  {b.clusters.length} clusters · latest run {formatIST(b.dataAsOf)}
                  {b.stale ? " · older data" : ""}
                </p>
                <p className="why">{b.clusters.map((c) => c.name).join(" · ")}</p>
              </Link>
              {others.length > 0 && (
                <details className="week-more">
                  <summary>
                    +{others.length} more {others.length === 1 ? "run" : "runs"} this week
                  </summary>
                  <ul>
                    {others.map((o) => (
                      <li key={o.id}>
                        <Link href={`/weeks/${o.id}`}>
                          {formatIST(o.dataAsOf)}
                          {o.stale ? " · older data" : ""} · {o.clusters.length} clusters
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
