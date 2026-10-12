import { neon } from "@neondatabase/serverless";

export type Row = Record<string, any>;
type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Row[]>;

let client: Sql | null = null;

/** Neon over HTTP. Created on first use so the build does not need DATABASE_URL. */
export function db(): Sql {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    client = neon(url) as unknown as Sql;
  }
  return client;
}
