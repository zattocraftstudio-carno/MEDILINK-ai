import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Reveals an element once, the first time it scrolls into view.
 *
 * Two properties matter:
 *
 * 1. **Graceful degradation.** If `IntersectionObserver` is unavailable
 *    the element is revealed immediately rather than staying invisible
 *    forever. The reveal state is opt-in from JS (`.js .reveal`), so the
 *    content is never hidden from crawlers or no-JS visitors.
 *
 * 2. **A generic element type.** The ref was typed as
 *    `HTMLDivElement` but is attached to `<section>` elements, which
 *    defeated ref narrowing.
 */
export function useIntersectionOnce<T extends Element = HTMLElement>(
  threshold = 0.1,
  rootMargin = "0px 0px -10% 0px"
): { ref: RefObject<T | null>; isVisible: boolean } {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver === "undefined") {
      // No observer support — reveal rather than hide forever.
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, isVisible };
}
