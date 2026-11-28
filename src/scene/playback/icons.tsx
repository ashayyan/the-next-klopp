// Five transport icons on a 20 x 20 grid, 2 px stroke, drawn in currentColor. They are decorative:
// every button that holds one carries its own text or aria-label, so the icons are aria-hidden.
import type { ReactNode } from "react";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function PlayIcon() {
  return (
    <Icon>
      <path d="M6 4 L16 10 L6 16 Z" />
    </Icon>
  );
}

export function PauseIcon() {
  return (
    <Icon>
      <path d="M7 4 V16 M13 4 V16" />
    </Icon>
  );
}

export function ReplayIcon() {
  return (
    <Icon>
      <path d="M4 10 A6 6 0 1 0 6 5.5" />
      <path d="M3.5 3.5 V7 H7" />
    </Icon>
  );
}

export function PreviousFrameIcon() {
  return (
    <Icon>
      <path d="M5 4 V16" />
      <path d="M15 4 L8 10 L15 16 Z" />
    </Icon>
  );
}

export function NextFrameIcon() {
  return (
    <Icon>
      <path d="M15 4 V16" />
      <path d="M5 4 L12 10 L5 16 Z" />
    </Icon>
  );
}
