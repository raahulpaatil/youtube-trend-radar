import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { Toast } from "@/components/Toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  display: "swap",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "YouTube Trend Radar",
  description: "A weekly brief of the topic clusters surfacing on YouTube, built for a tech creator.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`}>
      <head>
        {/* Without JavaScript nothing may stay hidden waiting for an entrance animation. */}
        <noscript>
          <style>{`[data-motion]{opacity:1!important;transform:none!important;filter:none!important}`}</style>
        </noscript>
      </head>
      <body style={{ background: "#000", color: "#fff" }}>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <div className="grain" aria-hidden="true" />
        <SiteHeader />
        <main id="main">{children}</main>
        <Toast />
      </body>
    </html>
  );
}
