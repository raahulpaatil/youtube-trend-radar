# YouTube Trend Radar

A small web app for **Ishaan**, a tech YouTuber for Indian audiences. Every Sunday morning it looks at live YouTube data, groups what it finds into **3 to 5 topic clusters**, emails him a brief, and keeps the brief on a public page.

It shows what is **already clustering and rising now, and why this week**. It never predicts what will peak next. What to film stays Ishaan's decision.

- **Live app:** https://youtube-trend-radar-iota.vercel.app
- **Code:** https://github.com/raahulpaatil/youtube-trend-radar
- **Components Map:** [`docs/components-map.html`](docs/components-map.html) (also as an image: [`docs/components-map.jpg`](docs/components-map.jpg)). It shows the flow from trigger to delivery and where the human decisions sit.
- **Built with:** Next.js on Vercel, YouTube Data API v3, Gemini Flash (the only AI used), Neon Postgres, Resend, Vercel Cron.

## How it works, in plain English

1. **Trigger.** Vercel runs the app on Sunday at 01:00 UTC (6:30 am IST, with up to an hour of delay on the free plan). You can also press **Generate now** on the Brief page.
2. **Settings.** It reads the region, categories and keywords saved on the Settings page.
3. **Fetch.** It asks YouTube for the trending chart of each chosen category in the region, plus uploads from the last 7 days for each keyword, and then each video's views, likes, comments, length and publish time.
4. **Fallback.** If YouTube cannot be reached, it uses the last good snapshot saved in the database and marks the brief **stale** (a yellow banner appears on the page).
5. **Compute.** Code (not the AI) removes duplicates and computes views per hour, length bucket and engagement. The top 120 videos by views per hour go to Gemini.
6. **Cluster.** Gemini Flash only groups the videos by ID, names the groups, labels each video's format, and writes a "why now" line and a suggested angle, using only the videos it was given. It is told never to forecast.
7. **Check and save.** Code checks the answer (valid JSON, real video IDs, 2+ videos from 2+ channels per cluster, no forecast wording), computes every number again from the real data, and saves the brief in Neon. If the answer is invalid it retries once; if it is still invalid the run is marked failed and the previous brief stays visible.
8. **Deliver.** The brief goes to the public page and (for the Sunday run, or when "Also email me" is ticked) to Ishaan by email.

Opening the brief page only reads the database. It never calls YouTube or Gemini.

**Speed.** The pages are pre-built and cached, and refresh automatically when a new brief is saved or the settings change (with an hourly safety refresh). The app's server functions run in Singapore (`sin1`), next to the Neon database.

### Cluster status labels

Worked out by code by comparing with the brief from an earlier week:

- **New this week**: no matching cluster last week.
- **Rising now**: matched a cluster from last week and its typical views per hour grew by 20% or more.
- **Still going**: matched a cluster from last week without that growth.
- **First week, no comparison**: there is no earlier week to compare with yet.

## Look and feel

Pure black, liquid-metal navigation pills, glass buttons, Inter with italic serif accent words, and a looping video behind the Brief page's opening screen (it only plays while visible, and is off for reduced-motion and data-saver). Motion uses the Motion library: the entrance sequence plays once per visit, then tab switches are instant. A soft gradient sits behind the hero text so it stays readable over bright video frames. The design is dark only.

## Saved ideas

Tap the bookmark on any cluster (or swipe a card to the right on a phone) to keep it. The **Saved ideas** page groups what you saved into Today, Yesterday, Earlier this week, Last week and Older, and shows two labels on each: "Saved 1 day ago" (when you saved it) and "Suggested 2 days ago" (when that brief came out). Move each idea from Saved to Filming to Published as you go. Removing one shows an Undo.

Because there is no login, the saved list is shared by anyone with the link, and it is capped at 200 ideas. Each saved idea is a full copy of the cluster, so it stays even after newer briefs arrive.

