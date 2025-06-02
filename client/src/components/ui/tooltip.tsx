"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 8, side = "top", ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    side={side}
    sideOffset={sideOffset}
    align="center"
    avoidCollisions={true}
    collisionPadding={8}
    className={cn(
      // Override CSS conflicts with !important
      "!transition-all !duration-200 !ease-out",
      "!transform-gpu !will-change-transform",
      "z-[9999] overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-lg",
      "animate-in fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 transition-opacity duration-200",

      "max-w-xs break-words",
      className
    )}
    style={{
      // Force positioning with inline styles to override CSS conflicts
      position: "fixed",
      zIndex: 9999,
      pointerEvents: "none",
      transition: "all 0.2s ease-out !important",
      transform: "translateZ(0) !important",
      willChange: "transform, opacity",
      ...props.style,
    }}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
