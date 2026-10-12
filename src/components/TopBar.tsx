"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Brief" },
  { href: "/weeks", label: "Earlier weeks" },
  { href: "/settings", label: "Settings" },
];

export function TopBar() {
  const pathname = usePathname();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand">
          YouTube Trend Radar
        </Link>
        <nav className="nav" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={active(l.href) ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
