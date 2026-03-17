import { useEffect } from "react";

export function useIntersectionObserver({
  target,
  onIntersect,
  root = null,
  rootMargin = "0px",
  threshold = 1.0,
  enabled = true,
}: {
  target: React.RefObject<HTMLDivElement | null>;
  onIntersect: () => void;
  root?: Element | null;
  rootMargin?: string;
  threshold?: number;
  enabled?: boolean;
}) {
  useEffect(() => {
    if (!enabled) return;
    const el = target && target.current;
    if (!el) return;
    if (typeof window !== "undefined" && window.IntersectionObserver) {
      const observer = new window.IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            onIntersect();
          }
        },
        {
          root,
          rootMargin,
          threshold,
        },
      );
      observer.observe(el);
      return () => {
        observer.unobserve(el);
      };
    }
  }, [target, enabled, root, rootMargin, threshold, onIntersect]);
}
