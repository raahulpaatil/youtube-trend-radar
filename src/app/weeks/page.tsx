import Link from "next/link";
import { formatIST } from "@/lib/metrics";
import { getLatestBrief, listBriefs } from "@/lib/store";

// Pre-built and cached. Refreshed on demand when a brief or the settings change (see revalidatePath),
// with an hourly safety refresh. Page views never call YouTube or Gemini.
export const revalidate = 3600;

export default async function EarlierWeeksPage() {
  const [latest, all] = await Promise.all([getLatestBrief(), listBriefs()]);
  const earlier = all.filter((b) => b.id !== latest?.id);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Earlier weeks</h1>
          <p className="sub">Past briefs, newest first.</p>
        </div>
      </div>
      {earlier.length === 0 ? (
        <div className="empty">
          <h2>Nothing earlier yet</h2>
          <p>Past briefs appear here once a newer one replaces the current brief.</p>
          <Link href="/" className="btn">
            Back to this week
          </Link>
        </div>
      ) : (
        <ul className="week-list">
          {earlier.map((b) => (
            <li key={b.id}>
              <Link className="week-link" href={`/weeks/${b.id}`}>
                <h2>{b.weekLabel}</h2>
                <p className="meta">
                  {b.clusters.length} clusters · data as of {formatIST(b.dataAsOf)}
                  {b.stale ? " · older data" : ""}
                </p>
                <p className="why" style={{ marginTop: "0.375rem" }}>
                  {b.clusters.map((c) => c.name).join(" · ")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
