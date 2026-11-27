import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import "./index.css";
import { buildRoutes } from "./routes.ts";

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Missing #root element in index.html");
}

const router = createBrowserRouter(
	buildRoutes({ includeDev: import.meta.env.DEV }),
);

createRoot(rootElement).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
);
