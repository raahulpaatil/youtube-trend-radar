// Names-only check: reports which variables in .env.local are filled. Never prints values.
import { readFileSync } from "node:fs";

const names = readFileSync(".env.example", "utf8")
  .split("\n")
  .filter((l) => /^[A-Z_]+=/.test(l))
  .map((l) => l.split("=")[0]);

const filled = new Set(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => /^[A-Z_]+=.+/.test(l))
    .map((l) => l.split("=")[0]),
);

let missing = 0;
for (const n of names) {
  const ok = filled.has(n);
  if (!ok) missing++;
  console.log(`${ok ? "✅ set    " : "❌ EMPTY  "} ${n}`);
}
console.log(missing ? `\n${missing} still empty.` : "\nAll variables are filled.");
process.exit(missing ? 1 : 0);
