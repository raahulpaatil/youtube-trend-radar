"use client";

import { useSyncExternalStore } from "react";
import { MAX_IDEAS, topicKey, type Cluster, type Idea, type Stage } from "./types";

/**
 * One small shared store for saved ideas, so the bookmarks on the Brief page, the count in the header
 * and the Saved ideas page always agree. Changes show instantly and roll back if the server says no.
 */

type Notice = { id: number; text: string; undo?: () => void };
type State = { status: "idle" | "loading" | "ready" | "error"; ideas: Idea[]; notice: Notice | null };

const SERVER_STATE: State = { status: "idle", ideas: [], notice: null };
let state: State = SERVER_STATE;
const listeners = new Set<() => void>();
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
let nextNoticeId = 1;

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function say(text: string, undo?: () => void) {
  clearTimeout(noticeTimer);
  set({ notice: { id: nextNoticeId++, text, undo } });
  noticeTimer = setTimeout(() => set({ notice: null }), undo ? 7000 : 5000);
}

export function dismissNotice() {
  clearTimeout(noticeTimer);
  set({ notice: null });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useIdeas(): State {
  return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
}

async function call(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      ...init,
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    });
    return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
  } catch {
    return { ok: false, status: 0, data: {} };
  }
}

export async function loadIdeas(force = false) {
  if (state.status === "loading" || (state.status === "ready" && !force)) return;
  set({ status: state.status === "ready" ? "ready" : "loading" });
  const r = await call("/api/ideas");
  if (r.ok) set({ status: "ready", ideas: r.data.ideas as Idea[] });
  else {
    set({ status: "error" });
    say("Couldn’t load your saved ideas. Reload the page to try again.");
  }
}

export const findSaved = (ideas: Idea[], weekStart: string, clusterName: string) =>
  ideas.find((i) => i.topicKey === topicKey(weekStart, clusterName));

type BriefRef = { id: number; weekStart: string; createdAt: string };

export async function saveIdea(brief: BriefRef, clusterIndex: number, cluster: Cluster) {
  if (findSaved(state.ideas, brief.weekStart, cluster.name)) return;
  if (state.ideas.length >= MAX_IDEAS) {
    say(`Your saved list is full (${MAX_IDEAS} ideas). Remove a few, then try again.`);
    return;
  }
  const tempId = -Date.now();
  const now = new Date().toISOString();
  const temp: Idea = {
    id: tempId,
    topicKey: topicKey(brief.weekStart, cluster.name),
    briefId: brief.id,
    clusterIndex,
    weekStart: brief.weekStart,
    cluster,
    suggestedAt: brief.createdAt,
    savedAt: now,
    stage: "saved",
    stageChangedAt: now,
  };
  set({ ideas: [temp, ...state.ideas] });
  const r = await call("/api/ideas", { method: "POST", body: JSON.stringify({ briefId: brief.id, clusterIndex }) });
  if (r.ok) {
    set({ ideas: state.ideas.map((i) => (i.id === tempId ? (r.data.idea as Idea) : i)) });
    say("Saved to your ideas.");
  } else {
    set({ ideas: state.ideas.filter((i) => i.id !== tempId) });
    say(r.data?.error ?? "Couldn’t save that. Check your connection and try again.");
  }
}

export async function removeIdea(id: number) {
  const idea = state.ideas.find((i) => i.id === id);
  if (!idea) return;
  set({ ideas: state.ideas.filter((i) => i.id !== id) });
  const r = await call(`/api/ideas/${id}`, { method: "DELETE" });
  if (r.ok || r.status === 404) {
    say("Removed from your ideas.", () => {
      // Undo is a fresh save of the same topic.
      void saveIdea({ id: idea.briefId, weekStart: idea.weekStart, createdAt: idea.suggestedAt }, idea.clusterIndex, idea.cluster);
    });
  } else {
    set({ ideas: [idea, ...state.ideas].sort((a, b) => b.savedAt.localeCompare(a.savedAt)) });
    say("Couldn’t remove that. Check your connection and try again.");
  }
}

export async function setStage(id: number, stage: Stage) {
  const before = state.ideas.find((i) => i.id === id);
  if (!before || before.stage === stage) return;
  const patch = (s: Stage, at: string) =>
    set({ ideas: state.ideas.map((i) => (i.id === id ? { ...i, stage: s, stageChangedAt: at } : i)) });
  patch(stage, new Date().toISOString());
  const r = await call(`/api/ideas/${id}`, { method: "PATCH", body: JSON.stringify({ stage }) });
  if (!r.ok) {
    patch(before.stage, before.stageChangedAt);
    say("Couldn’t change that. Check your connection and try again.");
  }
}
