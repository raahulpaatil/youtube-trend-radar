import type { Metadata, Viewport } from "next";
import { TopBar } from "@/components/TopBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "YouTube Trend Radar",
  description: "A weekly brief of the topic clusters surfacing on YouTube, built for a tech creator.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TopBar />
        <main className="page">{children}</main>
      </body>
    </html>
  );
}
