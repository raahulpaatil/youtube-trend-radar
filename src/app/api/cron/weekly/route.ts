import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { runPipeline } from "@/lib/pipeline";
import { createCronRun } from "@/lib/store";

export const dynamic = "force-dynamic";
// Hobby plan maximum with Fluid compute is 300 s; one run takes well under a minute.
export const maxDuration = 300;

function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return given.length === want.length && timingSafeEqual(given, want);
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) return Response.json({ error: "unauthorized" }, { status: 401 });

  // ?simulate=youtube_down is only reachable with the secret; it exists to prove the stale fallback.
  const simulateYoutubeFailure = req.nextUrl.searchParams.get("simulate") === "youtube_down";
  const runId = await createCronRun();
  const result = await runPipeline({
    runId,
    trigger: "cron",
    emailRequested: true,
    origin: req.nextUrl.origin,
    simulateYoutubeFailure,
  });

  if (!result.ok) return Response.json({ ok: false, runId, error: result.error }, { status: 500 });
  return Response.json({
    ok: true,
    runId,
    briefId: result.brief.id,
    weekLabel: result.brief.weekLabel,
    clusters: result.brief.clusters.length,
    stale: result.stale,
    emailed: result.emailed,
  });
}
