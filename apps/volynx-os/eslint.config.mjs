import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "@next/next/no-html-link-for-pages": "warn"
    }
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"])
])
