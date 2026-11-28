import { useEffect, useRef, useState } from "react";
import { usePitch } from "./Pitch.tsx";
import { canvasMatrix, type View } from "./view.ts";

export interface CanvasLayerProps {
  /**
   * Paints dense marks. The context is already transformed to canonical metres (the same view
   * matrix as the SVG layers, times devicePixelRatio), so callers draw in metres. Keep the function
   * identity stable (useCallback) to avoid a repaint on every render.
   */
  draw: (ctx: CanvasRenderingContext2D, view: View) => void;
}

/**
 * The Canvas 2D layer of <Pitch>, passed through its `canvas` prop so it sits between the bottom
 * and the top SVG. Backing store = CSS size x devicePixelRatio. Browser APIs run only in effects,
 * so the component renders on the server (static markup tests) without a DOM.
 */
export function CanvasLayer({ draw }: CanvasLayerProps) {
  const { view } = usePitch();
  const ref = useRef<HTMLCanvasElement>(null);
  const [dpr, setDpr] = useState(1);

  // Track devicePixelRatio: a resolution media query matches only the current ratio, so it is
  // re-created after every change (MDN Window.devicePixelRatio pattern).
  useEffect(() => {
    let query: MediaQueryList | null = null;
    const update = () => {
      const next = window.devicePixelRatio || 1;
      setDpr(next);
      query?.removeEventListener("change", update);
      query = window.matchMedia(`(resolution: ${next}dppx)`);
      query.addEventListener("change", update);
    };
    update();
    return () => query?.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const w = Math.floor(view.cssWidth * dpr);
    const h = Math.floor(view.cssHeight * dpr);
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(...canvasMatrix(view, dpr));
    draw(ctx, view);
  }, [view, draw, dpr]);

  return (
    // biome-ignore lint/a11y/noAriaHiddenOnFocusable: a canvas without tabindex is not focusable; it is decorative here
    <canvas
      ref={ref}
      data-layer="canvas"
      aria-hidden="true"
      className="absolute inset-0 block h-full w-full"
      style={{ pointerEvents: "none" }}
    />
  );
}
