import { useState, useEffect, useRef, useCallback } from "react";

interface DashboardScrollState {
  scrollY: number;
  isScrolled: boolean;
  isAtTop: boolean;
  scrollDirection: "up" | "down" | null;
  headerVisible: boolean;
  lastScrollY: number;
}

interface DashboardScrollOptions {
  threshold?: number;
  hideOnScrollDown?: boolean;
}

/**
 * Premium navbar auto-hide hook with professional UX behavior
 * - Immediate hide on scroll down (1-2px sensitivity)
 * - Persistent hide state (no flickering)
 * - Smooth show on scroll up
 * - Always visible at top of page
 */
export function useDashboardScroll({
  threshold = 10,
  hideOnScrollDown = true,
}: DashboardScrollOptions = {}): DashboardScrollState {
  const [scrollState, setScrollState] = useState<DashboardScrollState>({
    scrollY: 0,
    isScrolled: false,
    isAtTop: true,
    scrollDirection: null,
    headerVisible: true,
    lastScrollY: 0,
  });

  // Use refs for performance and to avoid stale closures
  const lastScrollYRef = useRef(0);
  const ticking = useRef(false);
  const headerVisibleRef = useRef(true);

  const updateScrollState = useCallback(() => {
    const currentScrollY = Math.max(
      0,
      window.pageYOffset || document.documentElement.scrollTop
    );

    const scrollDifference = currentScrollY - lastScrollYRef.current;
    const isAtTop = currentScrollY <= 5; // Very small threshold for "at top"

    // Immediate scroll direction detection (1-2px sensitivity)
    let scrollDirection: "up" | "down" | null = null;
    if (Math.abs(scrollDifference) >= 1) {
      scrollDirection = scrollDifference > 0 ? "down" : "up";
    }

    // Premium navbar visibility logic
    let headerVisible = headerVisibleRef.current;

    if (hideOnScrollDown) {
      if (isAtTop) {
        // Always show when at the very top
        headerVisible = true;
      } else if (scrollDirection === "down" && currentScrollY > threshold) {
        // Hide immediately on scroll down (after minimal threshold)
        headerVisible = false;
      } else if (scrollDirection === "up") {
        // Show immediately on scroll up
        headerVisible = true;
      }
      // For no scroll direction (paused), maintain current state - NO FLICKERING
    }

    // Update ref for next comparison
    headerVisibleRef.current = headerVisible;

    // Update state with new values
    setScrollState((prevState) => ({
      scrollY: currentScrollY,
      isScrolled: currentScrollY > threshold,
      isAtTop,
      scrollDirection: scrollDirection || prevState.scrollDirection,
      headerVisible,
      lastScrollY: currentScrollY,
    }));

    lastScrollYRef.current = currentScrollY;
  }, [threshold, hideOnScrollDown]);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        // Use immediate execution for ultra-responsive navbar behavior
        requestAnimationFrame(() => {
          updateScrollState();
          ticking.current = false;
        });
      }
    };

    // Add scroll listener with maximum performance settings
    window.addEventListener("scroll", handleScroll, {
      passive: true,
      capture: false,
    });

    // Set initial state immediately
    updateScrollState();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [updateScrollState]);

  return scrollState;
}

/**
 * Simplified hook for basic scroll detection
 */
export function useScrollDetection(threshold = 50) {
  const { scrollY, isScrolled, isAtTop } = useDashboardScroll({ threshold });
  return { scrollY, isScrolled, isAtTop };
}

/**
 * Hook for scroll-based animations with intersection observer
 */
export function useScrollAnimation(
  options: {
    threshold?: number;
    rootMargin?: string;
    triggerOnce?: boolean;
  } = {}
) {
  const [isVisible, setIsVisible] = useState(false);
  const [element, setElement] = useState<Element | null>(null);

  const { threshold = 0.1, rootMargin = "0px", triggerOnce = true } = options;

  useEffect(() => {
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [element, threshold, rootMargin, triggerOnce]);

  return { isVisible, setElement };
}
