import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Pinned test defines: versionCode must match android/app/build.gradle.
  define: {
    __APP_VERSION_NAME__: JSON.stringify("2.0.1"),
    __APP_VERSION_CODE__: JSON.stringify("10"),
    __BUILD_TIMESTAMP__: JSON.stringify("2026-09-15T00:00:00.000Z"),
    __FIREBASE_APPLET_CONFIG__: JSON.stringify({}),
  },
  test: {
    include: ["shared/**/*.test.ts", "src/**/*.test.ts", "functions/src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
});
