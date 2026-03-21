import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Keep Next defaults + repo paths that are not app source (Capacitor / vendored / tooling).
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "android/**",
    "ios/**",
    "vendor/**",
    "node_modules/**",
    // Plain Node scripts (CommonJS) — not part of the Next/TS app
    "check-env.js",
    "fix-wearables.js",
    "scripts/**/*.js",
  ]),
  {
    rules: {
      // Brownfield app: ~900+ style/type warnings don’t reflect runtime bugs. Rules are off so
      // `npm run lint` stays usable; turn back to "warn" per folder as you clean things up.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "off",
      "@typescript-eslint/prefer-as-const": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "prefer-const": "off",
      "react/no-unescaped-entities": "off",
      // react-hooks v7 “compiler” rules — noisy for classic Next/App Router patterns
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/exhaustive-deps": "off",
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
