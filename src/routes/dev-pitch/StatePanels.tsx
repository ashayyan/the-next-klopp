import type { SceneIssue } from "../../scene/validate.ts";
import { toPanelIssues } from "./sceneSources.ts";

/** The load states that replace or accompany the pitch with a panel. Loading is a status line only. */
export type PanelState =
  | { status: "empty" }
  | { status: "invalid"; issues: readonly SceneIssue[] }
  | { status: "missing-local" }
  | { status: "error"; message: string };

const PANEL = "mb-4 border-l-4 bg-surface-panel p-4";

/**
 * Flat panels for the scene states 03-UI-SPEC freezes. Errors carry a 4 px danger border; the
 * neutral states (empty, local data absent) use the control border so they do not read as faults.
 */
export function StatePanel({ state, sceneId }: { state: PanelState; sceneId: string }) {
  switch (state.status) {
    case "empty":
      return (
        <div role="status" className={`${PANEL} border-control-border`} data-state="empty-scene">
          <h2 className="text-base leading-tight font-semibold">This scene has no marks</h2>
          <p className="mt-2 text-base">
            The pitch is drawn, but the scene holds no players, ball, events or annotations. Pick
            another scene, or add entities to the fixture file.
          </p>
        </div>
      );
    case "missing-local":
      return (
        <div role="status" className={`${PANEL} border-control-border`} data-state="missing-local">
          <h2 className="text-base leading-tight font-semibold">Local data not on this machine</h2>
          <p className="mt-2 text-base">
            This StatsBomb scene is local-only and is never shipped. Run{" "}
            <code className="font-mono text-sm">npm run data</code> on this machine, then reload
            this page.
          </p>
        </div>
      );
    case "invalid": {
      const { shown, more } = toPanelIssues(state.issues);
      const count = state.issues.length;
      return (
        <div role="alert" className={`${PANEL} border-danger`} data-state="invalid-scene">
          <h2 className="text-base leading-tight font-semibold">Scene failed validation</h2>
          <p className="mt-2 text-base">
            {`${count} ${count === 1 ? "problem" : "problems"} in “${sceneId}”. Fix the fixture file and save; the page reloads with the change.`}
          </p>
          <ul className="mt-2 font-mono text-sm">
            {shown.map((issue) => (
              <li key={`${issue.path}:${issue.message}`}>{`${issue.path}: ${issue.message}`}</li>
            ))}
          </ul>
          {more > 0 ? <p className="mt-1 text-sm">{`and ${more} more`}</p> : null}
        </div>
      );
    }
    case "error":
      return (
        <div role="alert" className={`${PANEL} border-danger`} data-state="load-error">
          <h2 className="text-base leading-tight font-semibold">This scene could not be loaded</h2>
          <p className="mt-2 text-base break-words">{state.message}</p>
        </div>
      );
  }
}
