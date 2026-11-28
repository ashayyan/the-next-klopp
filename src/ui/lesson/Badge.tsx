import type { ReactNode } from "react";
import { CheckIcon } from "../icons/index.tsx";

export type BadgeKind = "neutral" | "done" | "new";

export interface BadgeProps {
  kind: BadgeKind;
  children: ReactNode;
}

const KINDS: Record<BadgeKind, string> = {
  neutral: "border-control-border bg-surface-panel text-ink",
  done: "border-ink bg-transparent text-ink",
  new: "border-ink bg-ink text-surface-page",
};

/**
 * A small status label. The words are always there (never colour alone) and `done` adds the check
 * icon. There are three kinds on purpose: nothing here can say "lost", "missed" or "broken streak".
 */
export function Badge({ kind, children }: BadgeProps) {
  return (
    <span
      data-badge={kind}
      className={`inline-flex min-h-6 items-center gap-1 rounded-sm border px-2 font-semibold text-label ${KINDS[kind]}`}
    >
      {kind === "done" ? <CheckIcon className="size-4" /> : null}
      {children}
    </span>
  );
}
