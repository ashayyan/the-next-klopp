import { useEffect, useRef, useState } from "react";
import type { ThemeName } from "../../ui/theme.ts";
import { findPrimitive } from "./registry.ts";

/** The widths a frame can have, in CSS pixels. The URL's `?w` is only ever matched against this list. */
export const FRAME_WIDTHS = [375, 768, 1440] as const;
export type FrameWidth = (typeof FRAME_WIDTHS)[number];

/**
 * The frame URL: built only from a registry id, a width-independent theme from the fixed pair and a
 * state fragment that is both well formed and listed for the primitive (threat T-04-25).
 */
export function frameSrc(primitiveId: string, theme: ThemeName, state: string | null): string {
  const primitive = findPrimitive(primitiveId);
  if (!primitive) throw new Error(`unknown primitive ${primitiveId}`);
  const hash = state !== null && primitive.states.includes(state) ? `#state-${state}` : "";
  return `/dev/gallery/${primitive.id}?bare=1&theme=${theme}${hash}`;
}

export interface GalleryFrameProps {
  primitiveId: string;
  label: string;
  width: FrameWidth;
  theme: ThemeName;
  /** A listed state to scroll to; only the first frame on the page moves the page. */
  state: string | null;
  scrollToState: boolean;
}

/**
 * One same-origin iframe at an exact CSS width, so the document inside answers real media queries.
 * Its height follows the document inside (a ResizeObserver in the frame's own window); a wide frame
 * scrolls inside its wrapper and never widens the page.
 */
export function GalleryFrame({
  primitiveId,
  label,
  width,
  theme,
  state,
  scrollToState,
}: GalleryFrameProps) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(480);
  const stop = useRef<(() => void) | null>(null);

  useEffect(() => () => stop.current?.(), []);

  const onLoad = () => {
    const frame = ref.current;
    const doc = frame?.contentDocument;
    const win = frame?.contentWindow;
    if (!frame || !doc || !win) return;
    stop.current?.();
    let scrolled = false;
    const measure = () => {
      const content = Math.ceil(doc.body.getBoundingClientRect().height);
      // A horizontal scrollbar inside the frame takes about 16 px of its height.
      const bar = doc.documentElement.scrollWidth > win.innerWidth ? 16 : 0;
      setHeight(Math.max(120, content + bar));
      // The route renders after the frame's load event, so the state's cell may not exist yet:
      // the first measurement that finds it brings it to the top of the page, once.
      if (scrolled || !scrollToState || state === null) return;
      const cell = doc.getElementById(`state-${state}`);
      if (!cell) return;
      scrolled = true;
      requestAnimationFrame(() => {
        const top =
          window.scrollY +
          frame.getBoundingClientRect().top +
          win.scrollY +
          cell.getBoundingClientRect().top;
        window.scrollTo({ top: Math.max(0, top - 16) });
      });
    };
    measure();
    const observer = new (win as Window & typeof globalThis).ResizeObserver(measure);
    observer.observe(doc.body);
    stop.current = () => observer.disconnect();
  };

  return (
    <figure className="flex min-w-0 max-w-full flex-col gap-2">
      <figcaption className="text-label text-ink-muted">{`${width} px`}</figcaption>
      <div className="max-w-full overflow-x-auto border border-control-border">
        <iframe
          ref={ref}
          src={frameSrc(primitiveId, theme, state)}
          title={`${label}, ${width} px, ${theme}`}
          width={width}
          height={height}
          onLoad={onLoad}
          className="block shrink-0 border-0 bg-surface-page"
          style={{ width, minWidth: width, height }}
        />
      </div>
    </figure>
  );
}
