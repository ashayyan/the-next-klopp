// Which lessons a build includes (05-CONTEXT "Draft visibility", 05-RESEARCH Pattern 1).
// Pure and Vite-free so it is unit-tested on its own. Erasable TypeScript only.

export type SelectMode = {
  command: "serve" | "build";
  /** `VITE_INCLUDE_FIXTURES=1`: the fixtures build (dist-walker) or a dev server for the walker. */
  includeFixtures: boolean;
  /** Vitest (Vite `mode === "test"`). */
  test: boolean;
};

export interface Selectable {
  spec: { id: string; status: string };
  fixture: boolean;
}

/**
 * - test: every lesson and every fixture.
 * - serve (dev): every non-fixture lesson of any status; fixtures only with the flag.
 * - build with the flag (fixtures build): `shipped` and `shippable` lessons plus every fixture.
 * - any other build (study and Vercel): `shipped` only, never a fixture.
 */
export function selectLessons<T extends Selectable>(all: readonly T[], mode: SelectMode): T[] {
  if (mode.test) return [...all];
  if (mode.command === "serve") {
    return all.filter((l) => !l.fixture || mode.includeFixtures);
  }
  if (mode.includeFixtures) {
    return all.filter(
      (l) => l.fixture || l.spec.status === "shipped" || l.spec.status === "shippable",
    );
  }
  return all.filter((l) => !l.fixture && l.spec.status === "shipped");
}
