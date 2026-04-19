import type { SurveyEdge, SurveySchema } from "./types.js";

export function assertAcyclic(schema: SurveySchema): void {
  const graph = adjacencyOutgoing(schema.edges);
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const dfs = (n: string, stack: Set<string>) => {
    if (visited.has(n)) return;
    if (stack.has(n)) {
      throw new Error(`CYCLE_DETECTED at ${n}`);
    }
    stack.add(n);
    for (const next of graph.get(n) ?? []) {
      dfs(next, stack);
    }
    stack.delete(n);
    visited.add(n);
  };

  dfs(schema.entryId, visiting);
  for (const q of Object.keys(schema.questions)) {
    if (!visited.has(q)) dfs(q, visiting);
  }
}

export function adjacencyOutgoing(edges: SurveyEdge[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const e of edges) {
    const arr = m.get(e.from) ?? [];
    arr.push(e.to);
    m.set(e.from, arr);
  }
  return m;
}

export function edgeSatisfied(
  condition: SurveyEdge["condition"],
  answers: Record<string, unknown>,
): boolean {
  if (!condition) return true;
  const raw = answers[condition.questionId];
  if (raw === undefined) return false;
  if (condition.type === "equals") {
    return String(raw) === condition.value;
  }
  const set = new Set(condition.values.map(String));
  if (Array.isArray(raw)) return raw.some((v) => set.has(String(v)));
  return set.has(String(raw));
}
