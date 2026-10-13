import { timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { DB_TAG } from "@/lib/db";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Refreshes the cached brief pages. The generate run streams its progress, so by the time it saves a brief
 * the response has already been sent and Next.js would drop a revalidatePath made there. The run calls
 * this route instead, which is a normal request that is awaited. Protected with the cron secret.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || given.length !== want.length || !timingSafeEqual(given, want)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  revalidateTag(DB_TAG, { expire: 0 });
  revalidatePath("/");
  revalidatePath("/weeks");
  revalidatePath("/weeks/[id]", "page");
  return Response.json({ ok: true });
}
