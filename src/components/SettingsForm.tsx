"use client";

import { useEffect, useRef, useState } from "react";
import { REGIONS } from "@/lib/regions";
import type { Category, Settings } from "@/lib/types";

export function SettingsForm({ initial, initialCategories }: { initial: Settings; initialCategories: Category[] | null }) {
  const [region, setRegion] = useState(initial.region);
  const [available, setAvailable] = useState<Category[] | null>(initialCategories);
  const skipFirstFetch = useRef(initialCategories !== null);
  const [catError, setCatError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Category[]>(initial.categories);
  const [keywords, setKeywords] = useState<string[]>(initial.keywords);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }
    let cancelled = false;
    setAvailable(null);
    setCatError(null);
    fetch(`/api/categories?region=${region}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.categories) {
          setAvailable(d.categories);
          setSelected((sel) => sel.filter((s) => d.categories.some((c: Category) => c.id === s.id)));
        } else {
          setCatError(d.error ?? "Could not load categories.");
        }
      })
      .catch(() => !cancelled && setCatError("Could not load categories. Check your connection and try again."));
    return () => {
      cancelled = true;
    };
  }, [region]);

  const toggle = (c: Category) =>
    setSelected((sel) => (sel.some((s) => s.id === c.id) ? sel.filter((s) => s.id !== c.id) : [...sel, c]));

  function addKeyword() {
    const k = draft.trim();
    if (!k) return;
    if (!keywords.some((x) => x.toLowerCase() === k.toLowerCase()) && keywords.length < 6) {
      setKeywords([...keywords, k.slice(0, 60)]);
    }
    setDraft("");
  }

  async function save() {
    setSaving(true);
    setStatus(null);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ region, categories: selected, keywords }),
    }).catch(() => null);
    setSaving(false);
    if (res?.ok) setStatus({ kind: "ok", text: "Saved. The next brief will use these settings." });
    else {
      const d = await res?.json().catch(() => ({}));
      setStatus({ kind: "err", text: d?.error ?? "Could not save. Check your connection and try again." });
    }
  }

  return (
    <div className="form">
      <div className="field">
        <label htmlFor="region">Region</label>
        <p className="hint">Trending charts and searches are read for this country.</p>
        <select id="region" className="select" value={region} onChange={(e) => setRegion(e.target.value)}>
          {REGIONS.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name} ({r.code})
            </option>
          ))}
        </select>
      </div>

      <div className="field" role="group" aria-labelledby="cat-label">
        <span id="cat-label" className="label">
          Categories
        </span>
        <p className="hint">Pick up to 5. These are the categories YouTube offers in this region.</p>
        {catError ? (
          <div className="callout callout-err" role="alert">
            {catError}
          </div>
        ) : !available ? (
          <p className="hint">Loading categories from YouTube…</p>
        ) : (
          <div className="cat-list">
            {available.map((c) => (
              <label key={c.id}>
                <input
                  type="checkbox"
                  checked={selected.some((s) => s.id === c.id)}
                  disabled={!selected.some((s) => s.id === c.id) && selected.length >= 5}
                  onChange={() => toggle(c)}
                />
                {c.title}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="field">
        <label htmlFor="kw">Keywords</label>
        <p className="hint">Uploads from the last 7 days are searched for each keyword. Up to 6.</p>
        <div className="kw-row">
          <input
            id="kw"
            className="input"
            value={draft}
            maxLength={60}
            placeholder="For example: AI tools"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addKeyword();
              }
            }}
          />
          <button type="button" className="btn btn-ghost" onClick={addKeyword} disabled={keywords.length >= 6}>
            Add
          </button>
        </div>
        <ul className="chips" style={{ listStyle: "none", padding: 0 }}>
          {keywords.map((k) => (
            <li key={k} className="kw">
              {k}
              <button type="button" aria-label={`Remove ${k}`} onClick={() => setKeywords(keywords.filter((x) => x !== k))}>
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <button
          type="button"
          className="btn btn-solid"
          onClick={save}
          disabled={saving || selected.length === 0 || keywords.length === 0 || !available}
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        <p className="status-line" role="status" style={{ marginTop: "0.75rem", color: status?.kind === "err" ? "var(--err)" : "var(--good)" }}>
          {status?.text}
          {!status && (selected.length === 0 || keywords.length === 0) && (
            <span style={{ color: "var(--muted)" }}>Pick at least one category and add at least one keyword to save.</span>
          )}
        </p>
      </div>
    </div>
  );
}
