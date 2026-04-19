import { resolveVisibility } from "./rclr.js";
import type {
  GbcrMigrationResult,
  SessionAnswers,
  SessionState,
  SurveySchema,
} from "./types.js";

/**
 * Graph-Based Conflict Resolution with schema versioning.
 * Compares client session schemaVersion with published `nextSchema`.
 */
export function migrateSessionForNewSchema(
  prevSchema: SurveySchema,
  nextSchema: SurveySchema,
  session: SessionState,
): GbcrMigrationResult {
  if (
    prevSchema.id === nextSchema.id &&
    session.schemaVersion === nextSchema.version
  ) {
    return { outcome: "unchanged", session };
  }

  const notes: string[] = [];
  const dropped: string[] = [];
  const nextAnswers: SessionAnswers = { ...session.answers };

  for (const qid of Object.keys(nextAnswers)) {
    if (!nextSchema.questions[qid]) {
      delete nextAnswers[qid];
      dropped.push(qid);
    }
  }

  let trail = session.trail.filter((id) => nextSchema.questions[id]);
  let current = session.currentQuestionId;
  if (current && !nextSchema.questions[current]) {
    current = undefined;
  }

  const provisional: SessionState = {
    schemaId: nextSchema.id,
    schemaVersion: nextSchema.version,
    answers: nextAnswers,
    trail,
    currentQuestionId: current,
  };

  const rclr = resolveVisibility(nextSchema, nextAnswers);
  if (rclr.consistent) {
    if (dropped.length) {
      notes.push(`Atomic recovery: removed answers for deleted nodes: ${dropped.join(", ")}`);
    } else {
      notes.push("Atomic recovery: structure compatible; answers preserved.");
    }
    return {
      outcome: "recovered_atomic",
      session: provisional,
      droppedAnswersFor: dropped,
      notes,
    };
  }

  const stable = findLastStableNode(nextSchema, nextAnswers, trail);
  const rolledTrail = stable ? trail.slice(0, trail.indexOf(stable) + 1) : [nextSchema.entryId];
  const trimmedAnswers: SessionAnswers = {};
  for (const id of rolledTrail) {
    if (nextAnswers[id] !== undefined) trimmedAnswers[id] = nextAnswers[id];
  }

  notes.push(
    `Logic inconsistency after schema v${nextSchema.version}; rollback to stable node ${stable ?? nextSchema.entryId}.`,
  );

  return {
    outcome: "rollback_stable",
    session: {
      ...provisional,
      answers: trimmedAnswers,
      trail: rolledTrail,
      currentQuestionId: stable ?? nextSchema.entryId,
    },
    stableNodeId: stable ?? nextSchema.entryId,
    conflictCodes: rclr.conflictCodes,
    notes,
  };
}

function findLastStableNode(
  schema: SurveySchema,
  answers: SessionAnswers,
  trail: string[],
): string | undefined {
  for (let i = trail.length - 1; i >= 0; i--) {
    const id = trail[i];
    const prefixTrail = trail.slice(0, i + 1);
    const prefixAnswers: SessionAnswers = {};
    for (const tid of prefixTrail) {
      if (answers[tid] !== undefined) prefixAnswers[tid] = answers[tid];
    }
    const r = resolveVisibility(schema, prefixAnswers);
    if (r.consistent && r.visibleIds.has(id)) return id;
  }
  return undefined;
}
