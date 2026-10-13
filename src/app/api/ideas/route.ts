import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { z } from "zod";
import { sameOrigin } from "@/lib/same-origin";
import { listIdeas, saveIdea } from "@/lib/store";
import { MAX_IDEAS } from "@/lib/types";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

const SaveBody = z.object({
  briefId: z.number().int().positive(),
  clusterIndex: z.number().int().min(0).max(20),
});

export async function GET() {
  return Response.json({ ideas: await listIdeas() }, { headers: NO_STORE });
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return Response.json({ error: "Not allowed." }, { status: 403 });
  const parsed = SaveBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request." }, { status: 400 });

  const result = await saveIdea(parsed.data.briefId, parsed.data.clusterIndex);
  if (!result.ok) {
    return result.reason === "full"
      ? Response.json(
          { error: `Your saved list is full (${MAX_IDEAS} ideas). Remove a few, then try again.` },
          { status: 409 },
        )
      : Response.json({ error: "That topic no longer exists." }, { status: 404 });
  }
  revalidatePath("/saved");
  return Response.json({ idea: result.idea }, { status: 201, headers: NO_STORE });
}
