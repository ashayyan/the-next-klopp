import { type ReactNode, useEffect, useLayoutEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { Segmented } from "../ui/Segmented.tsx";
import type { ThemeName } from "../ui/theme.ts";
import { FRAME_WIDTHS, type FrameWidth, GalleryFrame } from "./dev-gallery/Frames.tsx";
import {
  findPrimitive,
  GALLERY,
  groupedPrimitives,
  type Primitive,
  stateFromHash,
} from "./dev-gallery/registry.ts";
import { GalleryThemeProvider, StateCell } from "./dev-gallery/StateCell.tsx";

// Dev-only (registered inside the includeDev && import.meta.env.DEV branch of buildRoutes). The
// `:primitiveId` param and the query values are only ever matched against fixed lists, never used
// as a path or an import specifier (threats T-04-25 and T-04-26).

export type WidthChoice = `${FrameWidth}` | "all";
export type ThemeChoice = ThemeName | "both";

/** `?w=` is 375, 768, 1440 or all; anything else is `all`. */
export function parseWidth(value: string | null): WidthChoice {
  const found = FRAME_WIDTHS.find((w) => String(w) === value);
  return found === undefined ? "all" : `${found}`;
}

/** `?theme=` is light, dark or both; anything else is `both`. */
export function parseTheme(value: string | null): ThemeChoice {
  return value === "light" || value === "dark" ? value : "both";
}

export function widthsOf(choice: WidthChoice): readonly FrameWidth[] {
  return choice === "all" ? FRAME_WIDTHS : [Number(choice) as FrameWidth];
}

export function themesOf(choice: ThemeChoice): readonly ThemeName[] {
  return choice === "both" ? ["light", "dark"] : [choice];
}

const SUBLINE =
  "Every primitive and interaction, with its states, at 375, 768 and 1440 px. Dev only.";

const link =
  "underline decoration-1 underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

const WIDTH_OPTIONS = [
  { value: "375", label: "375" },
  { value: "768", label: "768" },
  { value: "1440", label: "1440" },
  { value: "all", label: "All three" },
] as const;

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "both", label: "Both" },
] as const;

