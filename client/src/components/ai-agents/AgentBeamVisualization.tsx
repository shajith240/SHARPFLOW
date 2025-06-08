"use client";

import React, { forwardRef, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { AnimatedBeam } from "@/components/magicui/animated-beam";
import { useMotionValue, useMotionTemplate, motion } from "framer-motion";
import { generateRandomString } from "@/components/ui/evervault-card";

const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode }
>(({ className, children }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "relative z-20 flex items-center justify-center rounded-full border-2",
        className
      )}
    >
      {children}
    </div>
  );
});

Circle.displayName = "Circle";

export function AgentBeamVisualization({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const prismRef = useRef<HTMLDivElement>(null);
  const falconRef = useRef<HTMLDivElement>(null);
  const sageRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Evervault effect state
  let mouseX = useMotionValue(0);
  let mouseY = useMotionValue(0);
  const [randomString, setRandomString] = useState("");
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });

  // Calculate text length based on container size with optimized spacing
  const calculateTextLength = (width: number, height: number) => {
    const area = width * height;
    // Reduced density for better readability: ~1 character per 12 pixels
    const baseLength = Math.max(3000, Math.floor(area / 12));
    // Cap at reasonable maximum for performance and visual clarity
    return Math.min(baseLength, 8000);
  };

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerDimensions({ width: rect.width, height: rect.height });
        const textLength = calculateTextLength(rect.width, rect.height);
        const str = generateRandomString(textLength);
        setRandomString(str);
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  function onMouseMove({ currentTarget, clientX, clientY }: any) {
    let { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);

    // Only regenerate text occasionally to avoid performance issues
    if (Math.random() < 0.1) {
      const textLength = calculateTextLength(
        containerDimensions.width,
        containerDimensions.height
      );
      const str = generateRandomString(textLength);
      setRandomString(str);
    }
  }

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden p-6 bg-black/50 rounded-lg border border-white/10 group/visualization",
        className
      )}
      ref={containerRef}
      onMouseMove={onMouseMove}
    >
      {/* Evervault Background Pattern */}
      <VisualizationPattern
        mouseX={mouseX}
        mouseY={mouseY}
        randomString={randomString}
        containerDimensions={containerDimensions}
      />
      <div className="flex size-full max-w-5xl flex-row items-center justify-between gap-8 sm:gap-12 lg:gap-16">
        {/* Left side - User Input */}
        <div className="flex flex-col justify-center">
          <Circle
            ref={userRef}
            className="size-12 sm:size-14 lg:size-16 border-white/40 bg-black/80 hover:border-white/60 shadow-[0_0_20px_-12px_rgba(255,255,255,0.4)] hover:shadow-[0_0_30px_-12px_rgba(255,255,255,0.6)] transition-all duration-300"
          >
            <div className="w-7 h-7 sm:w-9 sm:h-9 lg:w-11 lg:h-11 bg-gradient-to-br from-white/95 to-white/75 rounded-full flex items-center justify-center shadow-inner">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-black/90"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </Circle>
        </div>

        {/* Center - Prism Orchestrator */}
        <div className="flex flex-col justify-center">
          <Circle
            ref={prismRef}
            className="size-16 sm:size-18 lg:size-20 border-[#C1FF72]/50 bg-black/90 shadow-[0_0_30px_-12px_rgba(193,255,114,0.6)] hover:shadow-[0_0_40px_-12px_rgba(193,255,114,0.8)] transition-all duration-300"
          >
            <img
              src="/prism.svg"
              alt="Prism"
              className="w-9 h-9 sm:w-11 sm:h-11 lg:w-13 lg:h-13 object-contain drop-shadow-[0_0_8px_rgba(193,255,114,0.4)]"
            />
          </Circle>
        </div>

        {/* Right side - Specialist Agents */}
        <div className="flex flex-col justify-center gap-3 sm:gap-4 lg:gap-6">
          <Circle
            ref={falconRef}
            className="size-12 sm:size-14 lg:size-16 border-[#C1FF72]/30 bg-black/80 hover:border-[#C1FF72]/50 transition-all duration-300"
          >
            <img
              src="/close_up_short_falcon.png"
              alt="Falcon"
              className="w-7 h-7 sm:w-9 sm:h-9 lg:w-11 lg:h-11 object-cover rounded-full"
            />
          </Circle>
          <Circle
            ref={sageRef}
            className="size-12 sm:size-14 lg:size-16 border-[#38B6FF]/30 bg-black/80 hover:border-[#38B6FF]/50 transition-all duration-300"
          >
            <img
              src="/close_up_short_sage.png"
              alt="Sage"
              className="w-7 h-7 sm:w-9 sm:h-9 lg:w-11 lg:h-11 object-cover rounded-full"
            />
          </Circle>
          <Circle
            ref={sentinelRef}
            className="size-12 sm:size-14 lg:size-16 border-[#C1FF72]/30 bg-black/80 hover:border-[#C1FF72]/50 transition-all duration-300"
          >
            <img
              src="/close_up_short_sentinel.png"
              alt="Sentinel"
              className="w-7 h-7 sm:w-9 sm:h-9 lg:w-11 lg:h-11 object-cover rounded-full"
            />
          </Circle>
        </div>
      </div>

      {/* Stage 1: User → Prism (user input to orchestrator) */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={userRef}
        toRef={prismRef}
        duration={2.5}
        delay={0}
        gradientStartColor="#FFFFFF"
        gradientStopColor="#C1FF72"
        pathColor="rgba(255, 255, 255, 0.4)"
        pathWidth={3}
        curvature={0}
        className="z-10"
      />

      {/* Stage 2: Prism → AI Agents (orchestrator delegates to specialists) */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={prismRef}
        toRef={falconRef}
        duration={3}
        delay={1.5}
        gradientStartColor="#C1FF72"
        gradientStopColor="#38B6FF"
        pathColor="rgba(193, 255, 114, 0.4)"
        pathWidth={3}
        curvature={60}
        className="z-10"
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={prismRef}
        toRef={sageRef}
        duration={3.5}
        delay={2}
        gradientStartColor="#38B6FF"
        gradientStopColor="#C1FF72"
        pathColor="rgba(56, 182, 255, 0.4)"
        pathWidth={3}
        curvature={0}
        className="z-10"
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={prismRef}
        toRef={sentinelRef}
        duration={4}
        delay={2.5}
        gradientStartColor="#C1FF72"
        gradientStopColor="#38B6FF"
        pathColor="rgba(193, 255, 114, 0.4)"
        pathWidth={3}
        curvature={-60}
        className="z-10"
      />

      {/* Workflow Labels */}
      <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4">
        <div className="flex justify-between items-end text-xs text-white/60">
          <div className="text-left">
            <span className="text-white/80 font-medium">User</span>
            <br />
            <span className="text-white/50 text-[10px]">Input Source</span>
          </div>
          <div className="text-center">
            <span className="text-[#C1FF72]/90 font-medium">Prism</span>
            <br />
            <span className="text-white/50 text-[10px]">Orchestrator</span>
          </div>
          <div className="text-right">
            <div className="flex flex-col gap-1">
              <span className="text-[#C1FF72]/80">Falcon • Lead Gen</span>
              <span className="text-[#38B6FF]/80">Sage • Research</span>
              <span className="text-[#C1FF72]/80">Sentinel • Auto Reply</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Specialized pattern for the entire visualization background
function VisualizationPattern({
  mouseX,
  mouseY,
  randomString,
  containerDimensions,
}: {
  mouseX: any;
  mouseY: any;
  randomString: string;
  containerDimensions: { width: number; height: number };
}) {
  // Calculate responsive radial gradient size with reduced spread for focused effect
  const gradientSize = Math.max(
    450, // Reduced minimum size for more focused effect
    Math.min(containerDimensions.width, containerDimensions.height) * 0.6 // Reduced to 60% for less dominance
  );

  let maskImage = useMotionTemplate`radial-gradient(${gradientSize}px at ${mouseX}px ${mouseY}px, white, transparent)`;
  let style = { maskImage, WebkitMaskImage: maskImage };

  // Calculate responsive font size based on container dimensions
  const getFontSize = () => {
    const area = containerDimensions.width * containerDimensions.height;
    if (area > 800000) return "text-sm"; // Large screens (fullscreen)
    if (area > 400000) return "text-xs"; // Medium screens
    return "text-[10px]"; // Small screens
  };

  // Calculate responsive padding based on container size
  const getPadding = () => {
    const minDimension = Math.min(
      containerDimensions.width,
      containerDimensions.height
    );
    if (minDimension > 800) return "p-6";
    if (minDimension > 500) return "p-4";
    return "p-2";
  };

  return (
    <div className="pointer-events-none absolute inset-0 rounded-lg overflow-hidden">
      {/* Base gradient overlay with reduced intensity */}
      <div className="absolute inset-0 rounded-lg [mask-image:linear-gradient(white,transparent)] group-hover/visualization:opacity-20 transition-opacity duration-300"></div>

      {/* Primary gradient effect with subtle brand colors */}
      <motion.div
        className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#C1FF72]/40 to-[#38B6FF]/40 opacity-0 group-hover/visualization:opacity-50 backdrop-blur-sm transition-opacity duration-300"
        style={style}
      />

      {/* Optimized text layer with reduced intensity */}
      <motion.div
        className="absolute inset-0 rounded-lg opacity-0 mix-blend-overlay group-hover/visualization:opacity-35 transition-opacity duration-300"
        style={style}
      >
        {/* Primary text layer with reduced intensity */}
        <div
          className={cn(
            "absolute inset-0 h-full break-words whitespace-pre-wrap text-white/50 font-mono font-medium transition-opacity duration-300 overflow-hidden leading-loose tracking-wider",
            getFontSize(),
            getPadding()
          )}
        >
          {randomString}
        </div>

        {/* Subtle background layer with minimal visibility */}
        <div
          className={cn(
            "absolute inset-0 h-full break-words whitespace-pre-wrap text-white/15 font-mono font-light transition-opacity duration-300 overflow-hidden leading-loose tracking-wider transform translate-x-2 translate-y-3 blur-[0.5px]",
            getFontSize(),
            getPadding()
          )}
        >
          {randomString
            .split("")
            .map((char, i) => (i % 3 === 0 ? char : " "))
            .join("")}
        </div>
      </motion.div>
    </div>
  );
}
