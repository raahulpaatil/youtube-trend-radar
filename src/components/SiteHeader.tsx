"use client";

import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { loadIdeas, useIdeas } from "@/lib/ideas-client";
import { intro } from "@/lib/intro";
import { AppearLink, Appear } from "./Appear";
import { GenerateNow } from "./GenerateNow";

const LINKS = [
  { href: "/", label: "Brief", kind: "scale", delay: 0.16 },
  { href: "/saved", label: "Saved ideas", kind: "soft", delay: 0.28 },
  { href: "/weeks", label: "Earlier weeks", kind: "scale", delay: 0.4 },
  { href: "/settings", label: "Settings", kind: "soft", delay: 0.52 },
] as const;

function Logo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" opacity="0.55" />
      <path d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5" />
      <path d="M12 12l5.2-5.2" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { ideas, status } = useIdeas();
  const savedCount = status === "ready" ? ideas.length : 0;

  useEffect(() => {
    void loadIdeas();
  }, []);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  // The entrance choreography counts as played once its last element has landed.
  useEffect(() => {
    const t = window.setTimeout(() => (intro.played = true), 2800);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);
    return () => document.body.classList.remove("menu-open");
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    const mq = window.matchMedia("(min-width: 901px)");
    const onChange = () => mq.matches && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onChange);
    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onChange);
    };
  }, []);

  return (
    <>
      <div className="menu-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <header className={`header${scrolled ? " is-scrolled" : ""}`}>
        <AppearLink href="/" className="logo" aria-label="YouTube Trend Radar home" kind="scale" delay={0.08} onClick={() => setMenuOpen(false)}>
          <Logo />
          <span>
            Trend<span className="logo-suffix"> Radar</span>
          </span>
        </AppearLink>

        <nav id="site-nav" className="nav" aria-label="Primary">
          {LINKS.map((l) => (
            <AppearLink
              key={l.href}
              href={l.href}
              kind={l.kind}
              delay={l.delay}
              className="nav-link"
              aria-current={isActive(l.href) ? "page" : undefined}
              aria-label={l.href === "/saved" && savedCount > 0 ? `Saved ideas, ${savedCount} saved` : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {isActive(l.href) && (
                <motion.span
                  layoutId="nav-active"
                  className="nav-active"
                  transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                />
              )}
              <span className="nav-label">{l.label}</span>
              {l.href === "/saved" && savedCount > 0 && (
                <span className="nav-count" aria-hidden="true">
                  {savedCount}
                </span>
              )}
            </AppearLink>
          ))}
        </nav>

        <Appear kind="scale" delay={0.34} className="header-cta">
          <GenerateNow className="btn btn-solid" />
        </Appear>

        <button
          type="button"
          className="burger"
          aria-controls="site-nav"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>
    </>
  );
}
