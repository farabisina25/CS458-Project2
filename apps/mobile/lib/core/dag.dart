import 'models.dart';

void assertAcyclic(SurveySchema schema) {
  final graph = adjacencyOutgoing(schema.edges);
  final visited = <String>{};

  void dfs(String n, Set<String> stack) {
    if (visited.contains(n)) return;
    if (stack.contains(n)) {
      throw StateError('CYCLE_DETECTED at $n');
    }
    stack.add(n);
    for (final next in graph[n] ?? const <String>[]) {
      dfs(next, stack);
    }
    stack.remove(n);
    visited.add(n);
  }

  final stack = <String>{};
  dfs(schema.entryId, stack);
  for (final q in schema.questions.keys) {
    if (!visited.contains(q)) dfs(q, stack);
  }
}

Map<String, List<String>> adjacencyOutgoing(List<SurveyEdge> edges) {
  final m = <String, List<String>>{};
  for (final e in edges) {
    (m[e.from] ??= <String>[]).add(e.to);
  }
  return m;
}

bool edgeSatisfied(EdgeCondition? condition, Map<String, Object?> answers) {
  if (condition == null) return true;
  final raw = answers[condition.questionId];
  if (raw == null) return false;
  if (condition is EqualsCondition) {
    return raw.toString() == condition.value;
  }
  if (condition is OneOfCondition) {
    final set = condition.values.map((v) => v.toString()).toSet();
    if (raw is List) {
      return raw.any((v) => set.contains(v.toString()));
    }
    return set.contains(raw.toString());
  }
  return false;
}
