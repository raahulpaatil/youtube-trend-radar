import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { z } from "zod";
import { sameOrigin } from "@/lib/same-origin";
import { deleteIdea, setIdeaStage } from "@/lib/store";
import { STAGES } from "@/lib/types";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

const Params = z.coerce.number().int().positive();
const StageBody = z.object({ stage: z.enum(STAGES) });

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return Response.json({ error: "Not allowed." }, { status: 403 });
  const id = Params.safeParse((await ctx.params).id);
  const body = StageBody.safeParse(await req.json().catch(() => null));
  if (!id.success || !body.success) return Response.json({ error: "Bad request." }, { status: 400 });

  const idea = await setIdeaStage(id.data, body.data.stage);
  if (!idea) return Response.json({ error: "That idea no longer exists." }, { status: 404 });
  revalidatePath("/saved");
  return Response.json({ idea }, { headers: NO_STORE });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return Response.json({ error: "Not allowed." }, { status: 403 });
  const id = Params.safeParse((await ctx.params).id);
  if (!id.success) return Response.json({ error: "Bad request." }, { status: 400 });

  const removed = await deleteIdea(id.data);
  if (!removed) return Response.json({ error: "That idea no longer exists." }, { status: 404 });
  revalidatePath("/saved");
  return Response.json({ ok: true }, { headers: NO_STORE });
}
