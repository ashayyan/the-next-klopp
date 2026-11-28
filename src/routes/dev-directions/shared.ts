// Helpers shared by the two direction screens.
import { useEffect, useRef, useState } from "react";

/** The display face with the direction's stretch (Mona Sans at 125 % stretch). */
export const DISPLAY = "font-display [font-stretch:var(--font-display-stretch)]";

/** An element's measured CSS width, so the pitch orientation and the chart follow their space. */
export function useMeasuredWidth<E extends HTMLElement = HTMLDivElement>(initial: number) {
  const ref = useRef<E>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w !== undefined && w > 0) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}
