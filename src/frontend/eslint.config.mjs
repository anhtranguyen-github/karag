import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Auto-generated API client (regenerated in CI)
    "src/generated/**",
    "src/sdk/generated/**",
    "public/mockServiceWorker.js",
  ]),
  // Custom rule overrides for CI compatibility
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
      "prefer-const": "warn",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "off",
      "@next/next/no-html-link-for-pages": "warn",
      "import/no-anonymous-default-export": "off",
    },
  },
]);

export default eslintConfig;
