import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  base: "/Xinxin/",
  build: { outDir: "dist", emptyOutDir: true },
  resolve: { alias: { "@": resolve(__dirname, ".") } },
});
