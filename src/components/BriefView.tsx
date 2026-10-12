import { formatIST } from "@/lib/metrics";
import { REGIONS } from "@/lib/regions";
import type { Brief } from "@/lib/types";
import { ClusterList } from "./ClusterList";

export function BriefHeading({ brief }: { brief: Brief }) {
  const region = REGIONS.find((r) => r.code === brief.settings.region)?.name ?? brief.settings.region;
  return (
    <div>
      <h1>{brief.weekLabel}</h1>
      <p className="sub">Data as of {formatIST(brief.dataAsOf)}</p>
      <p className="meta">
        {region} · {brief.settings.categories.map((c) => c.title).join(", ")} · {brief.settings.keywords.join(", ")}
      </p>
    </div>
  );
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
      <ClusterList clusters={brief.clusters} />
    </>
  );
}
