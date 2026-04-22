import 'package:ares_mobile/core/gbcr.dart';
import 'package:ares_mobile/core/models.dart';
import 'package:flutter_test/flutter_test.dart';

SurveySchema _schemaV1() => SurveySchema(
      id: 'demo',
      version: 1,
      entryId: 'q1',
      questions: {
        'q1': SurveyQuestion(
          id: 'q1',
          kind: QuestionKind.singleChoice,
          title: 'Pick',
          options: const ['x', 'y'],
        ),
        'q2': SurveyQuestion(
            id: 'q2', kind: QuestionKind.text, title: 'Follow x'),
        'q3': SurveyQuestion(
            id: 'q3', kind: QuestionKind.text, title: 'Follow y'),
      },
      edges: [
        SurveyEdge(
          id: 'e1',
          from: 'q1',
          to: 'q2',
          condition: const EqualsCondition(questionId: 'q1', value: 'x'),
        ),
        SurveyEdge(
          id: 'e2',
          from: 'q1',
          to: 'q3',
          condition: const EqualsCondition(questionId: 'q1', value: 'y'),
        ),
      ],
    );

SessionState _sessionMid() => SessionState(
      schemaId: 'demo',
      schemaVersion: 1,
      answers: <String, Object>{'q1': 'x', 'q2': 'hello'},
      trail: const ['q1', 'q2'],
      currentQuestionId: 'q2',
    );

void main() {
  group('GBCR schema versioning', () {
    test('unchanged when version matches', () {
      final s = _schemaV1();
      final sess = _sessionMid();
      final r = migrateSessionForNewSchema(s, s, sess);
      expect(r.outcome, GbcrOutcome.unchanged);
    });

    test(
        'atomic recovery drops answers for deleted nodes but keeps consistent graph',
        () {
      final prev = _schemaV1();
      final next = SurveySchema(
        id: prev.id,
        version: 2,
        entryId: prev.entryId,
        questions: {'q1': prev.questions['q1']!, 'q3': prev.questions['q3']!},
        edges: [
          SurveyEdge(
            id: 'e2',
            from: 'q1',
            to: 'q3',
            condition: const EqualsCondition(questionId: 'q1', value: 'y'),
          ),
          SurveyEdge(
            id: 'e1b',
            from: 'q1',
            to: 'q3',
            condition: const EqualsCondition(questionId: 'q1', value: 'x'),
          ),
        ],
      );
      final sess = _sessionMid();
      final r = migrateSessionForNewSchema(prev, next, sess);
      expect(r.outcome, GbcrOutcome.recoveredAtomic);
      expect(r.droppedAnswersFor.contains('q2'), isTrue);
      expect(r.session.answers['q1'], 'x');
      expect(r.session.answers.containsKey('q2'), isFalse);
    });

    test('rollback to stable node when new logic makes answers inconsistent',
        () {
      final prev = _schemaV1();
      final next = SurveySchema(
        id: prev.id,
        version: 3,
        entryId: prev.entryId,
        questions: prev.questions,
        edges: [
          SurveyEdge(
            id: 'e1',
            from: 'q1',
            to: 'q2',
            condition: const EqualsCondition(questionId: 'q1', value: 'y'),
          ),
          SurveyEdge(
            id: 'e2',
            from: 'q1',
            to: 'q3',
            condition: const EqualsCondition(questionId: 'q1', value: 'x'),
          ),
        ],
      );
      final sess = _sessionMid();
      final r = migrateSessionForNewSchema(prev, next, sess);
      expect(r.outcome, GbcrOutcome.rollbackStable);
      expect(r.conflictCodes.isNotEmpty, isTrue);
      expect(r.session.trail.contains(r.stableNodeId), isTrue);
    });
  });

  group('GBCR edge cases', () {
    test('handles empty trail by falling back to entry', () {
      final prev = _schemaV1();
      final next = SurveySchema(
        id: prev.id,
        version: 4,
        entryId: prev.entryId,
        questions: {'q1': prev.questions['q1']!},
        edges: const [],
      );
      final sess = SessionState(
        schemaId: 'demo',
        schemaVersion: 1,
        answers: <String, Object>{'q1': 'x', 'q2': 'z'},
        trail: const [],
        currentQuestionId: 'q1',
      );
      final r = migrateSessionForNewSchema(prev, next, sess);
      expect(r.session.currentQuestionId, 'q1');
    });
  });
}
