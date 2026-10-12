import Link from "next/link";
import { notFound } from "next/navigation";
import { BriefBody, BriefHeading } from "@/components/BriefView";
import { getBrief } from "@/lib/store";

export const dynamic = "force-dynamic";

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
