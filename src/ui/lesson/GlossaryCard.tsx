import type { ReactNode } from "react";
import { Popover } from "../Popover.tsx";

export interface GlossaryCardProps {
  term: string;
  definition: string;
  /** A small visual for the term (a 240 px static pitch for a formation). */
  visual?: ReactNode;
}

/** The card's body: definition, then the visual. The term is the popover title and the card's name. */
export function GlossaryCard({ term, definition, visual }: GlossaryCardProps) {
  return (
    <div data-glossary-card={term} className="flex flex-col gap-3">
      <p className="text-body">{definition}</p>
      {visual ? <div className="w-60 max-w-full">{visual}</div> : null}
    </div>
  );
}

export interface GlossaryTermProps extends GlossaryCardProps {
  /** The words in the sentence that open the card. */
  children: ReactNode;
  /** Classes for the card title (a direction's display face). */
  titleClassName?: string;
}

/**
 * A term inside running text that opens its glossary card. It is a button that reads as ink text
 * with a 1 px underline (2 px on hover); links and terms are never accent (04-UI-SPEC). As a target
 * inside a sentence it is covered by the inline exception of WCAG 2.5.8.
 */
export function GlossaryTerm({
  term,
  definition,
  visual,
  children,
  titleClassName,
}: GlossaryTermProps) {
  return (
    <Popover
      title={term}
      titleClassName={titleClassName}
      className="w-72"
      trigger={
        <button
          type="button"
          data-glossary-term={term}
          className="inline cursor-pointer whitespace-nowrap text-ink underline decoration-1 underline-offset-4 outline-offset-2 hov:decoration-2 fv:outline-2 fv:outline-focus-ring data-popup-open:decoration-2"
        >
          {children}
        </button>
      }
    >
      <GlossaryCard term={term} definition={definition} visual={visual} />
    </Popover>
  );
}
