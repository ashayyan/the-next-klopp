import { Button } from "../../../ui/Button.tsx";
import { NumberInput, TextInput } from "../../../ui/Field.tsx";
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

const LONG_VALUE =
  "Pressing_trigger_after_a_backwards_pass_to_the_goalkeeper_when_the_far_side_winger_has_already_tucked_inside";

/** One state of the text and number inputs, side by side in one cell. */
export function InputDemo({ state }: { state: string }) {
  const invalid = state === "invalid";
  const error = "Enter a number from 0 to 100.";
  const text = state === "filled" ? "Gegenpress" : state === "long-value" ? LONG_VALUE : undefined;
  return (
    <div className="flex w-full flex-col gap-4">
      <TextInput
        label="Pressing trigger"
        placeholder="Name the trigger"
        description={state === "empty" ? "Two or three words." : undefined}
        defaultValue={invalid ? "Back pass" : text}
        disabled={state === "disabled"}
        state={state === "focus" ? "focus-visible" : undefined}
      />
      <NumberInput
        label="Pressing intensity (0 to 100)"
        min={0}
        max={100}
        defaultValue={invalid ? 140 : state === "filled" ? 72 : undefined}
        error={invalid ? error : undefined}
        disabled={state === "disabled"}
      />
    </div>
  );
}
