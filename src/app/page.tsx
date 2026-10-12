import Link from "next/link";
import { BriefBody, BriefHeading } from "@/components/BriefView";
import { GenerateNow } from "@/components/GenerateNow";
import { getLatestBrief } from "@/lib/store";

// Reads Neon only. Page views never call YouTube or Gemini.
export const dynamic = "force-dynamic";

export default async function BriefPage() {
  const brief = await getLatestBrief();

  if (!brief) {
    return (
      <div className="empty">
        <h2>No brief yet</h2>
        <p>
          The first brief arrives on Sunday morning. To see one now, tap Generate now. You can also check{" "}
          <Link href="/settings">Settings</Link> to choose what to watch.
        </p>
        <GenerateNow primary />
      </div>
    );
  }

  return (
    <>
      <div className="page-head">
        <BriefHeading brief={brief} />
        <GenerateNow />
      </div>
      <BriefBody brief={brief} />
    </>
  );
}
