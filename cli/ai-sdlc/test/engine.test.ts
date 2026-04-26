import { describe, it, expect } from "vitest";
import {
  PROJECT_KINDS,
  VENDORS,
  COMPLIANCE,
  REQ_STATUS,
  EVIDENCE_KINDS,
} from "../src/types.js";
import {
  STACKS,
  getStack,
  recommendedStackFor,
} from "../src/engine/registry.js";

describe("closed-set enums (Anti-Hallucination Charter §6)", () => {
  it("project kinds are stable", () => {
    expect(PROJECT_KINDS).toContain("backend");
    expect(PROJECT_KINDS).toContain("ai");
    expect(PROJECT_KINDS).toHaveLength(13);
  });

  it("evidence kinds match charter §1", () => {
    expect(EVIDENCE_KINDS).toEqual([
      "file",
      "command",
      "test",
      "web",
      "human",
      "prior-artifact",
    ]);
  });

  it("vendor list covers documented seven", () => {
    expect(VENDORS).toEqual([
      "copilot",
      "claude-code",
      "cursor",
      "aider",
      "continue",
      "opencode",
      "generic-mcp",
    ]);
  });

  it("requirement statuses match AOC §5", () => {
    expect(REQ_STATUS).toContain("Draft");
    expect(REQ_STATUS).toContain("Done");
    expect(REQ_STATUS).toContain("Blocked");
  });

  it("compliance frameworks include the seven plus none", () => {
    expect(COMPLIANCE).toContain("none");
    expect(COMPLIANCE).toHaveLength(8);
  });
});

describe("registry", () => {
  it("every stack has a runnable template flag", () => {
    for (const s of STACKS) {
      expect(typeof s.hasRunnableTemplate).toBe("boolean");
    }
  });

  it("getStack resolves by id", () => {
    expect(getStack("node-fastify-ts")?.kind).toBe("backend");
    expect(getStack("python-langgraph")?.kind).toBe("ai");
    expect(getStack("does-not-exist")).toBeUndefined();
  });

  it("recommendedStackFor returns a curated stack per kind", () => {
    const s = recommendedStackFor("docs");
    expect(s.id).toBe("docusaurus-ts");
    expect(recommendedStackFor("backend").id).toBe("node-fastify-ts");
    expect(recommendedStackFor("ai").id).toBe("python-langgraph");
  });
});

import fs from "node:fs";
import path from "node:path";

describe("agent-memory release-notes workflow template", () => {
  const wf = path.resolve(
    __dirname,
    "..",
    "templates",
    "framework",
    ".github",
    "workflows",
    "agent-memory-release-notes.yml",
  );
  it("ships in the framework template tree", () => {
    expect(fs.existsSync(wf)).toBe(true);
  });
  it("triggers on tag push and exposes workflow_dispatch inputs", () => {
    const body = fs.readFileSync(wf, "utf8");
    expect(body).toMatch(/on:\s*\n\s*push:\s*\n\s*tags:\s*\n\s*-\s*"v\*"/);
    expect(body).toContain("workflow_dispatch:");
    expect(body).toContain("since:");
    expect(body).toContain("until:");
  });
  it("invokes ai-sdlc release-notes (md + json) and context-pack", () => {
    const body = fs.readFileSync(wf, "utf8");
    expect(body).toContain("ai-sdlc release-notes");
    expect(body).toContain("--format json");
    expect(body).toContain("ai-sdlc context-pack");
    expect(body).toContain("--exclude-bodies");
  });
  it("uploads artifacts and attaches to GitHub Release on tag push", () => {
    const body = fs.readFileSync(wf, "utf8");
    expect(body).toContain("actions/upload-artifact@v4");
    expect(body).toContain("softprops/action-gh-release@v2");
    expect(body).toContain("RELEASE_NOTES_*.md");
    expect(body).toContain("context-pack_*.jsonl");
  });
});
