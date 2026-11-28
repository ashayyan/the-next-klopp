import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import remarkFrontmatter from "remark-frontmatter";
import { defineConfig } from "vite";
import { lessonsPlugin } from "./scripts/lib/content/vite-plugin.ts";

export default defineConfig({
  plugins: [
    // MDX first (enforce pre) so lesson.mdx is JavaScript before the React transform sees it.
    // remark-frontmatter only makes a stray YAML block parse instead of render; lessons carry none.
    // `include` keeps plain .md out: the plugin strips the query, so `DESIGN.md?raw` would compile.
    {
      enforce: "pre",
      ...mdx({
        include: /\.mdx$/,
        providerImportSource: "@mdx-js/react",
        remarkPlugins: [remarkFrontmatter],
      }),
    },
    react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
    tailwindcss(),
    // virtual:tnk-lessons: the lessons and lazy MDX loaders this build includes.
    lessonsPlugin(),
  ],
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
      "@base-ui/react/number-field",
      "@base-ui/react/meter",
      "@base-ui/react/toast",
      "@base-ui/react/scroll-area",
      "@base-ui/react/separator",
      "@base-ui/react/button",
      "@mdx-js/react",
    ],
  },
  // Only the fixtures build (dist-walker) writes .vite/manifest.json, for the per-chunk budget;
  // dist/ never carries one.
  build: { manifest: process.env.VITE_INCLUDE_FIXTURES === "1" },
  server: { port: 5173, strictPort: true, host: "localhost" },
  preview: { port: 4173, strictPort: true, host: "localhost" },
});
