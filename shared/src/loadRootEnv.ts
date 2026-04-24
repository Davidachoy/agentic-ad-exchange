import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadDotenv } from "dotenv";

const WORKSPACE_MARKER = "pnpm-workspace.yaml";

let cachedRoot: string | undefined;

export interface LoadRootEnvResult {
  rootDir: string;
}

/**
 * Loads `.env.local` and `.env` from the monorepo root (not `process.cwd()`).
 * The root is located by walking up from this file until `pnpm-workspace.yaml`
 * is found. `.env.local` takes precedence over `.env`; neither overrides values
 * already set in `process.env`.
 *
 * Called from each package's `config.ts` before zod validation. Safe to call
 * repeatedly — the resolved root is cached per-process.
 *
 * Reason: `pnpm --filter <pkg> <script>` sets CWD to the package dir, so
 * relative dotenv paths miss the root-level `.env.local`.
 */
export function loadRootEnv(): LoadRootEnvResult {
  const rootDir = resolveWorkspaceRoot();
  loadDotenv({
    path: [resolve(rootDir, ".env.local"), resolve(rootDir, ".env")],
  });
  return { rootDir };
}

function resolveWorkspaceRoot(): string {
  if (cachedRoot) return cachedRoot;
  const here = dirname(fileURLToPath(import.meta.url));
  cachedRoot = findWorkspaceRoot(here);
  return cachedRoot;
}

/** Exposed for tests. */
export function findWorkspaceRoot(startDir: string): string {
  let current = resolve(startDir);
  while (current !== dirname(current)) {
    if (existsSync(resolve(current, WORKSPACE_MARKER))) return current;
    current = dirname(current);
  }
  throw new Error(`loadRootEnv: could not find ${WORKSPACE_MARKER} walking up from ${startDir}`);
}

/** Test-only: clears the cached root so subsequent calls re-resolve. */
export function __resetLoadRootEnvCache(): void {
  cachedRoot = undefined;
}
