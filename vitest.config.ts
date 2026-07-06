import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    // Run test files serially. The suite shares a single real Supabase
    // database, so running files in parallel causes intermittent cross-file
    // contention failures. This does not change how tests within a file run.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
