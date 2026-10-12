// Checks the stored brief against its own snapshot. Usage: npm run verify [-- <briefId>]
// For every cluster: each video ID must exist in the snapshot, with 2+ videos from 2+ distinct channels.
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const id = process.argv[2] ? Number(process.argv[2]) : null;
const rows = id
  ? await sql`SELECT * FROM briefs WHERE id = ${id}`
  : await sql`SELECT * FROM briefs ORDER BY id DESC LIMIT 1`;
if (!rows.length) {
  console.log("FAIL: no brief stored");
  process.exit(1);
}
const brief = rows[0];
const snap = (await sql`SELECT id, fetched_at, videos FROM snapshots WHERE id = ${brief.snapshot_id}`)[0];
if (!snap) {
  console.log(`FAIL: snapshot #${brief.snapshot_id} not found`);
  process.exit(1);
}
const byId = new Map(snap.videos.map((v) => [v.id, v]));
console.log(
  `Brief #${brief.id} "${brief.week_label}" model=${brief.model} stale=${brief.stale} | snapshot #${snap.id} (${snap.videos.length} videos, fetched ${new Date(snap.fetched_at).toISOString()})`,
);
console.log(`Settings used: region=${brief.settings.region}; categories=${brief.settings.categories.map((c) => c.title).join(", ")}; keywords=${brief.settings.keywords.join(", ")}\n`);

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`  FAIL ${msg}`);
};
if (brief.clusters.length < 3 || brief.clusters.length > 5) fail(`cluster count ${brief.clusters.length} is not 3-5`);

for (const c of brief.clusters) {
  const missing = c.videos.filter((v) => !byId.has(v.id)).map((v) => v.id);
  const channels = new Set(c.videos.filter((v) => byId.has(v.id)).map((v) => byId.get(v.id).channelId));
  const ok = missing.length === 0 && c.videos.length >= 2 && channels.size >= 2;
  console.log(
    `${ok ? "PASS" : "FAIL"} [${c.status}] ${c.name} | videos=${c.videos.length} channels=${channels.size} idsInSnapshot=${c.videos.length - missing.length}/${c.videos.length}`,
  );
  if (!ok) failures++;
}
console.log(failures ? `\n${failures} problem(s).` : `\nALL CHECKS PASSED (${brief.clusters.length} clusters).`);
process.exit(failures ? 1 : 0);
