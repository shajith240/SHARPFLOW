"use client";
import { useMotionValue } from "framer-motion";
import React, { useState, useEffect, forwardRef } from "react";
import { useMotionTemplate, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const EvervaultCard = ({
  text,
  className,
}: {
  text?: string;
  className?: string;
}) => {
  let mouseX = useMotionValue(0);
  let mouseY = useMotionValue(0);

  const [randomString, setRandomString] = useState("");

  useEffect(() => {
    let str = generateRandomString(1500);
    setRandomString(str);
  }, []);

  function onMouseMove({ currentTarget, clientX, clientY }: any) {
    let { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);

    const str = generateRandomString(1500);
    setRandomString(str);
  }

  return (
    <div
      className={cn(
        "p-0.5  bg-transparent aspect-square  flex items-center justify-center w-full h-full relative",
        className
      )}
    >
      <div
        onMouseMove={onMouseMove}
        className="group/card rounded-3xl w-full relative overflow-hidden bg-transparent flex items-center justify-center h-full"
      >
        <CardPattern
          mouseX={mouseX}
          mouseY={mouseY}
          randomString={randomString}
        />
        <div className="relative z-10 flex items-center justify-center">
          <div className="relative h-44 w-44  rounded-full flex items-center justify-center text-white font-bold text-4xl">
            <div className="absolute w-full h-full bg-white/[0.8] dark:bg-black/[0.8] blur-sm rounded-full" />
            <span className="dark:text-white text-black z-20">{text}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Specialized AI Agent Evervault Card for SharpFlow
export const AgentEvervaultCard = forwardRef<
  HTMLDivElement,
  {
    children?: React.ReactNode;
    className?: string;
    agentType?: "user" | "prism" | "agent";
  }
>(({ children, className, agentType = "agent" }, ref) => {
  let mouseX = useMotionValue(0);
  let mouseY = useMotionValue(0);

  const [randomString, setRandomString] = useState("");

  useEffect(() => {
    let str = generateRandomString(800); // Reduced for smaller nodes
    setRandomString(str);
  }, []);

  function onMouseMove({ currentTarget, clientX, clientY }: any) {
    let { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);

    const str = generateRandomString(800);
    setRandomString(str);
  }

  return (
    <div
      ref={ref}
      className={cn(
        "relative z-20 flex items-center justify-center rounded-full border-2",
        className
      )}
      onMouseMove={onMouseMove}
    >
      <AgentCardPattern
        mouseX={mouseX}
        mouseY={mouseY}
        randomString={randomString}
        agentType={agentType}
      />
      <div className="relative z-30 flex items-center justify-center w-full h-full">
        {children}
      </div>
    </div>
  );
});

AgentEvervaultCard.displayName = "AgentEvervaultCard";

export function CardPattern({ mouseX, mouseY, randomString }: any) {
  let maskImage = useMotionTemplate`radial-gradient(250px at ${mouseX}px ${mouseY}px, white, transparent)`;
  let style = { maskImage, WebkitMaskImage: maskImage };

  return (
    <div className="pointer-events-none">
      <div className="absolute inset-0 rounded-2xl  [mask-image:linear-gradient(white,transparent)] group-hover/card:opacity-50"></div>
      <motion.div
        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#C1FF72] to-[#38B6FF] opacity-0 group-hover/card:opacity-70 backdrop-blur-xl transition-opacity duration-300"
        style={style}
      />
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 mix-blend-overlay group-hover/card:opacity-60 transition-opacity duration-300"
        style={style}
      >
        <p className="absolute inset-x-0 text-xs h-full break-words whitespace-pre-wrap text-white font-mono font-bold transition-opacity duration-300">
          {randomString}
        </p>
      </motion.div>
    </div>
  );
}

// Specialized pattern for AI Agent nodes with SharpFlow branding
export function AgentCardPattern({
  mouseX,
  mouseY,
  randomString,
  agentType,
}: {
  mouseX: any;
  mouseY: any;
  randomString: string;
  agentType: "user" | "prism" | "agent";
}) {
  let maskImage = useMotionTemplate`radial-gradient(120px at ${mouseX}px ${mouseY}px, white, transparent)`;
  let style = { maskImage, WebkitMaskImage: maskImage };

  // Define colors based on agent type using professional dark theme
  const getGradientColors = () => {
    switch (agentType) {
      case "user":
        return "from-foreground/80 to-foreground/40";
      case "prism":
        return "from-primary to-secondary"; // Lime Green to Sky Blue
      case "agent":
      default:
        return "from-primary/80 to-secondary/80"; // Lime Green to Sky Blue with opacity
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0 rounded-full overflow-hidden">
      <div className="absolute inset-0 rounded-full [mask-image:linear-gradient(white,transparent)] group-hover:opacity-30 transition-opacity duration-300"></div>
      <motion.div
        className={cn(
          "absolute inset-0 rounded-full bg-gradient-to-r opacity-0 group-hover:opacity-60 backdrop-blur-sm transition-opacity duration-300",
          getGradientColors()
        )}
        style={style}
      />
      <motion.div
        className="absolute inset-0 rounded-full opacity-0 mix-blend-overlay group-hover:opacity-40 transition-opacity duration-300"
        style={style}
      >
        <p className="absolute inset-0 text-[8px] sm:text-[10px] h-full break-words whitespace-pre-wrap text-white/80 font-mono font-bold transition-opacity duration-300 p-1 overflow-hidden">
          {randomString}
        </p>
      </motion.div>
    </div>
  );
}

const characters =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const specialChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";

export const generateRandomString = (length: number) => {
  let result = "";
  for (let i = 0; i < length; i++) {
    // Add natural spacing every 8-12 characters for better readability
    if (i > 0 && i % (8 + Math.floor(Math.random() * 5)) === 0) {
      result += " ";
    }
    // Add line breaks every 60-80 characters for better text flow
    else if (i > 0 && i % (60 + Math.floor(Math.random() * 21)) === 0) {
      result += "\n";
    }
    // Mix regular characters with occasional special characters (10% chance)
    else if (Math.random() < 0.1) {
      result += specialChars.charAt(
        Math.floor(Math.random() * specialChars.length)
      );
    } else {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
  }
  return result;
};

export const Icon = ({ className, ...rest }: any) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="currentColor"
      className={className}
      {...rest}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
    </svg>
  );
};
