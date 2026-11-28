// Project icon set (04-UI-SPEC "Design System": project-owned inline SVG, no icon library).
// 20 x 20 grid, currentColor, decorative (aria-hidden): every control that holds an icon names
// itself with text or aria-label. Stroke width and line cap come from the direction tokens
// --icon-stroke and --icon-linecap, so each direction draws its own line.
import type { ReactNode } from "react";

function Icon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0${className ? ` ${className}` : ""}`}
      style={{
        strokeWidth: "var(--icon-stroke)",
        strokeLinecap: "var(--icon-linecap)" as "square",
        strokeLinejoin: "round",
      }}
    >
      {children}
    </svg>
  );
}

export interface IconProps {
  className?: string;
}

export function CheckIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M4.5 10.5 L8.5 14.5 L15.5 5.5" />
    </Icon>
  );
}

export function CrossIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M5.5 5.5 L14.5 14.5 M14.5 5.5 L5.5 14.5" />
    </Icon>
  );
}

/** "I'm confused here": a question mark in a speech bubble. */
export function QuestionIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M3.5 4.5 H16.5 V13.5 H9 L5.5 16.5 V13.5 H3.5 Z" />
      <path d="M8.25 7.25 C8.25 5.75 11.75 5.75 11.75 7.5 C11.75 8.75 10 8.75 10 10" />
      <path d="M10 11.75 V11.8" />
    </Icon>
  );
}

/** Theme: a half-filled disc (light and dark). */
export function ThemeIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M10 3.5 A6.5 6.5 0 0 1 10 16.5 Z" fill="currentColor" />
    </Icon>
  );
}

/** More options: three dots. */
export function MoreIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M4.5 10 H4.55 M10 10 H10.05 M15.5 10 H15.55" style={{ strokeWidth: 2.5 }} />
    </Icon>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M6 6 L14 14 M14 6 L6 14" />
    </Icon>
  );
}

export function ChevronIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M7.5 5 L12.5 10 L7.5 15" />
    </Icon>
  );
}
