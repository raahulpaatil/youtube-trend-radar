import { Resend } from "resend";
import { formatCount, formatIST, formatLength, formatPercent } from "./metrics";
import type { Brief } from "./types";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function siteUrl(origin?: string): string {
  if (origin) return origin;
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return prod ? `https://${prod}` : "http://localhost:3000";
}

export function renderBriefEmail(brief: Brief, pageUrl: string): string {
  const base = pageUrl.replace(/\/$/, "");
  const clusters = brief.clusters
    .map(
      (c, i) => `
    <div style="border:1px solid #e5e5ea;border-radius:14px;padding:18px;margin:0 0 16px;">
      <div style="font-size:12px;font-weight:600;color:#0071e3;text-transform:uppercase;letter-spacing:.04em;">${esc(c.status)}</div>
      <div style="font-size:20px;font-weight:700;letter-spacing:-0.02em;margin:4px 0 6px;"><a href="${esc(`${base}/?b=${brief.id}#topic-${i + 1}`)}" style="color:#1d1d1f;text-decoration:none;">${esc(c.name)}</a></div>
      <div style="font-size:15px;color:#3a3a3c;margin:0 0 12px;">${esc(c.whyNow)}</div>
      <div style="font-size:13px;color:#6e6e73;margin:0 0 12px;">
        ${c.stats.videos} videos &middot; ${c.stats.channels} channels &middot;
        ${formatCount(c.stats.medianViewsPerHour)} median views/hour &middot;
        ${formatLength(c.stats.medianLengthSec)} median length &middot;
        ${formatPercent(c.stats.medianEngagement)} engagement
      </div>
      <div style="font-size:14px;margin:0 0 6px;"><b>Winning formats:</b> ${c.winningFormats
        .map((f) => `${esc(f.format)} (${f.count})`)
        .join(", ")}</div>
      <div style="font-size:14px;margin:0 0 10px;"><b>Suggested angle:</b> ${esc(c.suggestedAngle)}</div>
      <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.6;">
        ${c.videos
          .slice(0, 6)
          .map(
            (v) =>
              `<li><a href="https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}" style="color:#0071e3;">${esc(v.title)}</a> <span style="color:#6e6e73;">${esc(v.channelTitle)}</span></li>`,
          )
          .join("")}
      </ul>
    </div>`,
    )
    .join("");

  return `<!doctype html><html><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1d1d1f;">
  <div style="max-width:620px;margin:0 auto;padding:24px 16px;">
    <div style="font-size:28px;font-weight:700;letter-spacing:-0.02em;">${esc(brief.weekLabel)}</div>
    <div style="font-size:14px;color:#6e6e73;margin:4px 0 16px;">Data as of ${esc(formatIST(brief.dataAsOf))}</div>
    ${
      brief.stale
        ? `<div style="background:#fff4e5;border:1px solid #f5c36b;border-radius:10px;padding:12px;font-size:14px;margin:0 0 16px;">YouTube could not be reached, so this brief uses the last saved data from ${esc(formatIST(brief.dataAsOf))}.</div>`
        : ""
    }
    ${clusters}
    <p style="margin:24px 0;"><a href="${esc(pageUrl)}" style="background:#0071e3;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600;">Open the brief page</a></p>
    <p style="font-size:12px;color:#6e6e73;">This shows what has already happened on YouTube. It does not predict what will trend next.</p>
  </div></body></html>`;
}

/** Sends to SELF_EMAIL only, from Resend's test sender. */
export async function sendBriefEmail(brief: Brief, pageUrl: string): Promise<void> {
  const to = process.env.SELF_EMAIL;
  const key = process.env.RESEND_API_KEY;
  if (!to || !key) throw new Error("SELF_EMAIL or RESEND_API_KEY is not set");
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: "YouTube Trend Radar <onboarding@resend.dev>",
    to: [to],
    subject: `YouTube Trend Radar: ${brief.weekLabel}${brief.stale ? " (older data)" : ""}`,
    html: renderBriefEmail(brief, pageUrl),
  });
  if (error) throw new Error(`Resend: ${error.message}`);
}
