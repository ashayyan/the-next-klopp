import type { RouteObject } from "react-router";

export interface BuildRoutesOptions {
  /** True only in the dev server build. `/dev/*` holds agent and draft routes and never ships to study. */
  includeDev: boolean;
}

// Phase 1 URL surface: `/`, `/dev` (dev only) and the catch-all not-found route.
// `/learn/:trackId/:chapterId/:lessonId`, `/review` and `/whats-new` arrive with their phases.
export function buildRoutes({ includeDev }: BuildRoutesOptions): RouteObject[] {
  const routes: RouteObject[] = [
    {
      path: "/",
      lazy: async () => ({
        Component: (await import("./routes/home.tsx")).default,
      }),
    },
  ];

  // The `import.meta.env.DEV` check lets the production build drop the dev chunk entirely.
  if (includeDev && import.meta.env.DEV) {
    routes.push({
      path: "/dev",
      lazy: async () => ({
        Component: (await import("./routes/dev.tsx")).default,
      }),
    });
  }

  routes.push({
    path: "*",
    lazy: async () => ({
      Component: (await import("./routes/not-found.tsx")).default,
    }),
  });

  return routes;
}
