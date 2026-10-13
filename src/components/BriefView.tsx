import { formatIST } from "@/lib/metrics";
import { REGIONS } from "@/lib/regions";
import type { Brief } from "@/lib/types";
import { ClusterList } from "./ClusterList";

export function regionName(code: string): string {
  return REGIONS.find((r) => r.code === code)?.name ?? code;
}

/** One-line description of the settings a brief was made with. */
export function briefMeta(brief: Brief): string {
  const s = brief.settings;
  return `${regionName(s.region)} · ${s.categories.map((c) => c.title).join(", ")} · ${s.keywords.join(", ")}`;
}

export function BriefBody({ brief }: { brief: Brief }) {
  return (
    <>
      {brief.stale && (
        <div className="callout callout-warn" role="status">
          YouTube could not be reached for this run, so this brief uses the last saved data from{" "}
          {formatIST(brief.dataAsOf)}.
        </div>
      )}
      {brief.settings.backfilled && (
        <div className="callout callout-warn" role="note">
          <b>Backfilled for comparison.</b> {brief.settings.backfillNote}
        </div>
      )}
      <ClusterList clusters={brief.clusters} brief={{ id: brief.id, weekStart: brief.weekStart, createdAt: brief.createdAt }} />
    </>
  );
}
