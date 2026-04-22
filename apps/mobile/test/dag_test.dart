import 'package:ares_mobile/core/dag.dart';
import 'package:ares_mobile/core/models.dart';
import 'package:flutter_test/flutter_test.dart';

SurveySchema _baseSchema(List<SurveyEdge> edges) => SurveySchema(
      id: 's1',
      version: 1,
      entryId: 'q1',
      questions: {
        'q1': SurveyQuestion(
          id: 'q1',
          kind: QuestionKind.singleChoice,
          title: 'A',
          options: const ['yes', 'no'],
        ),
        'q2': SurveyQuestion(id: 'q2', kind: QuestionKind.text, title: 'B'),
        'q3': SurveyQuestion(id: 'q3', kind: QuestionKind.text, title: 'C'),
      },
      edges: edges,
    );

void main() {
  group('dag helpers', () {
    test('detects cycles', () {
      final edges = [
        SurveyEdge(id: 'e1', from: 'q1', to: 'q2'),
        SurveyEdge(id: 'e2', from: 'q2', to: 'q3'),
        SurveyEdge(id: 'e3', from: 'q3', to: 'q1'),
      ];
      expect(
        () => assertAcyclic(_baseSchema(edges)),
        throwsA(isA<StateError>()),
      );
    });

    test('accepts acyclic graph', () {
      final edges = [
        SurveyEdge(
          id: 'e1',
          from: 'q1',
          to: 'q2',
          condition:
              const EqualsCondition(questionId: 'q1', value: 'yes'),
        ),
        SurveyEdge(
          id: 'e2',
          from: 'q1',
          to: 'q3',
          condition: const EqualsCondition(questionId: 'q1', value: 'no'),
        ),
      ];
      expect(() => assertAcyclic(_baseSchema(edges)), returnsNormally);
    });

    test('edgeSatisfied respects equals and oneOf', () {
      final answers = <String, Object>{'q1': 'yes'};
      expect(
        edgeSatisfied(
          const EqualsCondition(questionId: 'q1', value: 'yes'),
          answers,
        ),
        isTrue,
      );
      expect(
        edgeSatisfied(
          const OneOfCondition(questionId: 'q1', values: ['no', 'maybe']),
          answers,
        ),
        isFalse,
      );
    });

    test('builds adjacency', () {
      final edges = [
        SurveyEdge(id: 'a', from: 'q1', to: 'q2'),
        SurveyEdge(id: 'b', from: 'q1', to: 'q3'),
      ];
      final m = adjacencyOutgoing(edges);
      final out = [...?m['q1']]..sort();
      expect(out, ['q2', 'q3']);
    });
  });
}
