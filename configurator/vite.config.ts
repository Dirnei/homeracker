import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/configurator/",
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
