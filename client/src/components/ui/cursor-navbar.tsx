import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  url: string;
  icon: LucideIcon;
}

interface CursorNavBarProps {
  items: NavItem[];
  activeSection?: string;
  onItemClick?: (itemName: string) => void;
  className?: string;
}

export function CursorNavBar({
  items,
  activeSection,
  onItemClick,
  className,
}: CursorNavBarProps) {
  const handleItemClick = (item: NavItem) => {
    if (onItemClick) {
      onItemClick(item.name);
    }
  };

  return (
    <nav
      className={cn(
        "flex items-center gap-0.5 bg-background/90 backdrop-blur-md border border-border/60 rounded-lg px-1.5 py-1.5 shadow-lg",
        "transition-all duration-200 ease-out",
        // Ensure proper contrast against pure black backgrounds
        "ring-1 ring-white/5",
        className
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.name.toLowerCase();

        return (
          <button
            key={item.name}
            onClick={() => handleItemClick(item)}
            className={cn(
              "relative flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium",
              "transition-all duration-200 ease-out",
              "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              "min-h-[40px] min-w-[40px] md:min-w-auto", // Ensure proper touch targets
              // Enhanced contrast for pure black backgrounds
              "border border-transparent",
              isActive
                ? "bg-muted text-primary shadow-sm border-primary/20"
                : "text-foreground/80 hover:text-foreground hover:bg-muted/30 hover:border-border/30"
            )}
          >
            <Icon size={16} strokeWidth={2} className="flex-shrink-0" />
            <span className="hidden md:inline whitespace-nowrap">
              {item.name}
            </span>

            {/* Cursor.com-inspired active indicator with brand colors */}
            {isActive && (
              <div
                className="absolute inset-0 rounded-md opacity-30"
                style={{
                  background:
                    "linear-gradient(135deg, #38B6FF 0%, #C1FF72 100%)",
                  mixBlendMode: "overlay",
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
