import { useSearchParams } from "react-router";

// Dev-only page for the review:screens command (QA-02). The clean page must pass every check;
// each ?case= variant seeds one defect so the command's failure paths are tested for real.
// Colours come from tokens only.
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
          className="mt-6 min-h-11 min-w-11 rounded-md border border-control-border bg-surface-raised px-4 text-body text-ink"
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
      </div>
    </main>
  );
}
