// eslint.config.js  – ESM + flat config
import eslint from "@eslint/js";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint"; // meta-paquete

// Build a type-safe config that already wires parser & plugin

export default tseslint.config(
  {
    ignores: [".next/**", ".opencode/node_modules/**"],
  },
  eslint.configs.recommended, // Core ESLint rules
  tseslint.configs.recommended, // TS-ESLint rules
  {
    /* Extra plugins that work for JS y TS */
    plugins: {
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "warn",

      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["scripts/**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
  },
);
