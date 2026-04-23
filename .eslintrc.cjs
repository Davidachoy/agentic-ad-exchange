/* eslint-env node */
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier",
  ],
  settings: {
    "import/resolver": {
      typescript: { alwaysTryTypes: true, project: ["./tsconfig.json"] },
      node: true,
    },
  },
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/consistent-type-imports": "warn",
    "import/no-default-export": "off",
    // Reason: these warn on legitimate CJS-interop default imports (pino, express.json).
    "import/no-named-as-default": "off",
    "import/no-named-as-default-member": "off",
    "import/order": [
      "warn",
      {
        groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],
    "no-console": "off",
  },
  ignorePatterns: [
    "node_modules",
    "dist",
    "build",
    "coverage",
    "**/*.d.ts",
    "tutorials/**",
    ".pnpm-store",
  ],
  overrides: [
    {
      files: ["ui/**/*.{ts,tsx}"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["@ade/wallets", "@ade/wallets/*"],
                message:
                  "ui/ must not import from @ade/wallets — entity secret and Circle API keys live there.",
              },
              {
                group: [
                  "@ade/server/middleware/nanopayments",
                  "@ade/server/dist/middleware/nanopayments",
                ],
                message:
                  "ui/ must not import the Gateway middleware — it mediates real USDC movement.",
              },
              {
                group: ["**/secrets/**", "**/*secret*"],
                message: "ui/ must not import any module whose path references secrets.",
              },
            ],
          },
        ],
      },
    },
  ],
};
