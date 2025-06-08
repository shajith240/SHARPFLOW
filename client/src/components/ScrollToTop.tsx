import React, { useState, useEffect, useCallback } from "react";
import { ChevronUp } from "lucide-react";
import styles from "./ScrollToTop.module.css";

interface ScrollToTopProps {
  /** Additional CSS classes to apply to the button */
  className?: string;
  /** Number of pixels to scroll before showing the button (default: 400) */
  showAfter?: number;
  /** Duration of the scroll animation in milliseconds (default: 500) */
  scrollDuration?: number;
}

/**
 * ScrollToTop Button Component for SharpFlow
 *
 * A floating action button that appears when the user scrolls down and
 * smoothly scrolls back to the top of the page when clicked.
 *
 * Features:
 * - SharpFlow brand colors (lime green #C1FF72 and blue #38B6FF)
 * - Smooth scroll animation with fallback for older browsers
 * - Responsive design with mobile optimizations
 * - Accessibility support (ARIA labels, keyboard navigation)
 * - High z-index to stay above other elements
 * - Hover effects and visual feedback
 */
export function ScrollToTop({
  className = "",
  showAfter = 400,
  scrollDuration = 500,
}: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  // Monitor scroll position with optimized throttling
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    const toggleVisibility = () => {
      const scrolled = window.pageYOffset || document.documentElement.scrollTop;
      setIsVisible(scrolled > showAfter);
    };

    const handleScroll = () => {
      // Use timeout-based throttling instead of requestAnimationFrame
      // to avoid conflicts with smooth scroll behavior
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(toggleVisibility, 16); // ~60fps
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // Check initial scroll position
    toggleVisibility();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [showAfter]);

  // Smooth scroll to top function using modern API
  const scrollToTop = useCallback((event?: React.MouseEvent) => {
    // Prevent any potential event bubbling
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Always allow clicks - don't check isScrolling state
    setIsScrolling(true);

    // Use native smooth scroll - it handles multiple calls gracefully
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    // Reset scrolling state after a reasonable delay
    // This is just for visual feedback, not for blocking clicks
    setTimeout(() => {
      setIsScrolling(false);
    }, 600); // Slightly longer than typical scroll duration
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        scrollToTop();
      }
    },
    [scrollToTop]
  );

  if (!isVisible) {
    return null;
  }

  const buttonClasses = [
    styles.scrollToTopButton,
    styles.visible,
    isScrolling ? styles.scrolling : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      onClick={scrollToTop}
      onKeyDown={handleKeyDown}
      className={buttonClasses}
      aria-label="Scroll to top of page"
      title="Scroll to top"
      type="button"
    >
      <ChevronUp
        className={styles.scrollToTopIcon}
        size={18}
        strokeWidth={2.5}
        aria-hidden="true"
      />

      {/* Ripple effect on click */}
      <span className={styles.scrollToTopRipple} aria-hidden="true" />
    </button>
  );
}

export default ScrollToTop;
