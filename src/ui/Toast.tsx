import { Toast as BaseToast } from "@base-ui/react/toast";
import { type ReactNode, type RefObject, useEffect, useRef } from "react";
import { Button } from "./Button.tsx";
import { POPUP_MOTION } from "./Tooltip.tsx";

/**
 * Toasts on Base UI. A toast is a short, polite confirmation ("Note saved"): it is announced to a
 * screen reader without taking focus, carries a Dismiss button of 44 px, and goes away by itself
 * after the provider's timeout. `timeout={0}` keeps it (the gallery does, so a screenshot is stable).
 */

export function ToastProvider({
  children,
  timeout,
}: {
  children: ReactNode;
  /** Milliseconds before a toast goes away; 0 keeps it until it is dismissed. */
  timeout?: number;
}) {
  return <BaseToast.Provider timeout={timeout}>{children}</BaseToast.Provider>;
}

/** Shows a toast: `const toast = useToast(); toast.add({ title: "Note saved" })`. */
export const useToast = BaseToast.useToastManager;

function ToastList() {
  const { toasts } = BaseToast.useToastManager();
  return toasts.map((toast) => (
    <BaseToast.Root
      key={toast.id}
      toast={toast}
      className={`flex items-center justify-between gap-3 rounded-md border border-control-border bg-surface-raised p-3 font-sans text-body text-ink outline-offset-2 fv:outline-2 fv:outline-focus-ring ${POPUP_MOTION}`}
    >
      <BaseToast.Content className="flex min-w-0 flex-1 flex-col gap-1">
        <BaseToast.Title className="font-semibold" />
        <BaseToast.Description className="text-label text-ink-muted" />
      </BaseToast.Content>
      <BaseToast.Close render={<Button variant="quiet" />}>Dismiss</BaseToast.Close>
    </BaseToast.Root>
  ));
}

/** Where toasts appear: bottom right of the page, or inside `portalContainer` (gallery). */
export function ToastViewport({
  portalContainer,
}: {
  portalContainer?: HTMLElement | RefObject<HTMLElement | null> | null;
}) {
  const contained = portalContainer != null;
  return (
    <BaseToast.Portal container={portalContainer ?? undefined}>
      <BaseToast.Viewport
        className={
          contained
            ? "absolute inset-x-0 bottom-0 flex flex-col gap-2"
            : "fixed right-4 bottom-4 z-10 flex w-[calc(100vw-2rem)] flex-col gap-2 sm:right-8 sm:bottom-8 sm:w-[22.5rem]"
        }
      >
        <ToastList />
      </BaseToast.Viewport>
    </BaseToast.Portal>
  );
}

/** Adds one toast when it mounts. For the gallery and tests. */
export function ToastOnMount({ title, description }: { title: string; description?: string }) {
  const toast = BaseToast.useToastManager();
  const added = useRef(false);
  useEffect(() => {
    if (added.current) return;
    added.current = true;
    toast.add({ title, description, timeout: 0 });
  }, [toast, title, description]);
  return null;
}
