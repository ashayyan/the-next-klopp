import type { View } from "./view.ts";

export interface CanvasLayerProps {
  draw: (ctx: CanvasRenderingContext2D, view: View) => void;
}

// RED stub: replaced by the real layer in the GREEN step.
export function CanvasLayer(_props: CanvasLayerProps) {
  return null;
}
