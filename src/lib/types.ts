export type Category = { id: string; title: string };

export type Settings = {
  region: string;
  categories: Category[];
  keywords: string[];
  /** Set only on a brief rebuilt after the fact for comparison (see the README). */
  backfilled?: boolean;
  backfillNote?: string;
};

export const FORMATS = [
  "tutorial",
  "review",
  "comparison",
  "news/update",
  "listicle",
  "short",
  "other",
] as const;
export type Format = (typeof FORMATS)[number];

export const LENGTH_BUCKETS = ["Under 1 min", "1-5 min", "5-10 min", "10-20 min", "20+ min"] as const;
export type LengthBucket = (typeof LENGTH_BUCKETS)[number];

/** One cleaned video, with the numbers the code computed. */
export type Video = {
  id: string;
  title: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  views: number;
  likes: number | null;
  comments: number | null;
  durationSec: number;
  ageHours: number;
  viewsPerHour: number;
  lengthBucket: LengthBucket;
  /** (likes + comments) / views, as a percentage. Null when likes are hidden. */
  engagement: number | null;
  tags: string[];
  sources: string[];
};

export type Status = "New this week" | "Rising now" | "Still going" | "First week, no comparison";

export type ClusterVideo = {
  id: string;
  title: string;
  channelTitle: string;
  views: number;
  viewsPerHour: number;
  durationSec: number;
  format: Format;
};

export type Cluster = {
  name: string;
  whyNow: string;
  status: Status;
  suggestedAngle: string;
  continuesPrevious: string | null;
  stats: {
    videos: number;
    channels: number;
    medianViewsPerHour: number;
    medianLengthSec: number;
    medianEngagement: number | null;
  };
  winningFormats: { format: Format; count: number; medianViewsPerHour: number }[];
  videos: ClusterVideo[];
};

export type Brief = {
  id: number;
  runId: number | null;
  snapshotId: number;
  weekLabel: string;
  weekStart: string;
  model: string;
  stale: boolean;
  clusters: Cluster[];
  settings: Settings;
  dataAsOf: string;
  createdAt: string;
};

export type StepName = "fetching" | "analysing" | "saving" | "emailing";
export type StepState = "running" | "done" | "warning" | "error";
export type StepEvent = { step: StepName; state: StepState; message?: string };
export type Emit = (e: StepEvent) => void;

export const STAGES = ["saved", "filming", "published"] as const;
export type Stage = (typeof STAGES)[number];

/** A cluster Ishaan saved. `cluster` is a full copy, so it survives later briefs. */
export type Idea = {
  id: number;
  topicKey: string;
  briefId: number;
  clusterIndex: number;
  weekStart: string;
  cluster: Cluster;
  suggestedAt: string;
  savedAt: string;
  stage: Stage;
  stageChangedAt: string;
};

export const MAX_IDEAS = 200;

/** One topic can be saved once per week, however many times the brief is regenerated. */
export function topicKey(weekStart: string, clusterName: string): string {
  return `${weekStart}:${clusterName.trim().toLowerCase()}`;
}
