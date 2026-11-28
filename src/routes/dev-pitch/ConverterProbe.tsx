import { useId } from "react";
import type { ProviderId } from "../../pitch/coords.ts";
import { PROBE_PROVIDERS, type ProbeResult } from "./probe.ts";

export interface ProbeInput {
  provider: ProviderId;
  xText: string;
  yText: string;
}

export interface ConverterProbeProps {
  value: ProbeInput;
  onChange: (next: ProbeInput) => void;
  /** The conversion of the current input, computed by the page so the pitch draws the same point. */
  result: ProbeResult;
}

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const control = `min-h-11 w-full rounded-sm border border-control-border bg-surface-page px-2 text-sm text-ink ${focusRing}`;

/**
 * Inspector panel "Converter probe": type a point in a provider's own coordinates and see it in
 * canonical metres. An out-of-range or non-numeric value shows an inline error under that field and
 * draws nothing; an empty field is simply not converted yet.
 */
export function ConverterProbe({ value, onChange, result }: ConverterProbeProps) {
  const headingId = useId();
  const providerId = useId();
  const xId = useId();
  const yId = useId();
  const xErrorId = useId();
  const yErrorId = useId();
  const errorFor = (field: "x" | "y") => {
    if (result.ok || result.field !== field) return null;
    const text = field === "x" ? value.xText : value.yText;
    // An untouched field is not an error yet.
    return text.trim() === "" ? null : result.message;
  };
  const xError = errorFor("x");
  const yError = errorFor("y");

  return (
    <section aria-labelledby={headingId} data-probe className="bg-surface-panel p-4">
      <h2 id={headingId} className="text-base leading-tight font-semibold">
        Converter probe
      </h2>
      <div className="mt-2 flex flex-col gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={providerId} className="text-sm">
            Provider
          </label>
          <select
            id={providerId}
            name="probe-provider"
            className={control}
            value={value.provider}
            onChange={(e) => onChange({ ...value, provider: e.target.value as ProviderId })}
          >
            {PROBE_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={xId} className="text-sm">
            Provider x
          </label>
          <input
            id={xId}
            name="probe-x"
            type="number"
            inputMode="decimal"
            autoComplete="off"
            step="any"
            className={control}
            value={value.xText}
            aria-invalid={xError !== null}
            aria-describedby={xError ? xErrorId : undefined}
            onChange={(e) => onChange({ ...value, xText: e.target.value })}
          />
          {xError ? (
            <p id={xErrorId} className="text-sm text-danger">
              {xError}
            </p>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={yId} className="text-sm">
            Provider y
          </label>
          <input
            id={yId}
            name="probe-y"
            type="number"
            inputMode="decimal"
            autoComplete="off"
            step="any"
            className={control}
            value={value.yText}
            aria-invalid={yError !== null}
            aria-describedby={yError ? yErrorId : undefined}
            onChange={(e) => onChange({ ...value, yText: e.target.value })}
          />
          {yError ? (
            <p id={yErrorId} className="text-sm text-danger">
              {yError}
            </p>
          ) : null}
        </div>
        <p data-readout="probe" aria-live="polite" className="font-mono text-sm tabular-nums">
          {result.ok
            ? `Canonical x ${result.point.x.toFixed(2)} m · y ${result.point.y.toFixed(2)} m`
            : "Enter provider coordinates to convert"}
        </p>
      </div>
    </section>
  );
}
