import React, { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";
import { useScrollAnimation } from "@/hooks/use-dashboard-scroll";

interface DashboardParallaxSectionProps {
  children: React.ReactNode;
  className?: string;
  speed?: number;
  direction?: "up" | "down";
  disabled?: boolean;
  backgroundPattern?: "dots" | "grid" | "gradient" | "none";
}

export function DashboardParallaxSection({
  children,
  className,
  speed = 0.2,
  direction = "up",
  disabled = false,
  backgroundPattern = "none",
  ...props
}: DashboardParallaxSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // Create smooth spring animation for parallax
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Calculate parallax effect based on direction
  const parallaxValue = useTransform(
    smoothProgress,
    [0, 1],
    direction === "up" ? ["0%", `${speed * 100}%`] : [`${speed * 100}%`, "0%"]
  );

  const getBackgroundPattern = () => {
    switch (backgroundPattern) {
      case "dots":
        return "radial-gradient(circle at 1px 1px, hsl(var(--dashboard-border-primary)) 1px, transparent 0)";
      case "grid":
        return `
          linear-gradient(hsl(var(--dashboard-border-primary)) 1px, transparent 1px),
          linear-gradient(90deg, hsl(var(--dashboard-border-primary)) 1px, transparent 1px)
        `;
      case "gradient":
        return "radial-gradient(ellipse at center, hsl(var(--dashboard-bg-secondary)) 0%, hsl(var(--dashboard-bg-primary)) 100%)";
      default:
        return "none";
    }
  };

  const getBackgroundSize = () => {
    switch (backgroundPattern) {
      case "dots":
        return "20px 20px";
      case "grid":
        return "20px 20px, 20px 20px";
      default:
        return "auto";
    }
  };

  return (
    <motion.section
      ref={sectionRef}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      {/* Background pattern layer */}
      {backgroundPattern !== "none" && (
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{
            y: disabled ? 0 : parallaxValue,
            backgroundImage: getBackgroundPattern(),
            backgroundSize: getBackgroundSize(),
            backgroundRepeat:
              backgroundPattern === "gradient" ? "no-repeat" : "repeat",
          }}
        />
      )}

      {/* Content layer */}
      <div className="relative z-10">{children}</div>
    </motion.section>
  );
}

interface DashboardParallaxItemProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  distance?: number;
  duration?: number;
  once?: boolean;
  threshold?: number;
}

export function DashboardParallaxItem({
  children,
  className,
  delay = 0,
  direction = "up",
  distance = 30,
  duration = 0.6,
  once = true,
  threshold = 0.1,
}: DashboardParallaxItemProps) {
  const { isVisible, setElement } = useScrollAnimation({
    threshold,
    triggerOnce: once,
    rootMargin: "-50px",
  });

  const getInitialPosition = () => {
    switch (direction) {
      case "up":
        return { y: distance, opacity: 0 };
      case "down":
        return { y: -distance, opacity: 0 };
      case "left":
        return { x: distance, opacity: 0 };
      case "right":
        return { x: -distance, opacity: 0 };
      default:
        return { y: distance, opacity: 0 };
    }
  };

  return (
    <motion.div
      ref={setElement}
      className={className}
      initial={getInitialPosition()}
      animate={isVisible ? { x: 0, y: 0, opacity: 1 } : getInitialPosition()}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1.0],
      }}
    >
      {children}
    </motion.div>
  );
}

interface DashboardFloatingElementProps {
  children: React.ReactNode;
  className?: string;
  amplitude?: number;
  frequency?: number;
  delay?: number;
}

export function DashboardFloatingElement({
  children,
  className,
  amplitude = 10,
  frequency = 2,
  delay = 0,
}: DashboardFloatingElementProps) {
  return (
    <motion.div
      className={className}
      animate={{
        y: [-amplitude, amplitude, -amplitude],
      }}
      transition={{
        duration: frequency,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}

interface DashboardStaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  once?: boolean;
}

export function DashboardStaggerContainer({
  children,
  className,
  staggerDelay = 0.1,
  once = true,
}: DashboardStaggerContainerProps) {
  const { isVisible, setElement } = useScrollAnimation({
    threshold: 0.1,
    triggerOnce: once,
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  return (
    <motion.div
      ref={setElement}
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate={isVisible ? "visible" : "hidden"}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

interface DashboardGlowEffectProps {
  children: React.ReactNode;
  className?: string;
  color?: "primary" | "secondary" | "success" | "warning" | "error";
  intensity?: "low" | "medium" | "high";
  animated?: boolean;
}

export function DashboardGlowEffect({
  children,
  className,
  color = "primary",
  intensity = "medium",
  animated = false,
}: DashboardGlowEffectProps) {
  const getGlowColor = () => {
    switch (color) {
      case "primary":
        return "hsl(var(--dashboard-primary))";
      case "secondary":
        return "hsl(var(--dashboard-secondary))";
      case "success":
        return "hsl(var(--dashboard-status-success))";
      case "warning":
        return "hsl(var(--dashboard-status-warning))";
      case "error":
        return "hsl(var(--dashboard-status-error))";
      default:
        return "hsl(var(--dashboard-primary))";
    }
  };

  const getGlowIntensity = () => {
    switch (intensity) {
      case "low":
        return "0 0 10px";
      case "high":
        return "0 0 30px";
      default:
        return "0 0 20px";
    }
  };

  const glowStyle = {
    boxShadow: `${getGlowIntensity()} ${getGlowColor()}`,
  };

  const animatedGlowStyle = animated
    ? {
        ...glowStyle,
        animation: "dashboard-glow 2s ease-in-out infinite alternate",
      }
    : glowStyle;

  return (
    <div className={cn("relative", className)} style={animatedGlowStyle}>
      {children}
      <style>{`
        @keyframes dashboard-glow {
          from {
            box-shadow: ${getGlowIntensity()} ${getGlowColor()};
          }
          to {
            box-shadow: 0 0
              ${parseInt(getGlowIntensity().split(" ")[2]) * 1.5}px
              ${getGlowColor()};
          }
        }
      `}</style>
    </div>
  );
}
