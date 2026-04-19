import { edgeSatisfied } from "./dag.js";
import type {
  RclrConflictCode,
  RclrResult,
  SessionAnswers,
  SurveyEdge,
  SurveySchema,
} from "./types.js";

/**
 * Recursive Conditional Logic Resolution (RCLR):
 * Treats the survey as a DAG rooted at `entryId` and computes the set of nodes
 * reachable when an edge fires iff its condition is satisfied by current answers.
 */
export function resolveVisibility(
  schema: SurveySchema,
  answers: SessionAnswers,
): RclrResult {
  const conflictCodes: RclrConflictCode[] = [];
  if (!schema.questions[schema.entryId]) {
    conflictCodes.push("MISSING_ENTRY");
    return { visibleIds: new Set(), consistent: false, conflictCodes };
  }

  for (const e of schema.edges) {
    const c = e.condition;
    if (c && !schema.questions[c.questionId]) {
      conflictCodes.push("CONDITION_UNKNOWN_QUESTION");
    }
  }

  const visible = new Set<string>();
  const edgesByFrom = new Map<string, SurveyEdge[]>();
  for (const e of schema.edges) {
    const list = edgesByFrom.get(e.from) ?? [];
    list.push(e);
    edgesByFrom.set(e.from, list);
  }

  const onPath = new Set<string>();
  const closed = new Set<string>();

  const visit = (nodeId: string) => {
    if (closed.has(nodeId)) return;
    if (onPath.has(nodeId)) {
      conflictCodes.push("CYCLE_DETECTED");
      throw new Error("CYCLE_DETECTED");
    }
    onPath.add(nodeId);
    visible.add(nodeId);
    const outs = edgesByFrom.get(nodeId) ?? [];
    for (const e of outs) {
      if (!edgeSatisfied(e.condition, answers)) continue;
      visit(e.to);
    }
    onPath.delete(nodeId);
    closed.add(nodeId);
  };

  try {
    visit(schema.entryId);
  } catch {
    if (!conflictCodes.includes("CYCLE_DETECTED")) {
      conflictCodes.push("CYCLE_DETECTED");
    }
    return { visibleIds: visible, consistent: false, conflictCodes };
  }

  // Orphan check: every visible node must be reachable from entry via *some* path
  // (visit() already enforces this). Secondary: "zombie" = visible in UI but parent path broken —
  // we approximate by ensuring all conditional edges used had their referent answered.
  if (!orphanHeuristic(schema, answers, visible)) {
    conflictCodes.push("ORPHAN_VISIBLE");
  }

  for (const qid of Object.keys(answers)) {
    if (schema.questions[qid] && !visible.has(qid)) {
      conflictCodes.push("STALE_ANSWER");
    }
  }

  return {
    visibleIds: visible,
    consistent: conflictCodes.length === 0,
    conflictCodes: [...new Set(conflictCodes)],
  };
}

function orphanHeuristic(
  schema: SurveySchema,
  answers: SessionAnswers,
  visible: Set<string>,
): boolean {
  for (const id of visible) {
    if (id === schema.entryId) continue;
    const incoming = schema.edges.filter((e) => e.to === id);
    if (incoming.length === 0) return false;
    const anyOk = incoming.some((e) => {
      if (!visible.has(e.from)) return false;
      return edgeSatisfied(e.condition, answers);
    });
    if (!anyOk) return false;
  }
  return true;
}

export function canShowSubmit(
  schema: SurveySchema,
  answers: SessionAnswers,
  rclr: RclrResult,
): boolean {
  if (!rclr.consistent) return false;
  for (const id of rclr.visibleIds) {
    const q = schema.questions[id];
    if (!q?.required) continue;
    if (answers[id] === undefined || answers[id] === "") return false;
  }
  return true;
}
