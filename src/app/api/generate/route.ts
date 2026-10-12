import { NextRequest } from "next/server";
import { z } from "zod";
import { runPipeline } from "@/lib/pipeline";
import { claimManualRun, COOLDOWN_MINUTES, MAX_MANUAL_RUNS_PER_DAY } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const Body = z.object({ alsoEmail: z.boolean().default(false) });

/** Starts a manual run and streams one JSON line per step update. */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Bad request." }, { status: 400 });

  const claim = await claimManualRun(parsed.data.alsoEmail);
  if (!claim.ok) {
    if (claim.reason === "cooldown") {
      const mins = Math.ceil(claim.retryAfterSec / 60);
      return Response.json(
        {
          error: `A run just started. Wait about ${mins} minute${mins > 1 ? "s" : ""} (there is a ${COOLDOWN_MINUTES}-minute pause between runs), then try again.`,
          retryAfterSec: claim.retryAfterSec,
        },
        { status: 429, headers: { "Retry-After": String(claim.retryAfterSec) } },
      );
    }
    return Response.json(
      { error: `Today's limit of ${MAX_MANUAL_RUNS_PER_DAY} manual runs is used up. It resets at midnight IST.` },
      { status: 429 },
    );
  }

  const encoder = new TextEncoder();
  const origin = req.nextUrl.origin;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        } catch {
          // The browser closed the page; the run still finishes and is saved.
        }
      };
      const result = await runPipeline({
        runId: claim.runId,
        trigger: "manual",
        emailRequested: parsed.data.alsoEmail,
        origin,
        emit: (e) => send({ type: "step", ...e }),
      });
      send({ type: "end", ok: result.ok });
      try {
        controller.close();
      } catch {}
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
