import { describe, expect, it } from "vitest";
import { adjacencyOutgoing, assertAcyclic, edgeSatisfied } from "../src/dag.js";
import type { SurveyEdge, SurveySchema } from "../src/types.js";

const baseSchema = (edges: SurveyEdge[]): SurveySchema => ({
  id: "s1",
  version: 1,
  entryId: "q1",
  questions: {
    q1: { id: "q1", kind: "single_choice", title: "A", options: ["yes", "no"] },
    q2: { id: "q2", kind: "text", title: "B" },
    q3: { id: "q3", kind: "text", title: "C" },
  },
  edges,
});

describe("dag helpers", () => {
  it("detects cycles", () => {
    const edges: SurveyEdge[] = [
      { id: "e1", from: "q1", to: "q2" },
      { id: "e2", from: "q2", to: "q3" },
      { id: "e3", from: "q3", to: "q1" },
    ];
    expect(() => assertAcyclic(baseSchema(edges))).toThrow("CYCLE_DETECTED");
  });

  it("accepts acyclic graph", () => {
    const edges: SurveyEdge[] = [
      { id: "e1", from: "q1", to: "q2", condition: { type: "equals", questionId: "q1", value: "yes" } },
      { id: "e2", from: "q1", to: "q3", condition: { type: "equals", questionId: "q1", value: "no" } },
    ];
    expect(() => assertAcyclic(baseSchema(edges))).not.toThrow();
  });

  it("edgeSatisfied respects equals and oneOf", () => {
    const answers = { q1: "yes" };
    expect(
      edgeSatisfied({ type: "equals", questionId: "q1", value: "yes" }, answers),
    ).toBe(true);
    expect(
      edgeSatisfied({ type: "oneOf", questionId: "q1", values: ["no", "maybe"] }, answers),
    ).toBe(false);
  });

  it("builds adjacency", () => {
    const edges: SurveyEdge[] = [
      { id: "a", from: "q1", to: "q2" },
      { id: "b", from: "q1", to: "q3" },
    ];
    const m = adjacencyOutgoing(edges);
    expect(m.get("q1")?.sort()).toEqual(["q2", "q3"].sort());
  });
});
