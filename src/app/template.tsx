"use client";

import { motion, useReducedMotion } from "motion/react";
import { intro } from "@/lib/intro";

/**
 * Remounts on every navigation: a short rise-and-fade so tab switches feel continuous.
 * Enter-only (nothing waits for an exit), and skipped on the very first load, where the hero has its own entrance.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const animate = !reduce && intro.played;
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
