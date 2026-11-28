import type { RouteObject } from "react-router";

export interface BuildRoutesOptions {
  /** True only in the dev server build. `/dev/*` holds agent and draft routes and never ships to study. */
  includeDev: boolean;
}

// URL surface: `/`, `/dev`, `/dev/pitch`, `/dev/review-fixture`, `/dev/directions` and
// `/dev/directions/:id/:screen` (dev only) and the catch-all not-found route.
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
    routes.push({
      path: "/dev/pitch",
      lazy: async () => ({
        Component: (await import("./routes/dev-pitch.tsx")).default,
      }),
    });
    routes.push({
      path: "/dev/review-fixture",
      lazy: async () => ({
        Component: (await import("./routes/dev-review-fixture.tsx")).default,
      }),
    });
    // Visual directions (04-UI-SPEC): removed when the picked direction becomes DESIGN.md (04-13).
    routes.push({
      path: "/dev/directions",
      lazy: async () => ({
        Component: (await import("./routes/dev-directions.tsx")).DirectionsIndex,
      }),
    });
    routes.push({
      path: "/dev/directions/:id/:screen",
      lazy: async () => ({
        Component: (await import("./routes/dev-directions.tsx")).DirectionScreen,
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