Other small helpers: the Sunday email links each topic straight to its card, unopened cards show a small "new to you" dot, saving Settings offers "Make a brief with these now", Earlier weeks shows one row per week, and a "How to read this" button explains the numbers.

## Pages

| Page | What it does |
| --- | --- |
| **Brief** (`/`) | Latest brief: week title, "data as of" time (IST), 3 to 5 cluster cards. Tap a card for details: stats, winning formats, suggested angle and links to the supporting videos. Has the **Generate now** button. |
| **Saved ideas** (`/saved`) | The clusters you saved, grouped by when you saved them. |
| **Earlier weeks** (`/weeks`) | Past briefs, one row per week, newest first. |
| **Settings** (`/settings`) | Region, categories (the real list YouTube offers for that region) and keywords. The next brief uses them. |

## Regenerating a brief

- **Button:** Brief page, then **Generate now**, then Start. Four steps show live: Fetching, Analysing, Saving, Emailing. Tick **Also email me** to get an email. Limits: one run every 10 minutes and 20 a day (kept in the database).
- **The Sunday job by hand** (uses the secret, always emails):

  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR-SITE/api/cron/weekly
  ```

  Without the secret it answers `401`.

## Where each key goes

Keys live in a file called `.env.local` on your computer (never committed to GitHub) and in **Vercel, Settings, Environment Variables, Production** for the live app. `.env.example` lists the names with blank values.

| Name | What it is | Where to get it |
| --- | --- | --- |
| `YOUTUBE_API_KEY` | Lets the app read public YouTube data | Google Cloud Console, enable "YouTube Data API v3", Credentials, API key |
| `GEMINI_API_KEY` | Lets the app call Gemini | Google AI Studio, Get API key |
| `GEMINI_MODEL` | Which Gemini Flash model to use (currently `gemini-3.8-flash`) | Google's models page; change it here when Google retires a model |
| `DATABASE_URL` | Connection to the Neon database | Neon console, Connect, copy the connection string |
| `RESEND_API_KEY` | Lets the app send email | Resend, API Keys, Sending access |
| `SELF_EMAIL` | The only address emails are ever sent to | Your own email, **the same one you signed up to Resend with** |
| `CRON_SECRET` | Password that protects the Sunday job route | Any long random text; Vercel sends it automatically with the schedule |

Check that every name is filled in (it only prints names, never values):

```bash
npm run check-env
```

## Running it yourself

```bash
npm install
npm run migrate      # creates the four database tables (safe to run twice)
npm run dev          # opens http://localhost:3000
npm run verify       # checks the newest stored brief (see below)
npm run test:time    # checks the "Today / 1 day ago" wording rules
```

## Changing how the brief is written

Edit `prompts/cluster-brief.md`. It is the whole instruction given to Gemini (rules, fixed format list, and an example). No code change is needed; redeploy to apply it to the live app.

## Checks

`npm run verify` reads the newest brief from Neon and its snapshot, then confirms that every cluster video ID exists in that snapshot and that each cluster has at least 2 videos from at least 2 different channels.

## Limits to know about

- **YouTube quota.** Normal calls cost 1 unit from 10,000 a day. Search is limited separately to 100 calls a day, so one run makes at most 6 searches (one per keyword).
- **Free Vercel plan.** The Sunday job can fire anywhere within the scheduled hour, and one run may use at most 300 seconds (a run takes well under a minute).
- **Email.** Resend's test sender (`onboarding@resend.dev`) only delivers to the address the Resend account was created with. That is why email goes to `SELF_EMAIL` only.
- **No login.** As required, there are no accounts, so anyone with the link can open the Settings page and press Generate now. The 10-minute pause and the 20-runs-a-day limit protect the quota.

## Tables in Neon

`settings` (one row), `runs` (every run and its log), `snapshots` (the cleaned videos from each live fetch), `briefs` (clusters, model, stale flag, week label, created time), `ideas` (the clusters you saved, with when and at what stage).
