import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Pre-bundle the phase 4 UI dependencies so the dev server does not re-optimise and reload the
  // page in the middle of a screenshot or review run.
  optimizeDeps: {
    include: [
      "motion/react",
      "@base-ui/react/toggle-group",
      "@base-ui/react/toggle",
      "@base-ui/react/switch",
      "@base-ui/react/popover",
      "@base-ui/react/menu",
      "@base-ui/react/tooltip",
      "@base-ui/react/dialog",
      "@base-ui/react/alert-dialog",
      "@base-ui/react/tabs",
      "@base-ui/react/select",
      "@base-ui/react/slider",
      "@base-ui/react/checkbox",
      "@base-ui/react/radio-group",
      "@base-ui/react/radio",
      "@base-ui/react/field",
      "@base-ui/react/input",
      "@base-ui/react/meter",
      "@base-ui/react/toast",
      "@base-ui/react/scroll-area",
      "@base-ui/react/separator",
      "@base-ui/react/button",
    ],
  },
  server: { port: 5173, strictPort: true, host: "localhost" },
  preview: { port: 4173, strictPort: true, host: "localhost" },
});
