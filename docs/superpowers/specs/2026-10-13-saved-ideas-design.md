# Saved ideas and journey improvements: design

Date: 2026-10-13 · Status: **draft for review** (nothing built yet)

## 1. Why

The brief tells Ishaan what is clustering on YouTube, but the journey ends at "decide what to film". The decision lives in his head, and there is no way to come back days later and see which topics he liked, when, and how long ago they were suggested.

**Job to be done:** *When I read Sunday's brief, I want to keep the topics I like in one place with their timing, so I can film while each wave is still fresh.*

**Success:** from the Saved ideas page, Ishaan can see every topic he saved, grouped by when he saved it, with "Saved 1 day ago" and "Suggested 2 days ago" labels, and can move each one from Saved to Filming to Published.

## 2. Scope

In:
1. Save / un-save a cluster (button on the card and in the detail sheet; optional swipe-right on touch screens).
2. A **Saved ideas** page, grouped into time buckets, with two time labels per idea and a stage chip.
3. Email deep links to a specific topic.
4. "New since your last visit" dot on unopened clusters.
5. After saving Settings, a button to make a brief with them now.
6. Earlier weeks: one row per week, other runs tucked under "+N more".
7. "How to read this" help panel.

Out: push notifications, connecting Ishaan's YouTube channel, login or accounts, per-person lists.

Constraints kept from the original build: no login; Gemini Flash is the only AI; pages never call YouTube or Gemini on view; secrets never printed. One new table is added (the original brief allowed four; the owner approved this fifth on 2026-10-13).

## 3. Navigation

`Brief · Saved ideas · Earlier weeks · Settings`. The Saved ideas link shows a count badge (omitted when 0). The header grid and the mobile full-screen menu keep working with four links.

## 4. Data

New table `ideas` (created by `scripts/migrate.mjs`, idempotent):

| Column | Type | Meaning |
|---|---|---|
| `id` | serial primary key | |
| `topic_key` | text, **unique** | `"<week_start>:<lowercased cluster name>"`. Stops the same topic being saved twice in a week, including after a regenerate |
| `brief_id` | int | The brief it was saved from |
| `week_start` | date | Week the brief belongs to |
| `cluster` | jsonb | Full copy of the cluster at save time (name, why-now, angle, stats, formats, videos). Survives later briefs |
| `suggested_at` | timestamptz | Copy of the brief's `created_at` |
| `saved_at` | timestamptz default now() | When Ishaan saved it |
| `stage` | text, one of `saved`, `filming`, `published` | Default `saved` |
| `stage_changed_at` | timestamptz default now() | |

Existing tables are not changed.

## 5. Server routes (no login; every body is validated with zod)

- `GET /api/ideas` → `{ ideas: [...] }`, uncached. Used by the Saved page data and by the Brief page to fill in bookmarks (it returns `topic_key` and `stage`).
- `POST /api/ideas` body `{ briefId, clusterIndex }`. The server loads that brief itself and copies the cluster (the browser never sends cluster content). Idempotent on `topic_key`. Rejects when 200 ideas already exist.
- `PATCH /api/ideas/[id]` body `{ stage }`. Updates `stage` and `stage_changed_at`.
- `DELETE /api/ideas/[id]`. Un-save. Undo is a fresh `POST`, which restores the same idea with a new `saved_at`.

Each write calls `revalidatePath("/saved")`. Responses use `Cache-Control: no-store`.

## 6. Pages and components

- **`/saved`**: server-rendered from Neon, cached like the other pages (revalidate 1 h plus on-demand). Idea cards are a client component so stage changes and un-save are instant (optimistic, rolled back with a message on failure).
- **Time buckets** (computed in the browser, in IST, from `saved_at`): *Today*, *Yesterday*, *Earlier this week* (since the most recent Sunday), *Last week*, *Older*. Empty buckets are hidden. Newest first inside a bucket.
- **Relative wording** (browser, recomputed on load and every minute): under 1 minute "just now"; under 60 minutes "N min ago"; under 24 hours "N hours ago"; then "1 day ago", "N days ago"; from 14 days "N weeks ago". Labels read "Saved …" and "Suggested …". Using the browser avoids stale text on cached pages.
- **Bookmark button**: toggles save. Fills when saved. `aria-pressed`, accessible name "Save idea" / "Remove from saved ideas", at least 44 px target. Saved state comes from `GET /api/ideas` after the page paints.
- **Swipe-right to save (touch only)**: horizontal drag with a threshold of 80 px that must dominate vertical movement, so scrolling and the browser's back gesture are never fought. The button remains for everyone. Not used for pointer or keyboard users.
- **Empty state** on Saved ideas: explains saving and links back to the Brief.

## 7. Quick wins

1. **Email deep links.** Each topic title in the email links to `<site>/?b=<briefId>#topic-<n>`. Cards get `id="topic-<n>"`. On load the client scrolls to the card and opens its sheet only if `b` equals the latest brief's id; otherwise it ignores the link. The page stays static (the query is read in the browser only).
2. **"New" dot.** The browser stores which cards of each brief were opened (`localStorage`, key per brief id, safe if blocked). Unopened cards show a small dot with the accessible text "New to you".
3. **Settings shortcut.** After a successful save, the form shows "Make a brief with these now". It signals the header's Generate now panel to open (a small window event). The panel and its limits (10-minute pause, 20 a day) are unchanged.
4. **Earlier weeks grouping.** One row per `week_start` showing the newest brief of that week and its time. Older runs of that week are listed under "+N more runs" (expandable links).
5. **"How to read this".** A "?" button near the Topic clusters heading opens the existing sheet with four short plain lines: views per hour, the status tags, typical length, engagement.

## 8. Failure behaviour

- The saved-state request fails: bookmarks show as unsaved and a polite status message says "Couldn't load your saved ideas".
- Save, stage or un-save fails: the optimistic change is rolled back and a message says what to do (try again; if it repeats, the list may be full at 200).
- The database table is missing (migration not run): routes return a clear 500; the Brief page still works.

## 9. Testing and rollout

- **Script test** (`node`, no new dependency) for the bucket and relative-time functions: boundary cases around midnight IST, Sunday week start, 59 minutes vs 1 hour, 13 vs 14 days.
- **Browser check** at 375 px and 1440 px: save, un-save with undo, stage changes, new-dot behaviour, email-style deep link, settings shortcut, Earlier weeks grouping, the help panel, swipe on emulated touch.
- **API check** with curl: validation errors, duplicate save, the 200 cap, delete of a missing id.
- Run `npm run migrate`, typecheck, build, commit, push, deploy to production, then re-run the API and page checks on the live URL.
- Update the README (new page, the new table, the shared-list caveat).

## 10. Risks

- **Shared list, no login:** anyone with the link can add, change or remove saved ideas. Accepted for a single-creator tool; limited by validation, the 200 cap, and the fact that the server copies cluster content itself.
- **Assumption to watch:** that Ishaan actually uses Save. Cheapest signal: count of rows in `ideas` after two weeks.
- **Swipe conflicts:** mitigated by the threshold and direction lock; if testing shows it fights scrolling it is removed and the button remains.
