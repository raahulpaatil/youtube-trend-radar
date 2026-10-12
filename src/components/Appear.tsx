"use client";

import { motion, useReducedMotion, type TargetAndTransition } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { intro } from "@/lib/intro";

/** Same easing as the reference: a long, soft deceleration. */
const EASE = [0.16, 1, 0.3, 1] as const;

export type Kind = "scale" | "soft" | "mask" | "pop" | "btn" | "side" | "stat";

const FROM: Record<Kind, TargetAndTransition> = {
  scale: { opacity: 0, scale: 0.84 },
  soft: { opacity: 0, y: 14 },
  mask: { opacity: 0, y: "40%" },
  pop: { opacity: 0, scale: 0.9 },
  btn: { opacity: 0, y: 18, scale: 0.94 },
  side: { opacity: 0, x: 22 },
  stat: { opacity: 0, y: 20 },
};

const REST: TargetAndTransition = { opacity: 1, x: 0, y: 0, scale: 1 };
const POP: TargetAndTransition = { opacity: 1, x: 0, y: 0, scale: [0.9, 1.03, 1] };

type Tag = "div" | "span" | "p" | "li";
const TAGS = { div: motion.div, span: motion.span, p: motion.p, li: motion.li } as const;
const MotionLink = motion.create(Link);

function useAppear(kind: Kind, delay: number, duration: number) {
  const reduce = useReducedMotion();
  const play = !reduce && !intro.played;
  return {
    initial: play ? FROM[kind] : false,
    animate: kind === "pop" ? POP : REST,
    transition: { duration, delay, ease: EASE },
  } as const;
}

type Props = { kind: Kind; delay?: number; duration?: number; className?: string; children: ReactNode };

export function Appear({
  as = "div",
  kind,
  delay = 0.08,
  duration = 1.05,
  className,
  children,
}: Props & { as?: Tag }) {
  const M = TAGS[as];
  return (
    <M data-motion className={className} {...useAppear(kind, delay, duration)}>
      {children}
    </M>
  );
}

type LinkProps = {
  href: string;
  className?: string;
  onClick?: () => void;
  "aria-label"?: string;
  "aria-current"?: "page";
};

export function AppearLink({ kind, delay = 0.08, duration = 1.05, children, ...rest }: LinkProps & Props) {
  return (
    <MotionLink data-motion {...rest} {...useAppear(kind, delay, duration)}>
      {children}
    </MotionLink>
  );
}
