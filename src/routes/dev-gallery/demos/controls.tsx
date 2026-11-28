import { Button } from "../../../ui/Button.tsx";
import { CloseIcon } from "../../../ui/icons/index.tsx";

/** The state names that reach the Button as the forced `state` prop (written to `data-state`). */
const FORCED = new Set(["hover", "focus-visible", "pressed"]);

/** One state of the button: primary, quiet and icon-only side by side. */
export function ButtonDemo({ state }: { state: string }) {
  const forced = FORCED.has(state) ? state : undefined;
  const common = {
    state: forced,
    disabled: state === "disabled" ? true : undefined,
    loading: state === "loading",
  };
  return (
    <>
      <Button variant="primary" {...common}>
        Continue
      </Button>
      <Button variant="quiet" {...common}>
        Save for later
      </Button>
      <Button variant="icon" aria-label="Close" {...common}>
        <CloseIcon />
      </Button>
    </>
  );
}
