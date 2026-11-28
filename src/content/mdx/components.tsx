// Components lesson MDX can use without importing them: the map is handed to MDXProvider, so a
// lesson file holds no import (05-CONTEXT "Lesson file format and layout").
import type { MDXComponents } from "mdx/types";
import { createContext, type ReactNode, useContext } from "react";

/** Id of the screen on show. `null` renders every step (no lesson page around the MDX). */
export const CurrentStepContext = createContext<string | null>(null);

export interface StepProps {
  id: string;
  children?: ReactNode;
}

/** One lesson screen. Only the current step renders, so the learner sees one screen at a time. */
export function Step({ id, children }: StepProps) {
  const current = useContext(CurrentStepContext);
  if (current !== null && current !== id) return null;
  return (
    <section data-lesson-step data-step-id={id}>
      {children}
    </section>
  );
}

export const lessonComponents: MDXComponents = { Step };
