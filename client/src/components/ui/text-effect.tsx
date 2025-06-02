"use client";

import { cn } from "@/lib/utils";
import {
  AnimatePresence,
  motion,
  TargetAndTransition,
  Variants,
} from "framer-motion";
import React from "react";

type PresetType = "blur" | "shake" | "scale" | "fade" | "slide" | "shimmer";

type TextEffectProps = {
  children: string;
  per?: "word" | "char" | "line";
  as?: keyof React.JSX.IntrinsicElements;
  variants?: {
    container?: Variants;
    item?: Variants;
  };
  className?: string;
  preset?: PresetType;
  delay?: number;
  trigger?: boolean;
  onAnimationComplete?: () => void;
  segmentWrapperClassName?: string;
};

const defaultStaggerTimes: Record<"char" | "word" | "line", number> = {
  char: 0.03,
  word: 0.05,
  line: 0.1,
};

const defaultContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
  exit: {
    transition: { staggerChildren: 0.05, staggerDirection: -1 },
  },
};

const defaultItemVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
  },
  exit: { opacity: 0 },
};

const presetVariants: Record<
  PresetType,
  { container: Variants; item: Variants }
> = {
  blur: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
      exit: { opacity: 0 },
    },
  },
  shake: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.3 } },
      exit: { opacity: 0 },
    },
  },
  scale: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
      exit: { opacity: 0 },
    },
  },
  fade: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
      exit: { opacity: 0 },
    },
  },
  slide: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
      exit: { opacity: 0 },
    },
  },
  shimmer: {
    container: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.04,
          delayChildren: 0.05,
        },
      },
      exit: {
        transition: { staggerChildren: 0.03, staggerDirection: -1 },
      },
    },
    item: {
      hidden: {
        opacity: 0.4,
        color: "#71717a",
        textShadow: "0 0 0px transparent",
      },
      visible: {
        opacity: [0.4, 1, 1, 0],
        color: ["#71717a", "#C1FF72", "#38B6FF", "#ffffff"],
        textShadow: [
          "0 0 0px transparent",
          "0 0 2px #C1FF72",
          "0 0 6px #38B6FF",
          "0 0 0px transparent",
        ],
        transition: {
          duration: 1.3,
          ease: "easeInOut",
        },
      },
      exit: {
        opacity: 0,
        color: "#71717a",
        textShadow: "0 0 0px transparent",
      },
    },
  },
};

const AnimationComponent: React.FC<{
  segment: string;
  variants: Variants;
  per: "line" | "word" | "char";
  segmentWrapperClassName?: string;
}> = React.memo(({ segment, variants, per, segmentWrapperClassName }) => {
  const content =
    per === "line" ? (
      <motion.span variants={variants} className="block">
        {segment}
      </motion.span>
    ) : per === "word" ? (
      <motion.span
        aria-hidden="true"
        variants={variants}
        className="inline-block whitespace-pre"
      >
        {segment}
      </motion.span>
    ) : (
      <motion.span className="inline-block whitespace-pre">
        {segment.split("").map((char, charIndex) => (
          <motion.span
            key={`char-${charIndex}`}
            aria-hidden="true"
            variants={variants}
            className="inline-block whitespace-pre font-sans antialiased"
            style={{
              fontFeatureSettings: '"liga" 1, "kern" 1',
              textRendering: "optimizeLegibility",
              WebkitFontSmoothing: "antialiased",
              MozOsxFontSmoothing: "grayscale",
            }}
          >
            {char}
          </motion.span>
        ))}
      </motion.span>
    );

  if (!segmentWrapperClassName) {
    return content;
  }

  const defaultWrapperClassName = per === "line" ? "block" : "inline-block";

  return (
    <span className={cn(defaultWrapperClassName, segmentWrapperClassName)}>
      {content}
    </span>
  );
});

AnimationComponent.displayName = "AnimationComponent";

export function TextEffect({
  children,
  per = "word",
  as = "p",
  variants,
  className,
  preset,
  delay = 0,
  trigger = true,
  onAnimationComplete,
  segmentWrapperClassName,
}: TextEffectProps) {
  let segments: string[];

  if (per === "line") {
    segments = children.split("\n");
  } else if (per === "word") {
    segments = children.split(/(\s+)/);
  } else {
    segments = children.split("");
  }

  const MotionTag = motion[as as keyof typeof motion] as typeof motion.div;
  const selectedVariants = preset
    ? presetVariants[preset]
    : { container: defaultContainerVariants, item: defaultItemVariants };
  const containerVariants = variants?.container || selectedVariants.container;
  const itemVariants = variants?.item || selectedVariants.item;
  const ariaLabel = per === "line" ? undefined : children;

  const stagger = defaultStaggerTimes[per];

  const delayedContainerVariants: Variants = {
    hidden: containerVariants.hidden,
    visible: {
      ...containerVariants.visible,
      transition: {
        ...(containerVariants.visible as TargetAndTransition)?.transition,
        staggerChildren:
          (containerVariants.visible as TargetAndTransition)?.transition
            ?.staggerChildren || stagger,
        delayChildren: delay,
      },
    },
    exit: containerVariants.exit,
  };

  return (
    <AnimatePresence mode="popLayout">
      {trigger && (
        <MotionTag
          initial="hidden"
          animate="visible"
          exit="exit"
          aria-label={ariaLabel}
          variants={delayedContainerVariants}
          className={cn("whitespace-pre-wrap font-sans antialiased", className)}
          style={{
            fontFeatureSettings: '"liga" 1, "kern" 1',
            textRendering: "optimizeLegibility",
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
          }}
          onAnimationComplete={onAnimationComplete}
        >
          {segments.map((segment, index) => (
            <AnimationComponent
              key={`${per}-${index}-${segment}`}
              segment={segment}
              variants={itemVariants}
              per={per}
              segmentWrapperClassName={segmentWrapperClassName}
            />
          ))}
        </MotionTag>
      )}
    </AnimatePresence>
  );
}
