import { useState, useEffect, useCallback } from "react";

interface DashboardScrollState {
  scrollY: number;
  isScrolled: boolean;
  isAtTop: boolean;
  scrollDirection: "up" | "down" | null;
  scrollingUp: boolean;
  scrollingDown: boolean;
  headerVisible: boolean;
  lastScrollY: number;
}

interface DashboardScrollOptions {
  threshold?: number;
  hideThreshold?: number;
  debounceDelay?: number;
  hideOnScrollDown?: boolean;
}

/**
 * Enhanced scroll hook specifically designed for dashboard header behavior
 * Provides smooth hide/show functionality with performance optimizations
 */
export function useDashboardScroll({
  threshold = 50,
  hideThreshold = 100,
  debounceDelay = 10,
  hideOnScrollDown = true,
}: DashboardScrollOptions = {}): DashboardScrollState {
  const [scrollState, setScrollState] = useState<DashboardScrollState>({
    scrollY: 0,
    isScrolled: false,
    isAtTop: true,
    scrollDirection: null,
    scrollingUp: false,
    scrollingDown: false,
    headerVisible: true,
    lastScrollY: 0,
  });

  const updateScrollState = useCallback(() => {
    const currentScrollY =
      window.pageYOffset || document.documentElement.scrollTop;

    setScrollState((prevState) => {
      const scrollDifference = currentScrollY - prevState.lastScrollY;
      const isScrollingUp = scrollDifference < 0;
      const isScrollingDown = scrollDifference > 0;

      // Determine if header should be visible
      let headerVisible = true;

      if (hideOnScrollDown) {
        if (currentScrollY <= threshold) {
          // Always show header when near top
          headerVisible = true;
        } else if (isScrollingUp) {
          // Show header when scrolling up
          headerVisible = true;
        } else if (isScrollingDown && currentScrollY > hideThreshold) {
          // Hide header when scrolling down past threshold
          headerVisible = false;
        } else {
          // Maintain current state for small movements
          headerVisible = prevState.headerVisible;
        }
      }

      return {
        scrollY: currentScrollY,
        isScrolled: currentScrollY > threshold,
        isAtTop: currentScrollY <= threshold,
        scrollDirection:
          Math.abs(scrollDifference) > 5
            ? isScrollingUp
              ? "up"
              : "down"
            : prevState.scrollDirection,
        scrollingUp: isScrollingUp && Math.abs(scrollDifference) > 5,
        scrollingDown: isScrollingDown && Math.abs(scrollDifference) > 5,
        headerVisible,
        lastScrollY: currentScrollY,
      };
    });
  }, [threshold, hideThreshold, hideOnScrollDown]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          timeoutId = setTimeout(() => {
            updateScrollState();
            ticking = false;
          }, debounceDelay);
        });
        ticking = true;
      }
    };

    // Add scroll listener with passive option for better performance
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Set initial state
    updateScrollState();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [updateScrollState, debounceDelay]);

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
