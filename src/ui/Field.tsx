import { Field as BaseField } from "@base-ui/react/field";
import { NumberField } from "@base-ui/react/number-field";
import { type ReactNode, useId } from "react";
import { CrossIcon } from "./icons/index.tsx";

/**
 * Text and number inputs on Base UI Field. The label is a real `<label>` tied to the input. An error
 * is text in `--danger` next to a cross icon (never colour alone), and the input points at it with
 * `aria-describedby` so a screen reader reads it with the field.
 */

export const INPUT_CLASS =
  "min-h-11 w-full min-w-0 rounded-md border border-control-border bg-surface-page px-3 text-body text-ink outline-offset-2 placeholder:text-ink-muted fv:outline-2 fv:outline-focus-ring data-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-50";

interface FieldCommon {
  /** Visible label; also the input's accessible name. */
  label: ReactNode;
  /** Error copy. When set the field is invalid. Say what to do: "Enter a number from 0 to 100." */
  error?: string;
  /** Help text under the input. */
  description?: string;
  disabled?: boolean;
  /** Forced look for the gallery ("focus-visible"), written to `data-state` on the input. */
  state?: string;
  name?: string;
  className?: string;
}

function ErrorLine({ id, children }: { id: string; children: ReactNode }) {
  return (
    <BaseField.Error
      match
      id={id}
      className="flex items-start gap-1 text-label text-danger [&_svg]:mt-0.5 [&_svg]:shrink-0"
    >
      <CrossIcon className="size-4" />
      <span className="min-w-0 break-words">{children}</span>
    </BaseField.Error>
  );
}

function Description({ id, children }: { id: string; children: ReactNode }) {
  return (
    <BaseField.Description id={id} className="text-label text-ink-muted">
      {children}
    </BaseField.Description>
  );
}

const LABEL_CLASS = "text-label font-semibold text-ink";

export interface TextInputProps extends FieldCommon {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "search" | "url";
}

/** A single-line text input with label, optional help text and optional error. */
export function TextInput({
  label,
  error,
  description,
  disabled,
  state,
  name,
  className,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  type = "text",
}: TextInputProps) {
  const base = useId();
  const errorId = `${base}-error`;
  const descId = `${base}-desc`;
  const describedBy = [error ? errorId : null, description ? descId : null]
    .filter(Boolean)
    .join(" ");
  return (
    <BaseField.Root
      name={name}
      invalid={error ? true : undefined}
      disabled={disabled}
      className={`flex w-full flex-col items-start gap-1${className ? ` ${className}` : ""}`}
    >
      <BaseField.Label className={LABEL_CLASS}>{label}</BaseField.Label>
      <BaseField.Control
        type={type}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onValueChange={onValueChange ? (next) => onValueChange(next) : undefined}
        aria-describedby={describedBy || undefined}
        data-state={state}
        className={INPUT_CLASS}
      />
      {description ? <Description id={descId}>{description}</Description> : null}
      {error ? <ErrorLine id={errorId}>{error}</ErrorLine> : null}
    </BaseField.Root>
  );
}

export interface NumberInputProps extends FieldCommon {
  value?: number | null;
  defaultValue?: number;
  onValueChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
}

/** A number input: parses and clamps like a number, typed and arrow-key steps, same label and error. */
export function NumberInput({
  label,
  error,
  description,
  disabled,
  state,
  name,
  className,
  value,
  defaultValue,
  onValueChange,
  min,
  max,
  step,
}: NumberInputProps) {
  const base = useId();
  const errorId = `${base}-error`;
  const descId = `${base}-desc`;
  const describedBy = [error ? errorId : null, description ? descId : null]
    .filter(Boolean)
    .join(" ");
  return (
    <BaseField.Root
      name={name}
      invalid={error ? true : undefined}
      disabled={disabled}
      className={`flex w-full flex-col items-start gap-1${className ? ` ${className}` : ""}`}
    >
      <NumberField.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange ? (next) => onValueChange(next) : undefined}
        min={min}
        max={max}
        step={step}
        className="flex w-full flex-col items-start gap-1"
      >
        <BaseField.Label className={LABEL_CLASS}>{label}</BaseField.Label>
        <NumberField.Input
          aria-describedby={describedBy || undefined}
          data-state={state}
          className={`${INPUT_CLASS} font-mono tabular-nums`}
        />
      </NumberField.Root>
      {description ? <Description id={descId}>{description}</Description> : null}
      {error ? <ErrorLine id={errorId}>{error}</ErrorLine> : null}
    </BaseField.Root>
  );
}
