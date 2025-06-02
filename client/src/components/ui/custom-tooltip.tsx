"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface CustomTooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
  offset?: { x: number; y: number };
}

export function CustomTooltip({
  content,
  children,
  className,
  delay = 200,
  offset = { x: 8, y: -8 }
}: CustomTooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [mounted, setMounted] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout>();
  const triggerRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const showTooltip = React.useCallback((event: MouseEvent) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      const tooltipX = rect.left + rect.width / 2 + offset.x;
      const tooltipY = rect.top + offset.y;

      // Ensure tooltip stays within viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const tooltipWidth = 200; // Estimated tooltip width
      const tooltipHeight = 40; // Estimated tooltip height

      let finalX = tooltipX;
      let finalY = tooltipY;

      // Adjust horizontal position if tooltip would go off-screen
      if (finalX + tooltipWidth > viewportWidth) {
        finalX = viewportWidth - tooltipWidth - 10;
      }
      if (finalX < 10) {
        finalX = 10;
      }

      // Adjust vertical position if tooltip would go off-screen
      if (finalY < 10) {
        finalY = rect.bottom + 10; // Show below if no space above
      }
      if (finalY + tooltipHeight > viewportHeight) {
        finalY = rect.top - tooltipHeight - 10; // Show above if no space below
      }

      setPosition({ x: finalX, y: finalY });
      setIsVisible(true);
    }, delay);
  }, [delay, offset]);

  const hideTooltip = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  }, []);

  const handleMouseEnter = React.useCallback((event: React.MouseEvent) => {
    showTooltip(event.nativeEvent);
  }, [showTooltip]);

  const handleMouseLeave = React.useCallback(() => {
    hideTooltip();
  }, [hideTooltip]);

  const handleMouseMove = React.useCallback((event: React.MouseEvent) => {
    if (isVisible) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      const tooltipX = rect.left + rect.width / 2 + offset.x;
      const tooltipY = rect.top + offset.y;

      // Update position on mouse move for better tracking
      setPosition({ x: tooltipX, y: tooltipY });
    }
  }, [isVisible, offset]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const tooltipElement = mounted && isVisible ? createPortal(
    <div
      className={cn(
        "fixed z-[9999] pointer-events-none",
        "bg-dashboard-bg-tertiary border border-dashboard-border-primary",
        "rounded-md px-3 py-1.5 text-sm text-dashboard-text-primary",
        "shadow-lg backdrop-blur-sm",
        "max-w-xs break-words whitespace-nowrap",
        "animate-in fade-in-0 zoom-in-95 duration-200",
        className
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)',
        zIndex: 9999,
        position: 'fixed'
      }}
    >
      {content}
    </div>,
    document.body
  ) : null;

  return (
    <>
      {React.cloneElement(children as React.ReactElement, {
        ref: triggerRef,
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        onMouseMove: handleMouseMove,
        style: {
          ...(children as React.ReactElement).props.style,
          cursor: 'help'
        }
      })}
      {tooltipElement}
    </>
  );
}
