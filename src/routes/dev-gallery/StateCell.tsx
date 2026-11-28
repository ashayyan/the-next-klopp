import { createContext, type ReactNode, useContext } from "react";
import type { ThemeName } from "../../ui/theme.ts";

/** The theme of the wrapper a demo is drawn in; demos that read token values pick the set from it. */
const GalleryThemeContext = createContext<ThemeName>("light");

export const GalleryThemeProvider = GalleryThemeContext.Provider;

export function useGalleryTheme(): ThemeName {
  return useContext(GalleryThemeContext);
}

export interface StateCellProps {
  primitiveId: string;
  state: string;
  /** False for a second copy of the same state on one page: an id must stay unique. */
  anchor?: boolean;
  children: ReactNode;
}

/**
 * One labelled state of one primitive. `id="state-<state>"` is the deep-link target and
 * `data-gallery-state="<primitiveId>/<state>"` is what the visual and functional specs select.
 */
export function StateCell({ primitiveId, state, anchor = true, children }: StateCellProps) {
  return (
    <section
      id={anchor ? `state-${state}` : undefined}
      data-gallery-state={`${primitiveId}/${state}`}
      aria-labelledby={anchor ? `state-${state}-label` : undefined}
      className="flex min-w-0 scroll-mt-4 flex-col gap-2 border-control-border border-t pt-3"
    >
      <h2
        id={anchor ? `state-${state}-label` : undefined}
        className="font-mono text-label text-ink-muted"
      >
        {state}
      </h2>
      <div className="flex min-w-0 flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}
