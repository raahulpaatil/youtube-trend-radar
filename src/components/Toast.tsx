"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { dismissNotice, useIdeas } from "@/lib/ideas-client";

/** Small message at the bottom of the screen, announced politely to screen readers. */
export function Toast() {
  const { notice } = useIdeas();
  const reduce = useReducedMotion();
  return (
    <div className="toast-host" role="status" aria-live="polite">
      <AnimatePresence>
        {notice && (
          <motion.div
            key={notice.id}
            className="toast"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ type: "spring", bounce: 0, duration: 0.35 }}
          >
            <span>{notice.text}</span>
            {notice.undo && (
              <button
                type="button"
                className="toast-undo"
                onClick={() => {
                  notice.undo?.();
                  dismissNotice();
                }}
              >
                Undo
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
