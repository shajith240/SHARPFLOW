import React, { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface ParallaxSectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  backgroundImage?: string;
  backgroundContent?: React.ReactNode;
  className?: string;
  backgroundClassName?: string;
  contentClassName?: string;
  speed?: number; // Speed of parallax effect (0-1)
  direction?: "up" | "down"; // Direction of parallax movement
  disabled?: boolean; // Disable parallax on mobile
}

export function ParallaxSection({
  children,
  backgroundImage,
  backgroundContent,
  className,
  backgroundClassName,
  contentClassName,
  speed = 0.3,
  direction = "up",
  disabled = false,
  ...props
}: ParallaxSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const shouldDisable = disabled && isMobile;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // Calculate parallax effect based on direction
  const parallaxValue =
    direction === "up"
      ? useTransform(scrollYProgress, [0, 1], ["0%", `${speed * 100}%`])
      : useTransform(scrollYProgress, [0, 1], [`${speed * 100}%`, "0%"]);

  return (
    <motion.section
      ref={sectionRef}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      {/* Background layer with parallax effect */}
      {(backgroundImage || backgroundContent) && (
        <motion.div
          className={cn("absolute inset-0 w-full h-full", backgroundClassName)}
          style={{
            y: shouldDisable ? 0 : parallaxValue,
            backgroundImage: backgroundImage
              ? `url(${backgroundImage})`
              : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {backgroundContent}
        </motion.div>
      )}

      {/* Content layer */}
      <div className={cn("relative z-10", contentClassName)}>{children}</div>
    </motion.section>
  );
}

// Parallax item that animates when scrolled into view
interface ParallaxItemProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  distance?: number; // Distance to travel in pixels
  duration?: number; // Animation duration in seconds
  once?: boolean; // Only animate once
}

export function ParallaxItem({
  children,
  className,
  delay = 0,
  direction = "up",
  distance = 50,
  duration = 0.8,
  once = true,
}: ParallaxItemProps) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Determine initial position based on direction
  const getInitialPosition = () => {
    if (isMobile) return {}; // No animation on mobile

    switch (direction) {
      case "up":
        return { y: distance };
      case "down":
        return { y: -distance };
      case "left":
        return { x: distance };
      case "right":
        return { x: -distance };
      default:
        return { y: distance };
    }
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={getInitialPosition()}
      animate={isInView ? { x: 0, y: 0, opacity: 1 } : { opacity: 0 }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1.0], // Cubic bezier for smooth animation
      }}
      whileInView={{ x: 0, y: 0, opacity: 1 }}
      viewport={{ once, margin: "-100px" }}
      onViewportEnter={() => setIsInView(true)}
    >
      {children}
    </motion.div>
  );
}
