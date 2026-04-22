import 'dag.dart';
import 'models.dart';

/// Recursive Conditional Logic Resolution (RCLR).
/// Treats the survey as a DAG rooted at [schema.entryId] and computes the set
/// of nodes reachable when an edge fires iff its condition is satisfied by
/// current answers.
RclrResult resolveVisibility(SurveySchema schema, SessionAnswers answers) {
  final conflicts = <RclrConflictCode>[];

  if (!schema.questions.containsKey(schema.entryId)) {
    conflicts.add(RclrConflictCode.missingEntry);
    return RclrResult(
      visibleIds: <String>{},
      consistent: false,
      conflictCodes: conflicts,
    );
  }

  for (final e in schema.edges) {
    final c = e.condition;
    if (c != null && !schema.questions.containsKey(c.questionId)) {
      conflicts.add(RclrConflictCode.conditionUnknownQuestion);
    }
  }

  final visible = <String>{};
  final edgesByFrom = <String, List<SurveyEdge>>{};
  for (final e in schema.edges) {
    (edgesByFrom[e.from] ??= <SurveyEdge>[]).add(e);
  }

  final onPath = <String>{};
  final closed = <String>{};
  var cycle = false;

  void visit(String nodeId) {
    if (closed.contains(nodeId)) return;
    if (onPath.contains(nodeId)) {
      cycle = true;
      throw StateError('CYCLE_DETECTED');
    }
    onPath.add(nodeId);
    visible.add(nodeId);
    for (final e in edgesByFrom[nodeId] ?? const <SurveyEdge>[]) {
      if (!edgeSatisfied(e.condition, answers)) continue;
      visit(e.to);
    }
    onPath.remove(nodeId);
    closed.add(nodeId);
  }

  try {
    visit(schema.entryId);
  } catch (_) {
    if (cycle && !conflicts.contains(RclrConflictCode.cycleDetected)) {
      conflicts.add(RclrConflictCode.cycleDetected);
    }
    return RclrResult(
      visibleIds: visible,
      consistent: false,
      conflictCodes: _dedup(conflicts),
    );
  }

  // Standalone questions: anything never referenced as a target is an
  // independent/root question and should always be visible.
  final allTargets = schema.edges.map((e) => e.to).toSet();
  for (final qid in schema.questions.keys) {
    if (qid == schema.entryId) continue;
    if (!allTargets.contains(qid)) {
      visible.add(qid);
    }
  }

  if (!_orphanHeuristic(schema, answers, visible)) {
    conflicts.add(RclrConflictCode.orphanVisible);
  }

  for (final qid in answers.keys) {
    if (schema.questions.containsKey(qid) && !visible.contains(qid)) {
      conflicts.add(RclrConflictCode.staleAnswer);
    }
  }

  return RclrResult(
    visibleIds: visible,
    consistent: conflicts.isEmpty,
    conflictCodes: _dedup(conflicts),
  );
}

bool _orphanHeuristic(
  SurveySchema schema,
  SessionAnswers answers,
  Set<String> visible,
) {
  for (final id in visible) {
    if (id == schema.entryId) continue;
    final incoming = schema.edges.where((e) => e.to == id).toList();
    if (incoming.isEmpty) continue;
    final anyOk = incoming.any((e) {
      if (!visible.contains(e.from)) return false;
      return edgeSatisfied(e.condition, answers);
    });
    if (!anyOk) return false;
  }
  return true;
}

List<RclrConflictCode> _dedup(List<RclrConflictCode> xs) {
  final seen = <RclrConflictCode>{};
  final out = <RclrConflictCode>[];
  for (final c in xs) {
    if (seen.add(c)) out.add(c);
  }
  return out;
}

bool canShowSubmit(
  SurveySchema schema,
  SessionAnswers answers,
  RclrResult rclr,
) {
  if (!rclr.consistent) return false;
  for (final id in rclr.visibleIds) {
    final q = schema.questions[id];
    if (q == null || !q.required) continue;
    final v = answers[id];
    if (v == null) return false;
    if (v is String && v.isEmpty) return false;
  }
  return true;
}
