import js from "@eslint/js";
import globals from "globals";
import jest from "eslint-plugin-jest";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },

  {
    files: ["**/*.{test,spec}.{js,mjs,cjs}", "**/__tests__/**/*.{js,mjs,cjs}"],
    plugins: { jest },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    // If your plugin version supports flat configs, you can also add:
    // ...jest.configs["flat/recommended"],
  },

  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
]);
