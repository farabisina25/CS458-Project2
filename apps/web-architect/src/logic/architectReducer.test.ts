import { describe, expect, it } from "vitest";
import { architectReducer } from "./architectReducer.js";
import type { ArchitectDraft } from "./architectTypes.js";
import type { SurveySchema } from "@ares/survey-core";

const baseSchema = (): SurveySchema => ({
  id: "live-demo",
  version: 1,
  entryId: "q1",
  questions: {
    q1: { id: "q1", kind: "single_choice", title: "Q1", options: ["a", "b"] },
  },
  edges: [],
});

const draft = (): ArchitectDraft => ({ schema: baseSchema() });

describe("architectReducer (TDD)", () => {
  it("upserts a question", () => {
    const d = draft();
    const next = architectReducer(d, {
      type: "upsert_question",
      question: { id: "q2", kind: "text", title: "Open" },
    });
    expect(next.schema.questions.q2?.title).toBe("Open");
  });

  it("removes question and incident edges", () => {
    let d = draft();
    d = architectReducer(d, {
      type: "upsert_question",
      question: { id: "q2", kind: "text", title: "X" },
    });
    d = architectReducer(d, {
      type: "add_edge",
      edge: { id: "e1", from: "q1", to: "q2" },
    });
    const next = architectReducer(d, { type: "remove_question", id: "q2" });
    expect(next.schema.edges).toHaveLength(0);
    expect(next.schema.questions.q2).toBeUndefined();
  });

  it("loads schema from API", () => {
    const loaded = baseSchema();
    loaded.version = 4;
    const next = architectReducer(draft(), { type: "load_schema", schema: loaded });
    expect(next.schema.version).toBe(4);
  });
});
