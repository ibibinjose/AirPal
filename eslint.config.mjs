import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "build/**",
      "**/build/**",
      "functions/lib/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "android/**",
      "ios/**",
      "e2e/**",
      "*.config.*",
      "*.config.*.*",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["scripts/screenshots.mjs"],
    languageOptions: {
      globals: { console: "readonly", process: "readonly", fetch: "readonly", setTimeout: "readonly" },
    },
  },
  {
    files: ["scripts/**/*.mjs", "functions/*.mjs"],
    languageOptions: {
      globals: { console: "readonly", process: "readonly" },
    },
  },
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      // Pervasive in this codebase (Firestore docs, callable payloads); enforced via
      // shared validators and rules instead of the type system.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      // Bug 2 was a conditional-hook crash invisible without this rule.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
);
