import { describe, expect, it } from "vitest";
import { buildRoutes } from "./routes.ts";

describe("buildRoutes", () => {
  it("includes the /dev routes in the dev build", () => {
    const paths = buildRoutes({ includeDev: true }).map((route) => route.path);
    expect(paths).toEqual([
      "/",
      "/dev",
      "/dev/pitch",
      "/dev/review-fixture",
      "/dev/directions",
      "/dev/directions/:id/:screen",
      "/dev/gallery",
      "/dev/gallery/:primitiveId",
      "*",
    ]);
  });

  it("leaves /dev out of the study build", () => {
    const paths = buildRoutes({ includeDev: false }).map((route) => route.path);
    expect(paths).toEqual(["/", "*"]);
  });

  it("resolves every lazy route to a component function", async () => {
    for (const route of buildRoutes({ includeDev: true })) {
      expect(route.lazy, `route ${route.path} has lazy`).toBeTypeOf("function");
      const lazy = route.lazy as () => Promise<{ Component?: unknown }>;
      const resolved = await lazy();
      expect(resolved.Component, `route ${route.path} Component`).toBeTypeOf("function");
    }
  });
});
