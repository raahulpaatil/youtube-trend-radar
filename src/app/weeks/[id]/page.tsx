import Link from "next/link";
import { notFound } from "next/navigation";
import { BriefBody, BriefHeading } from "@/components/BriefView";
import { getBrief } from "@/lib/store";

// Pre-built and cached. Refreshed on demand when a brief or the settings change (see revalidatePath),
// with an hourly safety refresh. Page views never call YouTube or Gemini.
export const revalidate = 3600;

// Past briefs are rendered on first visit, then cached.
export function generateStaticParams() {
  return [];
}

export default async function PastBriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1) notFound();
  const brief = await getBrief(n);
  if (!brief) notFound();

  return (
    <>
      <Link href="/weeks" className="back">
        ← Earlier weeks
      </Link>
      <div className="page-head">
        <BriefHeading brief={brief} />
      </div>
      <BriefBody brief={brief} />
    </>
  );
}
