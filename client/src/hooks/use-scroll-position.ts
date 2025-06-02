import { useState, useEffect, useRef } from "react";

interface ScrollPosition {
  scrollY: number;
  isScrolled: boolean;
  isAtTop: boolean;
  scrollDirection: "up" | "down" | null;
  scrollingUp: boolean;
  scrollingDown: boolean;
}

/**
 * Custom hook to track scroll position and direction with debouncing
 * @param threshold - Number of pixels to scroll before considering the page "scrolled"
 * @param delay - Debounce delay in ms to prevent excessive updates
 * @returns ScrollPosition object with scroll data
 */
export function useScrollPosition(threshold = 50, delay = 10): ScrollPosition {
  const [scrollPosition, setScrollPosition] = useState<ScrollPosition>({
    scrollY: 0,
    isScrolled: false,
    isAtTop: true,
    scrollDirection: null,
    scrollingUp: false,
    scrollingDown: false,
  });

  // Use refs to track the last scroll position and request animation frame
  const lastScrollY = useRef(0);
  const lastDirection = useRef<"up" | "down" | null>(null);
  const rafId = useRef<number | null>(null);
  const lastUpdate = useRef<number>(0);

  useEffect(() => {
    // Initialize with current scroll position
    lastScrollY.current = window.scrollY;

    const updateScrollPosition = () => {
      const now = Date.now();
      const currentScrollY = window.scrollY;

      // Only update if we've passed the delay threshold or if direction changed
      if (
        now - lastUpdate.current >= delay ||
        (currentScrollY > lastScrollY.current &&
          lastDirection.current !== "down") ||
        (currentScrollY < lastScrollY.current && lastDirection.current !== "up")
      ) {
        const isScrolled = currentScrollY > threshold;
        const isAtTop = currentScrollY <= threshold;
        const scrollDirection =
          currentScrollY > lastScrollY.current ? "down" : "up";

        // Update the direction ref
        lastDirection.current = scrollDirection;

        // Update state with all scroll data
        setScrollPosition({
          scrollY: currentScrollY,
          isScrolled,
          isAtTop,
          scrollDirection,
          scrollingUp: scrollDirection === "up",
          scrollingDown: scrollDirection === "down",
        });

        lastUpdate.current = now;
      }

      lastScrollY.current = currentScrollY;
      rafId.current = null;
    };

    const handleScroll = () => {
      // Use requestAnimationFrame for smoother updates
      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(updateScrollPosition);
      }
    };

    // Update on mount
    updateScrollPosition();

    // Add scroll event listener with passive flag for better performance
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Clean up
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [threshold, delay]);

  return scrollPosition;
}
