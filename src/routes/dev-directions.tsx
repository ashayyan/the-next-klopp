import { Link, useParams } from "react-router";
import { DataScreen } from "./dev-directions/DataScreen.tsx";
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

const link =
  "underline decoration-1 underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

/** The ADR 0010 route commit: all three directions render side by side there. */
const ROUTE_COMMIT = "f6e513df6cbf0c72bfdef89d036bbf59a7b6cd9a";

export function DirectionsIndex() {
  return (
    <main className="mx-auto max-w-[960px] p-4 pb-16 font-sans text-ink md:p-8">
      <h1 className="text-display font-display">Visual direction</h1>
      <p className="mt-2 max-w-[65ch] text-body text-ink-muted">
        The picked direction renders the two sample lesson screens from the DESIGN.md tokens. Open
        each one in light and dark at 375, 768 and 1440 px. Dev only.
      </p>
      <table className="mt-8 w-full border-collapse text-left text-label">
        <caption className="sr-only">Reference screens by theme</caption>
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
      <p className="mt-6 max-w-[65ch] text-body text-ink-muted">
        ADR 0010 records why this direction won. To see the other two, check out commit{" "}
        <code className="font-mono">{ROUTE_COMMIT.slice(0, 7)}</code> (full hash in the ADR).
      </p>
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
  if (screen === "data") return <DataScreen key={direction.id} direction={direction} />;
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
    const picked = DIRECTIONS[0] as Direction;
    return (
      <Fallback
        message={`No direction called “${id ?? ""}”. Pick ${picked.id}.`}
        links={[
          {
            to: `/dev/directions/${picked.id}/${screen === "data" ? "data" : "tactics"}`,
            label: picked.name,
          },
        ]}
      />
    );
  }
  return renderScreen(direction, screen);
}
