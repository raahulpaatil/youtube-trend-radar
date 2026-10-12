import { NextRequest } from "next/server";
import { z } from "zod";
import { REGIONS } from "@/lib/regions";
import { getSettings, saveSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

const Body = z.object({
  region: z.string().refine((r) => REGIONS.some((x) => x.code === r), "Unknown region"),
  categories: z
    .array(z.object({ id: z.string().regex(/^\d{1,4}$/), title: z.string().min(1).max(80) }))
    .min(1, "Pick at least one category")
    .max(5, "Pick at most 5 categories"),
  keywords: z
    .array(z.string().trim().min(1).max(60))
    .min(1, "Add at least one keyword")
    .max(6, "Use at most 6 keywords"),
});

export async function GET() {
  return Response.json(await getSettings());
}

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings" }, { status: 400 });
  }
  const keywords = [...new Set(parsed.data.keywords)];
  await saveSettings({ ...parsed.data, keywords });
  return Response.json({ ok: true });
}
