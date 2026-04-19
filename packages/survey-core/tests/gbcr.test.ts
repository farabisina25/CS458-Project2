import { describe, expect, it } from "vitest";
import { migrateSessionForNewSchema } from "../src/gbcr.js";
import type { SessionState, SurveyEdge, SurveySchema } from "../src/types.js";

const schemaV1 = (): SurveySchema => ({
  id: "demo",
  version: 1,
  entryId: "q1",
  questions: {
    q1: { id: "q1", kind: "single_choice", title: "Pick", options: ["x", "y"] },
    q2: { id: "q2", kind: "text", title: "Follow x" },
    q3: { id: "q3", kind: "text", title: "Follow y" },
  },
  edges: [
    { id: "e1", from: "q1", to: "q2", condition: { type: "equals", questionId: "q1", value: "x" } },
    { id: "e2", from: "q1", to: "q3", condition: { type: "equals", questionId: "q1", value: "y" } },
  ],
});

const sessionMid = (): SessionState => ({
  schemaId: "demo",
  schemaVersion: 1,
  answers: { q1: "x", q2: "hello" },
  trail: ["q1", "q2"],
  currentQuestionId: "q2",
});

describe("GBCR schema versioning", () => {
  it("unchanged when version matches", () => {
    const s = schemaV1();
    const sess = sessionMid();
    const r = migrateSessionForNewSchema(s, { ...s, version: 1 }, sess);
    expect(r.outcome).toBe("unchanged");
  });

  it("atomic recovery drops answers for deleted nodes but keeps consistent graph", () => {
    const prev = schemaV1();
    const next: SurveySchema = {
      ...prev,
      version: 2,
      questions: { q1: prev.questions.q1, q3: prev.questions.q3 },
      edges: [
        { id: "e2", from: "q1", to: "q3", condition: { type: "equals", questionId: "q1", value: "y" } },
        {
          id: "e1b",
          from: "q1",
          to: "q3",
          condition: { type: "equals", questionId: "q1", value: "x" },
        },
      ],
    };
    const sess = sessionMid();
    const r = migrateSessionForNewSchema(prev, next, sess);
    expect(r.outcome).toBe("recovered_atomic");
    if (r.outcome === "recovered_atomic") {
      expect(r.droppedAnswersFor).toContain("q2");
      expect(r.session.answers.q1).toBe("x");
      expect(r.session.answers.q2).toBeUndefined();
    }
  });

  it("rollback to stable node when new logic makes answers inconsistent", () => {
    const prev = schemaV1();
    const next: SurveySchema = {
      ...prev,
      version: 3,
      edges: [
        { id: "e1", from: "q1", to: "q2", condition: { type: "equals", questionId: "q1", value: "y" } },
        { id: "e2", from: "q1", to: "q3", condition: { type: "equals", questionId: "q1", value: "x" } },
      ],
    };
    const sess = sessionMid();
    const r = migrateSessionForNewSchema(prev, next, sess);
    expect(r.outcome).toBe("rollback_stable");
    if (r.outcome === "rollback_stable") {
      expect(r.conflictCodes.length).toBeGreaterThan(0);
      expect(r.session.trail).toContain(r.stableNodeId);
    }
  });
});

describe("GBCR edge cases", () => {
  it("handles empty trail by falling back to entry", () => {
    const prev = schemaV1();
    const next: SurveySchema = {
      ...prev,
      version: 4,
      questions: { q1: prev.questions.q1 },
      edges: [],
    };
    const sess: SessionState = {
      schemaId: "demo",
      schemaVersion: 1,
      answers: { q1: "x", q2: "z" },
      trail: [],
      currentQuestionId: "q1",
    };
    const r = migrateSessionForNewSchema(prev, next, sess);
    expect(r.session.currentQuestionId).toBe("q1");
  });
});
