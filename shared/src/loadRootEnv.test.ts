import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { findWorkspaceRoot } from "./loadRootEnv.js";

describe("findWorkspaceRoot", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "ade-root-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("finds the marker from a nested directory", () => {
    writeFileSync(join(tmp, "pnpm-workspace.yaml"), "");
    const nested = join(tmp, "packages", "foo", "src");
    mkdirSync(nested, { recursive: true });

    expect(findWorkspaceRoot(nested)).toBe(tmp);
  });

  it("returns the start directory when the marker is already there", () => {
    writeFileSync(join(tmp, "pnpm-workspace.yaml"), "");
    expect(findWorkspaceRoot(tmp)).toBe(tmp);
  });

  it("throws a clear error when the marker is never found", () => {
    // Starting at `/` makes `dirname(current) === current` on the first step,
    // so the walker terminates without finding the marker regardless of what
    // exists on the host filesystem above `tmp`.
    expect(() => findWorkspaceRoot("/")).toThrow(/could not find pnpm-workspace\.yaml/);
  });
});
