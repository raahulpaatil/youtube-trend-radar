import { neon } from "@neondatabase/serverless";

/** Cache tag on every database request; purged together with the pages after a new brief. */
export const DB_TAG = "db";

export type Row = Record<string, any>;
type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Row[]>;

let client: Sql | null = null;

/** Neon over HTTP. Created on first use so the build does not need DATABASE_URL. */
export function db(): Sql {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    // The driver talks over fetch(). Tag those requests so a refresh can purge any cached copy of a page's data too.
    client = neon(url, { fetchOptions: { next: { tags: [DB_TAG] } } as RequestInit }) as unknown as Sql;
  }
  return client;
}
