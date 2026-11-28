import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import type { ReactNode } from "react";

export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  /** The tab list's accessible name. */
  label: string;
  tabs: readonly TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Forced look for the gallery ("focus-visible"), written to `data-state` on every tab (or `stateValue` only). */
  state?: string;
  stateValue?: string;
  className?: string;
}

/**
 * Tabs on Base UI. The tab list wraps onto a second row on a narrow screen and never scrolls
 * sideways. The active tab has a 2 px ink underline and a heavier weight, so it reads without
 * colour (04-UI-SPEC: the accent is reserved for selected segments, switches and primary actions).
 */
export function Tabs({
  label,
  tabs,
  value,
  defaultValue,
  onValueChange,
  state,
  stateValue,
  className,
}: TabsProps) {
  return (
    <BaseTabs.Root
      value={value}
      defaultValue={value === undefined ? (defaultValue ?? tabs[0]?.value) : undefined}
      onValueChange={onValueChange ? (next) => onValueChange(String(next)) : undefined}
      className={`flex w-full flex-col gap-3${className ? ` ${className}` : ""}`}
    >
      <BaseTabs.List aria-label={label} className="flex flex-wrap gap-x-2 gap-y-2">
        {tabs.map((t) => (
          <BaseTabs.Tab
            key={t.value}
            value={t.value}
            data-state={stateValue === undefined || stateValue === t.value ? state : undefined}
            className="inline-flex min-h-11 cursor-pointer items-center border-b-2 border-transparent px-3 text-label whitespace-nowrap text-ink-muted outline-offset-2 select-none hov:text-ink fv:outline-2 fv:outline-focus-ring data-active:border-ink data-active:font-semibold data-active:text-ink"
          >
            {t.label}
          </BaseTabs.Tab>
        ))}
      </BaseTabs.List>
      {tabs.map((t) => (
        <BaseTabs.Panel
          key={t.value}
          value={t.value}
          className="min-h-11 text-body text-ink outline-offset-2 fv:outline-2 fv:outline-focus-ring"
        >
          {t.content}
        </BaseTabs.Panel>
      ))}
    </BaseTabs.Root>
  );
}
