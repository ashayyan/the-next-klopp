import type { RouteObject } from "react-router";

export interface BuildRoutesOptions {
	/** True only in the dev server build; later plans add `/dev` and the not-found route behind it. */
	includeDev: boolean;
}

export function buildRoutes(_options: BuildRoutesOptions): RouteObject[] {
	return [
		{
			path: "/",
			lazy: async () => ({
				Component: (await import("./routes/home.tsx")).default,
			}),
		},
	];
}
