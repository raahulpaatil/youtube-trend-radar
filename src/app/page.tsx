import Link from "next/link";
import { BriefBody, regionName } from "@/components/BriefView";
import { BriefHero } from "@/components/BriefHero";
import { PageHead } from "@/components/PageHead";
import { formatIST } from "@/lib/metrics";
import { getLatestBrief } from "@/lib/store";

// Pre-built and cached. Refreshed on demand when a brief or the settings change (see revalidatePath),
// with an hourly safety refresh. Page views never call YouTube or Gemini.
export const revalidate = 3600;

export default async function BriefPage() {
  const brief = await getLatestBrief();

  if (!brief) {
    return (
      <div className="shell">
        <PageHead title={<>No brief <em>yet</em></>} />
        <div className="empty">
          <h2>The first brief arrives on Sunday morning</h2>
          <p>To see one now, tap Generate now at the top of the page. You can also check Settings to choose what to watch.</p>
          <div className="empty-actions">
            <Link href="/settings" className="btn btn-ghost">
              Open Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const videos = brief.clusters.reduce((n, c) => n + c.videos.length, 0);
  const channels = new Set(brief.clusters.flatMap((c) => c.videos.map((v) => v.channelTitle))).size;

  return (
    <>
      <BriefHero
        weekLabel={brief.weekLabel}
        regionName={regionName(brief.settings.region)}
        dataAsOf={formatIST(brief.dataAsOf)}
        stale={brief.stale}
        clusters={brief.clusters.length}
        videos={videos}
        channels={channels}
      />
      <section id="clusters" className="clusters" aria-labelledby="clusters-title">
        <div className="clusters-inner">
          <span className="section-label">Topic clusters</span>
          <h2 id="clusters-title" className="title">
            What to <em>watch</em> this week
          </h2>
          <p className="sub">Tap a card for the numbers, winning formats and the videos behind it.</p>
          <BriefBody brief={brief} />
        </div>
      </section>
    </>
  );
}
