import { Link, useParams } from "react-router";
import { DIRECTIONS, type Direction, findDirection } from "./dev-directions/DirectionScope.tsx";
import { TacticsScreen } from "./dev-directions/TacticsScreen.tsx";

// Dev-only (registered inside the includeDev && import.meta.env.DEV branch of buildRoutes). The
// `:id` and `:screen` params are only ever looked up in fixed lists, never used as a path or an
// import specifier; anything else renders the fallback copy (threat T-04-14).

const SCREENS = [
  { id: "tactics", label: "Tactics lesson" },
  { id: "data", label: "Data lesson" },
] as const;

const THEMES = ["light", "dark"] as const;

/** 04-UI-SPEC "Selection rubric" (ADR 0010): the criteria the independent pick scores. */
const RUBRIC = [
  { n: 1, criterion: "ADHD calm and focus", weight: 20 },
  { n: 2, criterion: "Pitch legibility", weight: 20 },
  { n: 3, criterion: "Readability at 375", weight: 15 },
  { n: 4, criterion: "Visual-first", weight: 15 },
  { n: 5, criterion: "Anti-slop and taste", weight: 15 },
  { n: 6, criterion: "Colour-blind safety in use", weight: 10 },
  { n: 7, criterion: "Premier League feel", weight: 5 },
] as const;

const link =
  "underline decoration-1 underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

export function DirectionsIndex() {
  return (
    <main className="mx-auto max-w-[960px] p-4 pb-16 font-sans text-ink md:p-8">
      <h1 className="text-display font-display">Visual directions</h1>
      <p className="mt-2 max-w-[65ch] text-body text-ink-muted">
        Three directions render the same two lesson screens. Open each one in light and dark at 375,
        768 and 1440 px. Dev only.
      </p>
      <table className="mt-8 w-full border-collapse text-left text-label">
        <caption className="sr-only">Direction screens by theme</caption>
        <thead>
          <tr className="border-b border-control-border">
            <th scope="col" className="py-2 pr-4 font-semibold">
              Direction
            </th>
            {SCREENS.map((s) => (
              <th key={s.id} scope="col" className="py-2 pr-4 font-semibold">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DIRECTIONS.map((d) => (
            <tr key={d.id} className="border-b border-control-border align-top">
              <th scope="row" className="py-3 pr-4 font-normal">
                <span className="block font-semibold">{d.name}</span>
                <span className="block text-ink-muted">{d.idea}</span>
              </th>
              {SCREENS.map((s) => (
                <td key={s.id} className="py-3 pr-4">
                  <span className="flex flex-wrap gap-x-4 gap-y-1">
                    {THEMES.map((theme) => (
                      <Link
                        key={theme}
                        to={`/dev/directions/${d.id}/${s.id}?theme=${theme}`}
                        className={`inline-flex min-h-11 items-center ${link}`}
                      >
                        {theme === "light" ? "Light" : "Dark"}
                        {theme === d.primaryTheme ? " (primary)" : ""}
                      </Link>
                    ))}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <h2 id="rubric" className="mt-12 text-heading font-display">
        Selection rubric
      </h2>
      <p className="mt-2 max-w-[65ch] text-body text-ink-muted">
        Gates first: the palette check passes, the screen review has no failure in the primary
        theme, and both themes render both screens. Then each criterion scores 1 to 4; the weighted
        total is out of 100.
      </p>
      <table className="mt-4 w-full border-collapse text-left text-label">
        <caption className="sr-only">Rubric criteria and weights</caption>
        <thead>
          <tr className="border-b border-control-border">
            <th scope="col" className="py-2 pr-4 font-semibold">
              #
            </th>
            <th scope="col" className="py-2 pr-4 font-semibold">
              Criterion
            </th>
            <th scope="col" className="py-2 text-right font-semibold">
              Weight
            </th>
          </tr>
        </thead>
        <tbody>
          {RUBRIC.map((r) => (
            <tr key={r.n} className="border-b border-control-border">
              <td className="py-2 pr-4 font-mono tabular-nums">{r.n}</td>
              <td className="py-2 pr-4">{r.criterion}</td>
              <td className="py-2 text-right font-mono tabular-nums">{r.weight}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-8 text-label">
        <Link to="/dev" className={link}>
          Back to dev routes
        </Link>
      </p>
    </main>
  );
}

function Fallback({ message, links }: { message: string; links: { to: string; label: string }[] }) {
  return (
    <main className="mx-auto max-w-[960px] p-4 font-sans text-ink md:p-8">
      <h1 className="text-heading font-display">{message}</h1>
      <ul className="mt-4 flex flex-col gap-1 text-body">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className={`inline-flex min-h-11 items-center ${link}`}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

function renderScreen(direction: Direction, screen: string | undefined) {
  if (screen === "tactics") return <TacticsScreen key={direction.id} direction={direction} />;
  if (screen === "data") {
    return (
      <Fallback
        message="The data screen is not built yet."
        links={[
          { to: `/dev/directions/${direction.id}/tactics`, label: "Open the tactics screen" },
        ]}
      />
    );
  }
  return (
    <Fallback
      message={`No screen called “${screen ?? ""}”. Pick tactics or data.`}
      links={SCREENS.map((s) => ({
        to: `/dev/directions/${direction.id}/${s.id}`,
        label: s.label,
      }))}
    />
  );
}

export function DirectionScreen() {
  const { id, screen } = useParams();
  const direction = findDirection(id);
  if (!direction) {
    return (
      <Fallback
        message={`No direction called “${id ?? ""}”. Pick floodlit, programme or notebook.`}
        links={DIRECTIONS.map((d) => ({
          to: `/dev/directions/${d.id}/${screen === "data" ? "data" : "tactics"}`,
          label: d.name,
        }))}
      />
    );
  }
  return renderScreen(direction, screen);
}
