import { describe, expect, it } from "vitest";
import { canShowSubmit, resolveVisibility } from "../src/rclr.js";
import type { SurveyEdge, SurveySchema } from "../src/types.js";

const mk = (
  edges: SurveyEdge[],
  questions?: SurveySchema["questions"],
): SurveySchema => ({
  id: "s",
  version: 1,
  entryId: "q1",
  questions: questions ?? {
    q1: { id: "q1", kind: "single_choice", title: "Start", options: ["a", "b"], required: true },
    q2: { id: "q2", kind: "text", title: "Branch A", required: true },
    q3: { id: "q3", kind: "text", title: "Branch B", required: true },
  },
  edges,
});

describe("RCLR visibility", () => {
  it("shows only entry when no answers satisfy branches", () => {
    const schema = mk([
      { id: "e1", from: "q1", to: "q2", condition: { type: "equals", questionId: "q1", value: "a" } },
      { id: "e2", from: "q1", to: "q3", condition: { type: "equals", questionId: "q1", value: "b" } },
    ]);
    const r = resolveVisibility(schema, {});
    expect([...r.visibleIds].sort()).toEqual(["q1"]);
    expect(r.consistent).toBe(true);
  });

  it("recursively expands branch A", () => {
    const schema = mk([
      { id: "e1", from: "q1", to: "q2", condition: { type: "equals", questionId: "q1", value: "a" } },
      { id: "e2", from: "q1", to: "q3", condition: { type: "equals", questionId: "q1", value: "b" } },
    ]);
    const r = resolveVisibility(schema, { q1: "a" });
    expect(r.visibleIds.has("q1") && r.visibleIds.has("q2")).toBe(true);
    expect(r.visibleIds.has("q3")).toBe(false);
    expect(r.consistent).toBe(true);
  });

  it("flags cycle in graph", () => {
    const schema = mk([
      { id: "e1", from: "q1", to: "q2" },
      { id: "e2", from: "q2", to: "q3" },
      { id: "e3", from: "q3", to: "q1" },
    ]);
    const r = resolveVisibility(schema, {});
    expect(r.consistent).toBe(false);
    expect(r.conflictCodes).toContain("CYCLE_DETECTED");
  });

  it("flags unknown question in condition", () => {
    const schema = mk(
      [
        {
          id: "e1",
          from: "q1",
          to: "q2",
          condition: { type: "equals", questionId: "missing", value: "x" },
        },
      ],
      {
        q1: { id: "q1", kind: "single_choice", title: "S", options: ["a"] },
        q2: { id: "q2", kind: "text", title: "T" },
      },
    );
    const r = resolveVisibility(schema, { q1: "a" });
    expect(r.conflictCodes).toContain("CONDITION_UNKNOWN_QUESTION");
    expect(r.consistent).toBe(false);
  });

  it("submit hidden until required visible questions answered", () => {
    const schema = mk([
      { id: "e1", from: "q1", to: "q2", condition: { type: "equals", questionId: "q1", value: "a" } },
      { id: "e2", from: "q1", to: "q3", condition: { type: "equals", questionId: "q1", value: "b" } },
    ]);
    const r1 = resolveVisibility(schema, { q1: "a" });
    expect(canShowSubmit(schema, { q1: "a" }, r1)).toBe(false);
    expect(canShowSubmit(schema, { q1: "a", q2: "ok" }, r1)).toBe(true);
  });
});
