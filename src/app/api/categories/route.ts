import { NextRequest } from "next/server";
import { REGIONS } from "@/lib/regions";
import { listCategories } from "@/lib/youtube";

export const dynamic = "force-dynamic";

/** Valid video categories for the chosen region, straight from YouTube (cached for a day). */
export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get("region") ?? "";
  if (!REGIONS.some((r) => r.code === region)) {
    return Response.json({ error: "Unknown region" }, { status: 400 });
  }
  try {
    return Response.json({ categories: await listCategories(region) });
  } catch (e) {
    return Response.json(
      { error: "YouTube could not list categories right now. Try again in a minute." },
      { status: 502 },
    );
  }
}
