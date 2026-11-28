import type { ComponentProps } from "react";

export type LinkVariant = "inline" | "standalone";

export interface LinkProps extends Omit<ComponentProps<"a">, "className"> {
  /** `inline` sits in a sentence; `standalone` is its own line and a 44 px target. */
  variant?: LinkVariant;
  /** Forced look for the gallery ("hover", "focus-visible"), written to `data-state`. */
  state?: string;
  className?: string;
}

const BASE =
  "text-ink underline decoration-1 underline-offset-4 outline-offset-2 hov:decoration-2 fv:outline-2 fv:outline-focus-ring";

/**
 * A text link: ink with a 1 px underline, 2 px on hover, a focus ring from the focus token. It is
 * never the accent colour (04-UI-SPEC "Accent reserved for"). Pass `href`.
 */
export function Link({ variant = "inline", state, className, children, ...props }: LinkProps) {
  const target = variant === "standalone" ? "inline-flex min-h-11 items-center " : "";
  return (
    <a
      data-state={state}
      data-variant={variant}
      className={`${target}${BASE}${className ? ` ${className}` : ""}`}
      {...props}
    >
      {children}
    </a>
  );
}
