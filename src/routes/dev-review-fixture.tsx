import { useSearchParams } from "react-router";

// Dev-only page for the review:screens command (QA-02). The clean page must pass every check;
// each ?case= variant seeds one defect so the command's failure paths are tested for real.
// Colours come from tokens only.
// Every fixture control carries the system focus ring so a seeded case fails only its own check.
const RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

function Cross() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className="mx-auto">
      <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

export default function ReviewFixture() {
  const [params] = useSearchParams();
  const seeded = params.get("case");

  return (
    <main className="min-h-screen bg-surface-page text-ink">
      <div className="wrap mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-display">Review fixture</h1>
        <p className="mt-4 text-body">
          This page exists so the review command can be tested against a known clean screen and
          against one seeded defect at a time.
        </p>
        <button
          type="button"
          className={`mt-6 block min-h-11 min-w-11 ${RING} rounded-md border border-control-border bg-surface-raised px-4 text-body text-ink`}
        >
          Continue
        </button>
        {seeded === "gradient" ? (
          <div
            data-case="gradient"
            className="mt-6 h-24 rounded-md"
            style={{
              backgroundImage: "linear-gradient(90deg, var(--accent), var(--surface-page))",
            }}
          />
        ) : null}
        {seeded === "small-target" ? (
          <button
            type="button"
            aria-label="Close"
            data-case="small-target"
            className={`mt-6 block h-8 w-8 ${RING} rounded-md border border-control-border bg-surface-raised`}
          >
            <Cross />
          </button>
        ) : null}
        {seeded === "no-name" ? (
          <button
            type="button"
            data-case="no-name"
            className={`mt-6 block h-11 w-11 ${RING} rounded-md border border-control-border bg-surface-raised`}
          >
            <Cross />
          </button>
        ) : null}
        {seeded === "transition-all" ? (
          <button
            type="button"
            data-case="transition-all"
            style={{ transition: "all 200ms" }}
            className={`mt-6 block min-h-11 min-w-11 ${RING} rounded-md border border-control-border bg-surface-raised px-4 text-body text-ink`}
          >
            Animate everything
          </button>
        ) : null}
        {seeded === "foreign-colour" ? (
          <>
            <style>{":root { --review-fixture-foreign: crimson; }"}</style>
            <p
              data-case="foreign-colour"
              className="mt-6 text-body"
              style={{ color: "var(--review-fixture-foreign)" }}
            >
              This sentence uses a colour that is not a token.
            </p>
          </>
        ) : null}
      </div>
    </main>
  );
}
