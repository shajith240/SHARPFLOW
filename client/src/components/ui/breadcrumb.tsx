import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { ChevronRight, MoreHorizontal, Home, Settings } from "lucide-react";
import { useLocation } from "wouter";

import { cn } from "@/lib/utils";

const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<"nav"> & {
    separator?: React.ReactNode;
  }
>(({ ...props }, ref) => <nav ref={ref} aria-label="breadcrumb" {...props} />);
Breadcrumb.displayName = "Breadcrumb";

const BreadcrumbList = React.forwardRef<
  HTMLOListElement,
  React.ComponentPropsWithoutRef<"ol">
>(({ className, ...props }, ref) => (
  <ol
    ref={ref}
    className={cn(
      "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5",
      className
    )}
    {...props}
  />
));
BreadcrumbList.displayName = "BreadcrumbList";

const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentPropsWithoutRef<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn("inline-flex items-center gap-1.5", className)}
    {...props}
  />
));
BreadcrumbItem.displayName = "BreadcrumbItem";

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<"a"> & {
    asChild?: boolean;
  }
>(({ asChild, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a";

  return (
    <Comp
      ref={ref}
      className={cn("transition-colors hover:text-foreground", className)}
      {...props}
    />
  );
});
BreadcrumbLink.displayName = "BreadcrumbLink";

const BreadcrumbPage = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={cn("font-normal text-foreground", className)}
    {...props}
  />
));
BreadcrumbPage.displayName = "BreadcrumbPage";

const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) => (
  <li
    role="presentation"
    aria-hidden="true"
    className={cn("[&>svg]:w-3.5 [&>svg]:h-3.5", className)}
    {...props}
  >
    {children ?? <ChevronRight />}
  </li>
);
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

const BreadcrumbEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
);
BreadcrumbEllipsis.displayName = "BreadcrumbElipssis";

// Settings-specific breadcrumb component
export function SettingsBreadcrumb({ className }: { className?: string }) {
  const [, setLocation] = useLocation();

  const handleHomeClick = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("🏠 [BREADCRUMB] Navigating to dashboard");

    try {
      // Force a full page navigation to ensure dashboard loads properly
      console.log(
        "🔄 [BREADCRUMB] Using window.location for reliable navigation"
      );
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("❌ [BREADCRUMB] Navigation error:", error);
      // Fallback - try direct assignment
      window.location.assign("/dashboard");
    }
  }, []);

  return (
    <nav
      className={cn("flex items-center space-x-2 text-sm", className)}
      aria-label="Breadcrumb"
    >
      {/* Home Icon - Clickable */}
      <button
        onClick={handleHomeClick}
        className={cn(
          "p-2 rounded-lg apple-transition-fast focus:outline-none focus:ring-0",
          "hover:bg-dashboard-interactive-hover",
          "text-dashboard-text-secondary hover:text-dashboard-text-primary"
        )}
        aria-label="Navigate to Dashboard"
      >
        <Home
          className="w-5 h-5 apple-transition-fast"
          style={{ color: "#38B6FF" }}
        />
      </button>

      {/* Separator */}
      <ChevronRight
        className="w-4 h-4 text-dashboard-text-muted opacity-50"
        aria-hidden="true"
      />

      {/* Settings Icon - Current Page */}
      <div className="p-2 rounded-lg" aria-current="page">
        <Settings className="w-5 h-5 opacity-60" style={{ color: "#C1FF72" }} />
      </div>
    </nav>
  );
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
