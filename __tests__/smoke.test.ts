import { execSync } from "child_process";
import { describe, expect, it } from "vitest";

describe("public pages build", () => {
  it("next build completes without errors", () => {
    const output = execSync("npx next build 2>&1", {
      encoding: "utf-8",
      timeout: 120_000,
      cwd: process.cwd(),
    });

    // Build should succeed
    expect(output).toContain("Creating an optimized production build");

    // All static pages should be generated
    expect(output).toContain("○ /");
    expect(output).toContain("○ /about");
    expect(output).toContain("○ /blog");
    expect(output).toContain("○ /work");

    // Dynamic slug routes should be present
    expect(output).toContain("/blog/[slug]");
    expect(output).toContain("/work/[slug]");

    // No build errors
    expect(output).not.toContain("Build error occurred");
  });
});
