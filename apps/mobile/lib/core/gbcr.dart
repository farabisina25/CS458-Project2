import 'models.dart';
import 'rclr.dart';

/// Graph-Based Conflict Resolution with schema versioning.
/// Compares the client session's schemaVersion with the published [nextSchema]
/// and returns either an atomic recovery or a rollback to the last stable node.
GbcrMigrationResult migrateSessionForNewSchema(
  SurveySchema prevSchema,
  SurveySchema nextSchema,
  SessionState session,
) {
  if (prevSchema.id == nextSchema.id &&
      session.schemaVersion == nextSchema.version) {
    return GbcrMigrationResult(
      outcome: GbcrOutcome.unchanged,
      session: session,
    );
  }

  final notes = <String>[];
  final dropped = <String>[];
  final nextAnswers = <String, Object>{...session.answers};

  for (final qid in nextAnswers.keys.toList()) {
    if (!nextSchema.questions.containsKey(qid)) {
      nextAnswers.remove(qid);
      dropped.add(qid);
    }
  }

  final trail =
      session.trail.where((id) => nextSchema.questions.containsKey(id)).toList();
  String? current = session.currentQuestionId;
  if (current != null && !nextSchema.questions.containsKey(current)) {
    current = null;
  }

  final provisional = SessionState(
    schemaId: nextSchema.id,
    schemaVersion: nextSchema.version,
    answers: nextAnswers,
    trail: trail,
    currentQuestionId: current,
  );

  final rclr = resolveVisibility(nextSchema, nextAnswers);
  if (rclr.consistent) {
    if (dropped.isNotEmpty) {
      notes.add(
        'Atomic recovery: removed answers for deleted nodes: ${dropped.join(", ")}',
      );
    } else {
      notes.add('Atomic recovery: structure compatible; answers preserved.');
    }
    return GbcrMigrationResult(
      outcome: GbcrOutcome.recoveredAtomic,
      session: provisional,
      droppedAnswersFor: dropped,
      notes: notes,
    );
  }

  final stable = _findLastStableNode(nextSchema, nextAnswers, trail);
  final rolledTrail = stable != null
      ? trail.sublist(0, trail.indexOf(stable) + 1)
      : <String>[nextSchema.entryId];
  final trimmedAnswers = <String, Object>{};
  for (final id in rolledTrail) {
    final v = nextAnswers[id];
    if (v != null) trimmedAnswers[id] = v;
  }

  notes.add(
    'Logic inconsistency after schema v${nextSchema.version}; rollback to stable node ${stable ?? nextSchema.entryId}.',
  );

  return GbcrMigrationResult(
    outcome: GbcrOutcome.rollbackStable,
    session: SessionState(
      schemaId: nextSchema.id,
      schemaVersion: nextSchema.version,
      answers: trimmedAnswers,
      trail: rolledTrail,
      currentQuestionId: stable ?? nextSchema.entryId,
    ),
    stableNodeId: stable ?? nextSchema.entryId,
    conflictCodes: rclr.conflictCodes,
    notes: notes,
  );
}

String? _findLastStableNode(
  SurveySchema schema,
  SessionAnswers answers,
  List<String> trail,
) {
  for (var i = trail.length - 1; i >= 0; i--) {
    final id = trail[i];
    final prefixTrail = trail.sublist(0, i + 1);
    final prefixAnswers = <String, Object>{};
    for (final tid in prefixTrail) {
      final v = answers[tid];
      if (v != null) prefixAnswers[tid] = v;
    }
    final r = resolveVisibility(schema, prefixAnswers);
    if (r.consistent && r.visibleIds.contains(id)) return id;
  }
  return null;
}
