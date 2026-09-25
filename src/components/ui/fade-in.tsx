"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useMemo } from "react";

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
}

export function FadeIn({
  children,
  className,
  delay = 0,
  direction = "up",
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });

  // useMemo évite la recréation de l'objet variants à chaque rendu
  const variants = useMemo(
    () => ({
      hidden: {
        opacity: 0,
        y: direction === "up" ? 24 : direction === "down" ? -24 : 0,
        x: direction === "left" ? 24 : direction === "right" ? -24 : 0,
      },
      visible: {
        opacity: 1,
        y: 0,
        x: 0,
        transition: { duration: 0.6, delay, ease: "easeOut" as const },
      },
    }),
    [direction, delay]
  );

  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  );
}