function PrimitiveList({ current, counts }: { current?: string; counts: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      {groupedPrimitives().map(({ group, primitives }) => (
        <section key={group} aria-labelledby={`group-${group}`}>
          <h2 id={`group-${group}`} className="text-label font-semibold text-ink-muted">
            {group}
          </h2>
          <ul className="mt-1 flex flex-col gap-2">
            {primitives.map((p) => (
              <li key={p.id} className="flex flex-wrap items-baseline gap-x-3">
                <Link
                  to={`/dev/gallery/${p.id}`}
                  aria-current={p.id === current ? "page" : undefined}
                  className={`inline-flex min-h-11 min-w-11 items-center text-body ${link}${p.id === current ? " font-semibold" : ""}`}
                >
                  {p.label}
                </Link>
                {counts ? (
                  <span className="text-label text-ink-muted">{`${p.states.length} states`}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Header() {
  return (
    <header>
      <h1 className="font-display text-display [font-stretch:var(--font-display-stretch)]">
        Component gallery
      </h1>
      <p className="mt-2 max-w-[65ch] text-body text-ink-muted">{SUBLINE}</p>
    </header>
  );
}

function BackLink() {
  return (
    <p className="mt-8 text-label">
      <Link to="/dev" className={`inline-flex min-h-11 items-center ${link}`}>
        Back to dev routes
      </Link>
    </p>
  );
}

export function GalleryIndex() {
  return (
    <main className="wrap mx-auto max-w-[960px] p-4 pb-16 font-sans text-ink md:p-8">
      <Header />
      <div className="mt-8">
        {GALLERY.length > 0 ? <PrimitiveList counts /> : <p>No primitives are registered yet.</p>}
      </div>
      <BackLink />
    </main>
  );
}

function Fallback({ message }: { message: string }) {
  return (
    <main className="wrap mx-auto max-w-[960px] p-4 pb-16 font-sans text-ink md:p-8">
      <h1 className="font-display text-heading">{message}</h1>
      <div className="mt-6">
        <PrimitiveList counts />
      </div>
      <BackLink />
    </main>
  );
}

/** Only the state matrix of one primitive, in one or both themes: what a frame and a baseline show. */
function BareMatrix({ primitive, themes }: { primitive: Primitive; themes: readonly ThemeName[] }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    if (!fonts) {
      setReady(true);
      return;
    }
    fonts.ready.then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // One theme: the document itself carries it, so the page background and portals follow.
  const single = themes.length === 1 ? themes[0] : undefined;
  useLayoutEffect(() => {
    if (!single) return;
    const root = document.documentElement;
    root.dataset.theme = single;
    return () => {
      delete root.dataset.theme;
    };
  }, [single]);

  return (
    <main data-ready={ready ? "1" : "0"} className="font-sans text-body text-ink">
      <h1 className="sr-only">{`${primitive.label}, every state`}</h1>
      {themes.map((theme, copy) => (
        <div
          key={theme}
          data-gallery-theme={theme}
          data-theme={theme}
          className="wrap bg-surface-page p-4 text-ink md:p-6"
        >
          {themes.length > 1 ? (
            <p className="mb-4 text-label font-semibold">{theme === "light" ? "Light" : "Dark"}</p>
          ) : null}
          <GalleryThemeProvider value={theme}>
            <div
              className={`grid grid-cols-1 gap-x-8 gap-y-6 ${primitive.wide ? "xl:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}
            >
              {primitive.states.map((state) => (
                <StateCell key={state} primitiveId={primitive.id} state={state} anchor={copy === 0}>
                  <primitive.Demo state={state} />
                </StateCell>
              ))}
            </div>
          </GalleryThemeProvider>
        </div>
      ))}
    </main>
  );
}

function PrimitiveNav({ current }: { current: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <>
      <nav
        aria-label="Primitives"
        className="hidden xl:sticky xl:top-8 xl:block xl:w-60 xl:shrink-0 xl:self-start"
      >
        <PrimitiveList current={current} counts={false} />
      </nav>
      <div className="flex flex-col gap-1 xl:hidden">
        <label htmlFor="gallery-primitive" className="text-label">
          Primitive
        </label>
        <select
          id="gallery-primitive"
          value={current}
          onChange={(e) => {
            const next = findPrimitive(e.target.value);
            if (next) navigate({ pathname: `/dev/gallery/${next.id}`, search: location.search });
          }}
          className="min-h-11 w-full max-w-sm rounded-md border border-control-border bg-surface-page px-3 text-body text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {groupedPrimitives().map(({ group, primitives }) => (
            <optgroup key={group} label={group}>
              {primitives.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    </>
  );
}

function Frames({
  primitive,
  widths,
  themes,
  state,
}: {
  primitive: Primitive;
  widths: readonly FrameWidth[];
  themes: readonly ThemeName[];
  state: string | null;
}) {
  const small = widths.filter((w) => w < 1440);
  const large = widths.filter((w) => w >= 1440);
  const frame = (width: FrameWidth, theme: ThemeName, first: boolean): ReactNode => (
    <GalleryFrame
      key={`${theme}-${width}`}
      primitiveId={primitive.id}
      label={primitive.label}
      width={width}
      theme={theme}
      state={state}
      scrollToState={first}
    />
  );
  return (
    <div className="mt-6 flex flex-col gap-10">
      {themes.map((theme, t) => (
        <section key={theme} aria-labelledby={`theme-${theme}`} className="flex flex-col gap-6">
          <h3 id={`theme-${theme}`} className="text-label font-semibold">
            {theme === "light" ? "Light theme" : "Dark theme"}
          </h3>
          {small.length > 0 ? (
            <div className="flex min-w-0 flex-col gap-6 xl:flex-row xl:items-start">
              {small.map((w, i) => frame(w, theme, t === 0 && i === 0))}
            </div>
          ) : null}
          {large.map((w) => frame(w, theme, t === 0 && small.length === 0))}
        </section>
      ))}
    </div>
  );
}

export function GalleryPrimitive() {
  const { primitiveId } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const primitive = findPrimitive(primitiveId);
  const bare = params.get("bare") === "1";
  const widthChoice = parseWidth(params.get("w"));
  const themeChoice = parseTheme(params.get("theme"));

  if (!primitive) {
    return (
      <Fallback message={`No primitive called “${primitiveId ?? ""}”. Pick one from the list.`} />
    );
  }
  if (bare) return <BareMatrix primitive={primitive} themes={themesOf(themeChoice)} />;

  const requested = stateFromHash(location.hash);
  const known = requested !== null && primitive.states.includes(requested);
  const setQuery = (key: "w" | "theme", value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    navigate({ search: `?${next.toString()}`, hash: location.hash }, { replace: true });
  };

  return (
    <div className="wrap mx-auto flex max-w-[1760px] flex-col gap-6 p-4 pb-16 font-sans text-ink md:p-6 xl:flex-row xl:gap-10 xl:p-8">
      <PrimitiveNav current={primitive.id} />
      <main className="min-w-0 flex-1">
        <Header />
        <div className="mt-6 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end md:gap-8">
          <Segmented<WidthChoice>
            label="Width"
            options={WIDTH_OPTIONS}
            value={widthChoice}
            onValueChange={(v) => setQuery("w", v)}
          />
          <Segmented<ThemeChoice>
            label="Theme"
            options={THEME_OPTIONS}
            value={themeChoice}
            onValueChange={(v) => setQuery("theme", v)}
          />
        </div>
        <h2 className="mt-8 font-display text-heading">{primitive.label}</h2>
        {requested !== null && !known ? (
          <p role="status" className="mt-2 text-body text-ink-muted">
            {`No state called “${requested}” for ${primitive.label}. Showing all states.`}
          </p>
        ) : null}
        <Frames
          primitive={primitive}
          widths={widthsOf(widthChoice)}
          themes={themesOf(themeChoice)}
          state={known ? requested : null}
        />
        <BackLink />
      </main>
    </div>
  );
}
