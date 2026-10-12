import { readFile } from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { GeminiOutput, validateClusters } from "./clusters";
import type { Cluster, Settings, Video } from "./types";

/** Number of top videos (by views per hour) shown to Gemini. */
export const TOP_VIDEOS_FOR_GEMINI = 120;
const CALL_TIMEOUT_MS = 80_000;

export function geminiModel(): string {
  const m = process.env.GEMINI_MODEL;
  if (!m) throw new Error("GEMINI_MODEL is not set");
  return m;
}

async function loadPrompt(): Promise<string> {
  return readFile(path.join(process.cwd(), "prompts", "cluster-brief.md"), "utf8");
}

function compactVideo(v: Video) {
  return {
    id: v.id,
    title: v.title,
    channel: v.channelTitle,
    views: v.views,
    views_per_hour: Math.round(v.viewsPerHour),
    length_sec: v.durationSec,
    age_hours: Math.round(v.ageHours),
    engagement_pct: v.engagement,
    tags: v.tags.slice(0, 5),
  };
}

/**
 * Gemini rejects some JSON Schema size keywords with a 400. Send it the plain shape;
 * zod enforces every limit on the answer afterwards (and a failed check triggers the retry).
 */
const UNSUPPORTED = new Set(["$schema", "minLength", "maxLength", "minItems", "maxItems", "additionalProperties"]);
const RESPONSE_SCHEMA = JSON.parse(
  JSON.stringify(z.toJSONSchema(GeminiOutput), (k, v) => (UNSUPPORTED.has(k) ? undefined : v)),
);

async function callGemini(system: string, contents: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const ai = new GoogleGenAI({ apiKey: key });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);
  try {
    const res = await ai.models.generateContent({
      model: geminiModel(),
      contents,
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_SCHEMA,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        temperature: 0.3,
        abortSignal: controller.signal,
      },
    });
    if (!res.text) throw new Error("Gemini returned an empty answer");
    return res.text;
  } finally {
    clearTimeout(timer);
  }
}

export type ClusterResult = { clusters: Cluster[]; sent: Video[]; attempts: number };

/**
 * Ask Gemini to group the top videos, validate the answer, retry once with the
 * validation errors, and fail if the second answer is still invalid.
 */
export async function buildClusters(args: {
  videos: Video[];
  settings: Settings;
  dataAsOf: string;
  previous: Cluster[] | null;
  log: (line: string) => void;
}): Promise<ClusterResult> {
  const { videos, settings, dataAsOf, previous, log } = args;
  const sent = [...videos].sort((a, b) => b.viewsPerHour - a.viewsPerHour).slice(0, TOP_VIDEOS_FOR_GEMINI);
  const system = await loadPrompt();
  const input = JSON.stringify({
    region: settings.region,
    categories: settings.categories.map((c) => c.title),
    keywords: settings.keywords,
    data_as_of: dataAsOf,
    previous_week_cluster_names: previous?.map((c) => c.name) ?? [],
    videos: sent.map(compactVideo),
  });

  let feedback: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const contents =
      attempt === 1
        ? input
        : `${input}\n\nYour previous answer was rejected for these reasons. Fix every one and return the full JSON again:\n- ${feedback.join("\n- ")}`;
    let problems: string[] = [];
    try {
      const raw = await callGemini(system, contents);
      const parsed = GeminiOutput.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        problems = parsed.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`);
      } else {
        const checked = validateClusters(parsed.data, sent, previous);
        if (checked.ok) return { clusters: checked.clusters, sent, attempts: attempt };
        problems = checked.errors;
      }
    } catch (e) {
      problems = [`Answer was not usable JSON or the call failed: ${(e as Error).message}`];
    }
    log(`Gemini attempt ${attempt} rejected: ${problems.join(" | ")}`);
    feedback = problems;
  }
  throw new Error(`Gemini did not return valid clusters after one retry (${feedback.join("; ")})`);
}
