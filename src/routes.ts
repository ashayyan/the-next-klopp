import type { RouteObject } from "react-router";

export interface BuildRoutesOptions {
  /** True only in the dev server build. `/dev/*` holds agent and draft routes and never ships to study. */
  includeDev: boolean;
}

// URL surface: `/`, `/learn/:lessonId` (both builds; the lessons each build includes are chosen at
// build time in virtual:tnk-lessons), `/dev`, `/dev/pitch`, `/dev/review-fixture`, `/dev/directions` and
// `/dev/directions/:id/:screen`, `/dev/gallery` and `/dev/gallery/:primitiveId` (dev only) and the
// catch-all not-found route.
// `/review` and `/whats-new` arrive with their phases.
export function buildRoutes({ includeDev }: BuildRoutesOptions): RouteObject[] {
  const routes: RouteObject[] = [
    {
      path: "/",
      lazy: async () => ({
        Component: (await import("./routes/home.tsx")).default,
      }),
    },
    {
      path: "/learn/:lessonId",
      lazy: async () => ({
        Component: (await import("./routes/learn/LessonPage.tsx")).default,
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
    // The picked direction's two reference screens (ADR 0010); the other two live in git history.
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
    // Component gallery (DSGN-04): every primitive and interaction with its states, at 3 widths.
    routes.push({
      path: "/dev/gallery",
      lazy: async () => ({
        Component: (await import("./routes/dev-gallery.tsx")).GalleryIndex,
      }),
    });
    routes.push({
      path: "/dev/gallery/:primitiveId",
      lazy: async () => ({
        Component: (await import("./routes/dev-gallery.tsx")).GalleryPrimitive,
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
