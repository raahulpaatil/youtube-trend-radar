import type { NextRequest } from "next/server";

/** Writes must come from this site's own pages. Blocks other websites from calling the routes in a visitor's browser. */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // curl and server-to-server calls send none
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}
