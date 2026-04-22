enum QuestionKind { singleChoice, multiChoice, rating, text }

QuestionKind _kindFromString(String v) {
  switch (v) {
    case 'single_choice':
      return QuestionKind.singleChoice;
    case 'multi_choice':
      return QuestionKind.multiChoice;
    case 'rating':
      return QuestionKind.rating;
    case 'text':
      return QuestionKind.text;
  }
  throw ArgumentError('Unknown question kind: $v');
}

class SurveyQuestion {
  final String id;
  final QuestionKind kind;
  final String title;
  final List<String>? options;
  final int? maxRating;
  final bool required;

  SurveyQuestion({
    required this.id,
    required this.kind,
    required this.title,
    this.options,
    this.maxRating,
    this.required = false,
  });

  factory SurveyQuestion.fromJson(Map<String, dynamic> j) {
    return SurveyQuestion(
      id: j['id'] as String,
      kind: _kindFromString(j['kind'] as String),
      title: j['title'] as String,
      options: (j['options'] as List?)?.map((e) => e as String).toList(),
      maxRating: j['maxRating'] as int?,
      required: (j['required'] as bool?) ?? false,
    );
  }
}

abstract class EdgeCondition {
  const EdgeCondition();
  String get questionId;

  static EdgeCondition? fromJson(Map<String, dynamic>? j) {
    if (j == null) return null;
    final type = j['type'] as String;
    if (type == 'equals') {
      return EqualsCondition(
        questionId: j['questionId'] as String,
        value: j['value'] as String,
      );
    }
    if (type == 'oneOf') {
      return OneOfCondition(
        questionId: j['questionId'] as String,
        values: (j['values'] as List).map((e) => e as String).toList(),
      );
    }
    throw ArgumentError('Unknown condition type: $type');
  }
}

class EqualsCondition extends EdgeCondition {
  @override
  final String questionId;
  final String value;
  const EqualsCondition({required this.questionId, required this.value});
}

class OneOfCondition extends EdgeCondition {
  @override
  final String questionId;
  final List<String> values;
  const OneOfCondition({required this.questionId, required this.values});
}

class SurveyEdge {
  final String id;
  final String from;
  final String to;
  final EdgeCondition? condition;

  SurveyEdge({
    required this.id,
    required this.from,
    required this.to,
    this.condition,
  });

  factory SurveyEdge.fromJson(Map<String, dynamic> j) => SurveyEdge(
        id: j['id'] as String,
        from: j['from'] as String,
        to: j['to'] as String,
        condition: EdgeCondition.fromJson(j['condition'] as Map<String, dynamic>?),
      );
}

class SurveySchema {
  final String id;
  final int version;
  final String entryId;
  final Map<String, SurveyQuestion> questions;
  final List<SurveyEdge> edges;

  SurveySchema({
    required this.id,
    required this.version,
    required this.entryId,
    required this.questions,
    required this.edges,
  });

  factory SurveySchema.fromJson(Map<String, dynamic> j) {
    final rawQ = j['questions'] as Map<String, dynamic>;
    final qs = <String, SurveyQuestion>{};
    rawQ.forEach((k, v) {
      qs[k] = SurveyQuestion.fromJson(v as Map<String, dynamic>);
    });
    final es = (j['edges'] as List)
        .map((e) => SurveyEdge.fromJson(e as Map<String, dynamic>))
        .toList();
    return SurveySchema(
      id: j['id'] as String,
      version: j['version'] as int,
      entryId: j['entryId'] as String,
      questions: qs,
      edges: es,
    );
  }
}

typedef AnswerValue = Object;
typedef SessionAnswers = Map<String, AnswerValue>;

class SessionState {
  final String schemaId;
  final int schemaVersion;
  final SessionAnswers answers;
  final List<String> trail;
  final String? currentQuestionId;

  SessionState({
    required this.schemaId,
    required this.schemaVersion,
    required this.answers,
    required this.trail,
    this.currentQuestionId,
  });

  SessionState copyWith({
    String? schemaId,
    int? schemaVersion,
    SessionAnswers? answers,
    List<String>? trail,
    String? currentQuestionId,
    bool clearCurrent = false,
  }) {
    return SessionState(
      schemaId: schemaId ?? this.schemaId,
      schemaVersion: schemaVersion ?? this.schemaVersion,
      answers: answers ?? this.answers,
      trail: trail ?? this.trail,
      currentQuestionId:
          clearCurrent ? null : (currentQuestionId ?? this.currentQuestionId),
    );
  }
}

enum RclrConflictCode {
  orphanVisible,
  missingEntry,
  cycleDetected,
  conditionUnknownQuestion,
  staleAnswer,
}

String rclrCodeToString(RclrConflictCode c) {
  switch (c) {
    case RclrConflictCode.orphanVisible:
      return 'ORPHAN_VISIBLE';
    case RclrConflictCode.missingEntry:
      return 'MISSING_ENTRY';
    case RclrConflictCode.cycleDetected:
      return 'CYCLE_DETECTED';
    case RclrConflictCode.conditionUnknownQuestion:
      return 'CONDITION_UNKNOWN_QUESTION';
    case RclrConflictCode.staleAnswer:
      return 'STALE_ANSWER';
  }
}

class RclrResult {
  final Set<String> visibleIds;
  final bool consistent;
  final List<RclrConflictCode> conflictCodes;

  RclrResult({
    required this.visibleIds,
    required this.consistent,
    required this.conflictCodes,
  });
}

enum GbcrOutcome { unchanged, recoveredAtomic, rollbackStable }

class GbcrMigrationResult {
  final GbcrOutcome outcome;
  final SessionState session;
  final List<String> droppedAnswersFor;
  final List<String> notes;
  final String? stableNodeId;
  final List<RclrConflictCode> conflictCodes;

  GbcrMigrationResult({
    required this.outcome,
    required this.session,
    this.droppedAnswersFor = const [],
    this.notes = const [],
    this.stableNodeId,
    this.conflictCodes = const [],
  });
}
