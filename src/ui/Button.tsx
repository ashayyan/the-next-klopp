import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentProps } from "react";

export type ButtonVariant = "primary" | "quiet" | "icon";

export interface ButtonProps extends Omit<ComponentProps<typeof BaseButton>, "className"> {
  variant?: ButtonVariant;
  /**
   * Forced look for the gallery: "hover", "focus-visible", "pressed" (space-separated). Written to
   * `data-state`, which the `hov:`, `fv:` and `act:` variants match like the real states.
   */
  state?: string;
  /**
   * Work in progress: the label stays, `aria-busy` is set, a static three-dot mark follows it and the
   * button ignores presses (it stays focusable, so a keyboard user does not lose their place).
   */
  loading?: boolean;
  className?: string;
}

/** Three static dots (no animation, so a screenshot is deterministic and reduced motion is honoured). */
function LoadingMark() {
  return (
    <svg
      width="20"
      height="4"
      viewBox="0 0 20 4"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      data-loading-mark
      className="shrink-0"
    >
      <circle cx="2" cy="2" r="2" />
      <circle cx="10" cy="2" r="2" />
      <circle cx="18" cy="2" r="2" />
    </svg>
  );
}

/** Shared by every control: 44 px target, 2 px focus ring with a 2 px gap, motion on opacity and transform only. */
export const CONTROL_BASE =
  "inline-flex min-h-11 cursor-pointer select-none items-center justify-center gap-2 text-label outline-offset-2 transition-[opacity,transform,translate] duration-(--duration-ui) ease-(--ease-ui) fv:outline-2 fv:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  // Accent fill: reserved for the one primary action per screen (04-UI-SPEC "Accent reserved for").
  primary:
    "rounded-md border-2 border-transparent bg-accent font-semibold px-6 text-accent-ink hov:opacity-90 act:translate-y-px",
  quiet:
    "rounded-md border border-control-border bg-transparent px-4 font-semibold text-ink hov:bg-surface-panel act:translate-y-px",
  icon: "size-11 rounded-md border border-control-border bg-transparent text-ink hov:bg-surface-panel act:translate-y-px",
};

/** Primary, quiet and icon-only buttons on Base UI. An icon-only button needs `aria-label`. */
export function Button({
  variant = "primary",
  state,
  loading = false,
  disabled,
  className,
  type,
  children,
  onClick,
  ...props
}: ButtonProps) {
  return (
    <BaseButton
      type={type ?? "button"}
      data-state={state}
      data-variant={variant}
      data-fill-edge={variant === "primary" ? "always" : undefined}
      aria-busy={loading ? true : undefined}
      focusableWhenDisabled={loading ? true : undefined}
      disabled={disabled || loading || undefined}
      className={`${CONTROL_BASE} ${VARIANTS[variant]}${className ? ` ${className}` : ""}`}
      onClick={loading ? undefined : onClick}
      {...props}
    >
      {loading && variant === "icon" ? null : children}
      {loading ? <LoadingMark /> : null}
    </BaseButton>
  );
}
