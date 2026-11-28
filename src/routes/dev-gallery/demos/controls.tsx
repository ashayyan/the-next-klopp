import { useState } from "react";
import { Button } from "../../../ui/Button.tsx";
import { Checkbox, RadioGroup } from "../../../ui/Choice.tsx";
import { NumberInput, TextInput } from "../../../ui/Field.tsx";
import { CloseIcon } from "../../../ui/icons/index.tsx";
import { Link } from "../../../ui/Link.tsx";
import { Segmented } from "../../../ui/Segmented.tsx";
import { Select } from "../../../ui/Select.tsx";
import { Slider } from "../../../ui/Slider.tsx";
import { Switch } from "../../../ui/Switch.tsx";
import { Tabs } from "../../../ui/Tabs.tsx";

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

// ---------------------------------------------------------------- link

/** Link states are `<variant>-<look>`: inline or standalone, default, hover or focus-visible. */
export function LinkDemo({ state }: { state: string }) {
  const standalone = state.startsWith("standalone");
  const look = state.endsWith("hover")
    ? "hover"
    : state.endsWith("focus-visible")
      ? "focus-visible"
      : undefined;
  if (standalone) {
    return (
      <Link href="#sources" variant="standalone" state={look}>
        Open the source registry
      </Link>
    );
  }
  return (
    <p className="max-w-[65ch] text-body">
      Every number on this page links to its{" "}
      <Link href="#sources" state={look}>
        source and licence
      </Link>
      , so you can check it yourself.
    </p>
  );
}

// ---------------------------------------------------------------- select

const SHAPES = [
  { value: "443", label: "4-3-3" },
  { value: "442", label: "4-4-2" },
  { value: "352", label: "3-5-2" },
  { value: "4231", label: "4-2-3-1" },
] as const;

/** A cell element a Base UI popup can render into, so one screenshot shows it open. */
export function useCellContainer() {
  const [el, setEl] = useState<HTMLElement | null>(null);
  return { el, ref: setEl };
}

export function SelectDemo({ state }: { state: string }) {
  const cell = useCellContainer();
  const open = state === "open";
  return (
    <div ref={cell.ref} className={`relative w-full ${open ? "min-h-72" : ""}`}>
      {open && !cell.el ? null : (
        <Select
          label="Formation"
          options={SHAPES}
          defaultValue={state === "closed" || state === "open" ? "442" : undefined}
          disabled={state === "disabled"}
          state={state === "focus" ? "focus-visible" : undefined}
          open={open}
          portalContainer={open ? cell.el : undefined}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- checkbox, radio, switch

export function ChoiceDemo({ state }: { state: string }) {
  const on = state === "on";
  const disabled = state === "disabled";
  const focus = state === "focus" ? "focus-visible" : undefined;
  const [sw, setSw] = useState(on);
  return (
    <div className="flex flex-col items-start gap-4">
      <Checkbox label="Show xG on the map" defaultChecked={on} disabled={disabled} state={focus} />
      <RadioGroup
        label="Possession"
        options={[
          { value: "with", label: "With the ball" },
          { value: "without", label: "Without the ball" },
        ]}
        defaultValue={on ? "with" : undefined}
        disabled={disabled}
        state={focus}
      />
      <Switch
        label="Reduce motion"
        checked={sw}
        onCheckedChange={setSw}
        disabled={disabled}
        state={focus}
      />
    </div>
  );
}

// ---------------------------------------------------------------- segmented

const TWO = [
  { value: "home", label: "Home" },
  { value: "away", label: "Away" },
] as const;
const THREE = [
  { value: "wide", label: "Wide" },
  { value: "half", label: "Half-space" },
  { value: "central", label: "Central" },
] as const;
const MANY = [
  { value: "build", label: "Build-up" },
  { value: "press", label: "Pressing" },
  { value: "transition", label: "Transition" },
  { value: "set", label: "Set pieces" },
  { value: "keeper", label: "Goalkeeping" },
] as const;

export function SegmentedDemo({ state }: { state: string }) {
  const [two, setTwo] = useState<(typeof TWO)[number]["value"]>("home");
  const startThree =
    state === "three-second" ? "half" : state === "three-third" ? "central" : "wide";
  const [three, setThree] = useState<(typeof THREE)[number]["value"]>(startThree);
  const [many, setMany] = useState<(typeof MANY)[number]["value"]>("build");
  if (state === "two-option") {
    return <Segmented label="Team" options={TWO} value={two} onValueChange={setTwo} />;
  }
  if (state === "wrap") {
    return (
      <Segmented
        label="Phase of play"
        options={MANY}
        value={many}
        onValueChange={setMany}
        className="max-w-80"
      />
    );
  }
  return (
    <Segmented
      label="Zone"
      options={THREE}
      value={three}
      onValueChange={setThree}
      state={state === "focus" ? "focus-visible" : undefined}
      stateValue={state === "focus" ? "wide" : undefined}
    />
  );
}

// ---------------------------------------------------------------- slider

export function SliderDemo({ state }: { state: string }) {
  const value = state === "min" ? 10 : state === "max" ? 200 : 100;
  return (
    <Slider
      label="Sample size"
      min={10}
      max={200}
      step={10}
      defaultValue={value}
      disabled={state === "disabled"}
      state={state === "focus" ? "focus-visible" : undefined}
    />
  );
}

// ---------------------------------------------------------------- tabs

const TAB_SET = [
  { value: "shape", label: "Shape", content: <p>The shape the team holds without the ball.</p> },
  { value: "press", label: "Press", content: <p>Where the team starts to win the ball back.</p> },
] as const;
const TAB_MANY = [
  "Overview",
  "Build-up",
  "Pressing",
  "Transitions",
  "Set pieces",
  "Goalkeeping",
  "Substitutions",
].map((label) => ({
  value: label.toLowerCase(),
  label,
  content: <p>{`${label}: a short summary of this part of the game.`}</p>,
}));

export function TabsDemo({ state }: { state: string }) {
  if (state === "many") {
    return <Tabs label="Match sections" tabs={TAB_MANY} defaultValue="overview" />;
  }
  return (
    <Tabs
      label="Team plan"
      tabs={TAB_SET}
      defaultValue={state === "second" ? "press" : "shape"}
      state={state === "focus" ? "focus-visible" : undefined}
      stateValue={state === "focus" ? "shape" : undefined}
    />
  );
}
