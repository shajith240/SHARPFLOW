"use client";
import { type JSX } from "react";
import { motion, Transition } from "framer-motion";
import { cn } from "@/lib/utils";

type TextShimmerWave = {
  children: string;
  as?: React.ElementType;
  className?: string;
  duration?: number;
  zDistance?: number;
  xDistance?: number;
  yDistance?: number;
  spread?: number;
  scaleDistance?: number;
  rotateYDistance?: number;
  transition?: Transition;
};

export function TextShimmerWave({
  children,
  as: Component = "p",
  className,
  duration = 1,
  zDistance = 10,
  xDistance = 2,
  yDistance = -2,
  spread = 1,
  scaleDistance = 1.1,
  rotateYDistance = 10,
  transition,
}: TextShimmerWave) {
  const MotionComponent = motion.create(
    Component as keyof JSX.IntrinsicElements
  );

  // Calculate smooth timing for wave effect with proper character coverage
  const totalCharacters = children.length;
  const waveDelay = (duration * 0.8) / totalCharacters; // Use 80% of duration for wave progression

  return (
    <MotionComponent
      className={cn(
        "relative inline-block [perspective:800px]",
        "[--base-color:#a1a1aa] [--base-gradient-color:#000]",
        "dark:[--base-color:#71717a] dark:[--base-gradient-color:#ffffff]",
        className
      )}
      style={{ color: "var(--base-color)" }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
    >
      {children.split("").map((char, i) => {
        // Smooth, consistent delay calculation ensuring all characters animate
        const delay = (i * waveDelay) / spread;

        return (
          <motion.span
            key={`${char}-${i}`}
            className={cn(
              "inline-block whitespace-pre [transform-style:preserve-3d] will-change-transform"
            )}
            initial={{
              opacity: 0.4,
              color: "var(--base-color)",
            }}
            animate={{
              opacity: [0.4, 1, 0.4],
              color: [
                "var(--base-color)",
                "var(--base-gradient-color)",
                "var(--base-color)",
              ],
            }}
            transition={{
              duration: duration,
              repeat: Infinity,
              repeatDelay: 0.3, // Longer delay between cycles for complete animation
              delay,
              ease: [0.4, 0, 0.2, 1], // Custom cubic-bezier for smooth easing
              type: "tween",
              ...transition,
            }}
          >
            {char}
          </motion.span>
        );
      })}
    </MotionComponent>
  );
}
