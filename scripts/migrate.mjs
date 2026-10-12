// Creates the four tables (idempotent). Run: npm run migrate
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

await sql`CREATE TABLE IF NOT EXISTS settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  region text NOT NULL DEFAULT 'IN',
  categories jsonb NOT NULL DEFAULT '[{"id":"28","title":"Science & Technology"}]'::jsonb,
  keywords jsonb NOT NULL DEFAULT '["AI tools","productivity apps","tech review"]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
)`;
await sql`INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`;

await sql`CREATE TABLE IF NOT EXISTS runs (
  id serial PRIMARY KEY,
  trigger text NOT NULL CHECK (trigger IN ('cron','manual')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','failed')),
  email_requested boolean NOT NULL DEFAULT false,
  emailed boolean NOT NULL DEFAULT false,
  stale boolean NOT NULL DEFAULT false,
  search_calls int NOT NULL DEFAULT 0,
  log jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text,
  snapshot_id int,
  brief_id int,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
)`;
await sql`CREATE INDEX IF NOT EXISTS runs_manual_started_idx ON runs (started_at) WHERE trigger = 'manual'`;

await sql`CREATE TABLE IF NOT EXISTS snapshots (
  id serial PRIMARY KEY,
  run_id int,
  region text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  videos jsonb NOT NULL
)`;

await sql`CREATE TABLE IF NOT EXISTS briefs (
  id serial PRIMARY KEY,
  run_id int,
  snapshot_id int NOT NULL,
  week_label text NOT NULL,
  week_start date NOT NULL,
  model text NOT NULL,
  stale boolean NOT NULL DEFAULT false,
  clusters jsonb NOT NULL,
  settings jsonb NOT NULL,
  data_as_of timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
)`;

const rows = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1`;
console.log("tables:", rows.map((r) => r.table_name).join(", "));
const s = await sql`SELECT region, categories, keywords FROM settings WHERE id = 1`;
console.log("settings row:", JSON.stringify(s[0]));
