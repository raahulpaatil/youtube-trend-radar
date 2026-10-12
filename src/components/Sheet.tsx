"use client";

import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "motion/react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Critically damped: no bounce, settles in about 0.35 s. Always starts from the live value. */
const SPRING = { type: "spring", bounce: 0, duration: 0.35 } as const;
const FADE = { duration: 0.2, ease: "easeOut" } as const;

/** Where a flick would come to rest (Apple's projection, deceleration 0.998). */
const project = (velocity: number, rate = 0.998) => ((velocity / 1000) * rate) / (1 - rate);

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode };

export function Sheet({ open, onClose, title, children }: Props) {
  const reduce = useReducedMotion();
  const titleId = useId();
  const [mounted, setMounted] = useState(open);
  const openRef = useRef(open);
  const fresh = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const controls = useDragControls();
  const y = useMotionValue(0);
  const fade = useMotionValue(1);
  const running = useRef<{ stop: () => void }[]>([]);

  const height = useCallback(
    () => panelRef.current?.offsetHeight ?? (typeof window === "undefined" ? 800 : window.innerHeight),
    [],
  );
  const backdrop = useTransform([y, fade], ([yy, f]: number[]) => f * (1 - Math.min(1, Math.max(0, yy / height()))));

  const stopAll = () => {
    running.current.forEach((a) => a.stop());
    running.current = [];
  };

  const present = useCallback(
    (velocity = 0) => {
      stopAll();
      if (reduce) {
        y.set(0);
        running.current = [animate(fade, 1, FADE)];
      } else {
        fade.set(1);
        running.current = [animate(y, 0, { ...SPRING, velocity })];
      }
    },
    [reduce, y, fade],
  );

  const dismiss = useCallback(
    (velocity = 0) => {
      stopAll();
      const done = () => {
        if (!openRef.current) setMounted(false);
      };
      if (reduce) {
        running.current = [animate(fade, 0, { ...FADE, onComplete: done })];
      } else {
        running.current = [animate(y, height(), { ...SPRING, velocity, onComplete: done })];
      }
    },
    [reduce, y, fade, height],
  );

  useEffect(() => {
    openRef.current = open;
    if (open) {
      if (!mounted) {
        returnFocus.current = document.activeElement as HTMLElement | null;
        fresh.current = true;
        setMounted(true);
      } else {
        present(); // re-opened while closing: continue from where it is
      }
    } else if (mounted) {
      dismiss(velocityOnClose.current);
      velocityOnClose.current = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const velocityOnClose = useRef(0);

  useLayoutEffect(() => {
    if (mounted && fresh.current) {
      fresh.current = false;
      if (reduce) {
        y.set(0);
        fade.set(0);
      } else {
        fade.set(1);
        y.set(height());
      }
      present();
      panelRef.current?.focus({ preventScroll: true });
    }
  }, [mounted, reduce, y, fade, height, present]);

  useEffect(() => {
    if (!mounted) {
      returnFocus.current?.focus({ preventScroll: true });
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mounted, onClose]);

  function onDragEnd(_: PointerEvent, info: PanInfo) {
    const vy = info.velocity.y;
    const projected = y.get() + project(vy);
    if (projected > height() * 0.5 || vy > 800) {
      velocityOnClose.current = vy;
      onClose();
    } else {
      present(vy);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div className="sheet-root">
      <motion.div className="sheet-backdrop" style={{ opacity: backdrop }} onPointerDown={onClose} aria-hidden="true" />
      <motion.div
        ref={panelRef}
        className="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{ y, opacity: fade }}
        drag={reduce ? false : "y"}
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        dragMomentum={false}
        onDragEnd={onDragEnd}
      >
        <div className="sheet-head" onPointerDown={(e) => !reduce && controls.start(e)}>
          <span className="grabber" aria-hidden="true" />
          <h2 id={titleId} className="sheet-title">
            {title}
          </h2>
          <button
            type="button"
            className="sheet-close"
            aria-label="Close"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onClose}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
            </svg>
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </motion.div>
    </div>,
    document.body,
  );
}
