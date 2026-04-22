import 'package:ares_mobile/core/models.dart';
import 'package:ares_mobile/core/rclr.dart';
import 'package:flutter_test/flutter_test.dart';

SurveySchema _mk(List<SurveyEdge> edges,
    [Map<String, SurveyQuestion>? questions]) {
  return SurveySchema(
    id: 's',
    version: 1,
    entryId: 'q1',
    questions: questions ??
        {
          'q1': SurveyQuestion(
            id: 'q1',
            kind: QuestionKind.singleChoice,
            title: 'Start',
            options: const ['a', 'b'],
            required: true,
          ),
          'q2': SurveyQuestion(
            id: 'q2',
            kind: QuestionKind.text,
            title: 'Branch A',
            required: true,
          ),
          'q3': SurveyQuestion(
            id: 'q3',
            kind: QuestionKind.text,
            title: 'Branch B',
            required: true,
          ),
        },
    edges: edges,
  );
}

void main() {
  group('RCLR visibility', () {
    test('shows only entry when no answers satisfy branches', () {
      final schema = _mk([
        SurveyEdge(
          id: 'e1',
          from: 'q1',
          to: 'q2',
          condition: const EqualsCondition(questionId: 'q1', value: 'a'),
        ),
        SurveyEdge(
          id: 'e2',
          from: 'q1',
          to: 'q3',
          condition: const EqualsCondition(questionId: 'q1', value: 'b'),
        ),
      ]);
      final r = resolveVisibility(schema, <String, Object>{});
      expect(r.visibleIds.toList()..sort(), ['q1']);
      expect(r.consistent, isTrue);
    });

    test('recursively expands branch A', () {
      final schema = _mk([
        SurveyEdge(
          id: 'e1',
          from: 'q1',
          to: 'q2',
          condition: const EqualsCondition(questionId: 'q1', value: 'a'),
        ),
        SurveyEdge(
          id: 'e2',
          from: 'q1',
          to: 'q3',
          condition: const EqualsCondition(questionId: 'q1', value: 'b'),
        ),
      ]);
      final r = resolveVisibility(schema, <String, Object>{'q1': 'a'});
      expect(r.visibleIds.contains('q1') && r.visibleIds.contains('q2'), isTrue);
      expect(r.visibleIds.contains('q3'), isFalse);
      expect(r.consistent, isTrue);
    });

    test('flags cycle in graph', () {
      final schema = _mk([
        SurveyEdge(id: 'e1', from: 'q1', to: 'q2'),
        SurveyEdge(id: 'e2', from: 'q2', to: 'q3'),
        SurveyEdge(id: 'e3', from: 'q3', to: 'q1'),
      ]);
      final r = resolveVisibility(schema, <String, Object>{});
      expect(r.consistent, isFalse);
      expect(r.conflictCodes.contains(RclrConflictCode.cycleDetected), isTrue);
    });

    test('flags unknown question in condition', () {
      final schema = _mk(
        [
          SurveyEdge(
            id: 'e1',
            from: 'q1',
            to: 'q2',
            condition: const EqualsCondition(
                questionId: 'missing', value: 'x'),
          ),
        ],
        {
          'q1': SurveyQuestion(
            id: 'q1',
            kind: QuestionKind.singleChoice,
            title: 'S',
            options: const ['a'],
          ),
          'q2': SurveyQuestion(id: 'q2', kind: QuestionKind.text, title: 'T'),
        },
      );
      final r = resolveVisibility(schema, <String, Object>{'q1': 'a'});
      expect(
        r.conflictCodes.contains(RclrConflictCode.conditionUnknownQuestion),
        isTrue,
      );
      expect(r.consistent, isFalse);
    });

    test('submit hidden until required visible questions answered', () {
      final schema = _mk([
        SurveyEdge(
          id: 'e1',
          from: 'q1',
          to: 'q2',
          condition: const EqualsCondition(questionId: 'q1', value: 'a'),
        ),
        SurveyEdge(
          id: 'e2',
          from: 'q1',
          to: 'q3',
          condition: const EqualsCondition(questionId: 'q1', value: 'b'),
        ),
      ]);
      final r1 = resolveVisibility(schema, <String, Object>{'q1': 'a'});
      expect(
        canShowSubmit(schema, <String, Object>{'q1': 'a'}, r1),
        isFalse,
      );
      expect(
        canShowSubmit(schema, <String, Object>{'q1': 'a', 'q2': 'ok'}, r1),
        isTrue,
      );
    });
  });
}
