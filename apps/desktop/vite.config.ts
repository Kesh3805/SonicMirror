import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Tauri expects a fixed dev port and must not open a browser.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  build: {
    target: "es2023",
    sourcemap: true,
  },
  test: {
    environment: "jsdom",
    // Forked workers time out while starting on Windows; threads are reliable.
    pool: "threads",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
