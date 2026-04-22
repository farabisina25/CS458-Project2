import 'dart:async';

import 'package:flutter/material.dart';

import '../api/survey_api.dart';
import '../core/gbcr.dart';
import '../core/models.dart';
import '../core/rclr.dart';

class SurveyScreen extends StatefulWidget {
  const SurveyScreen({super.key, this.api});

  final SurveyApi? api;

  @override
  State<SurveyScreen> createState() => _SurveyScreenState();
}

class _SurveyScreenState extends State<SurveyScreen> {
  late final SurveyApi _api = widget.api ?? SurveyApi();
  SurveySchema? _schema;
  SessionState? _session;
  GbcrMigrationResult? _gbcr;
  String? _rclrNote;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    _bootstrap();
    _poll = Timer.periodic(const Duration(milliseconds: 2500), (_) => _tick());
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    try {
      final latest = await _api.fetchLatest();
      if (!mounted) return;
      setState(() {
        _schema = latest;
        _session = SessionState(
          schemaId: latest.id,
          schemaVersion: latest.version,
          answers: <String, Object>{},
          trail: const <String>[],
          currentQuestionId: latest.entryId,
        );
        _gbcr = null;
        _rclrNote = null;
      });
    } catch (_) {
      /* offline */
    }
  }

  Future<void> _tick() async {
    try {
      final latest = await _api.fetchLatest();
      if (!mounted) return;
      final cur = _schema;
      final sess = _session;
      if (cur == null || sess == null) {
        if (cur == null) setState(() => _schema = latest);
        return;
      }
      if (latest.version == cur.version) return;
      final migrated = migrateSessionForNewSchema(cur, latest, sess);
      final rclr = resolveVisibility(latest, migrated.session.answers);
      setState(() {
        _gbcr = migrated;
        _schema = latest;
        _session = migrated.session;
        _rclrNote = rclr.consistent
            ? null
            : rclr.conflictCodes.map(rclrCodeToString).join(', ');
      });
    } catch (_) {
      /* offline */
    }
  }

  void _setAnswer(String qid, Object value) {
    final sess = _session;
    final schema = _schema;
    if (sess == null || schema == null) return;
    final answers = <String, Object>{...sess.answers, qid: value};
    final trail =
        sess.trail.contains(qid) ? sess.trail : [...sess.trail, qid];
    setState(() {
      _session = sess.copyWith(
        answers: answers,
        trail: trail,
        currentQuestionId: qid,
      );
    });
  }

  void _toggleMulti(String qid, String option) {
    final sess = _session;
    if (sess == null) return;
    final current =
        (sess.answers[qid] as List?)?.cast<String>() ?? const <String>[];
    final next = current.contains(option)
        ? current.where((v) => v != option).toList()
        : [...current, option];
    _setAnswer(qid, next);
  }

  @override
  Widget build(BuildContext context) {
    final schema = _schema;
    final session = _session;

    if (schema == null || session == null) {
      return Scaffold(
        body: Semantics(
          identifier: 'survey-loading',
          label: 'survey-loading',
          child: const Center(child: Text('Loading survey…')),
        ),
      );
    }

    final rclr = resolveVisibility(schema, session.answers);
    final submitVisible = canShowSubmit(schema, session.answers, rclr);
    final visibleQuestions = schema.questions.values
        .where((q) => rclr.visibleIds.contains(q.id))
        .toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Semantics(
        identifier: 'survey-screen',
        label: 'survey-screen',
        container: true,
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 48),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Live survey',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 4),
                Semantics(
                  identifier: 'schema-version-label',
                  label: 'schema-version-label',
                  child: Text(
                    '${schema.id} v${schema.version}',
                    style: const TextStyle(color: Color(0xFF64748B)),
                  ),
                ),
                const SizedBox(height: 12),
                if (_gbcr != null && _gbcr!.outcome != GbcrOutcome.unchanged)
                  _buildGbcrBanner(_gbcr!),
                if (_rclrNote != null) _buildRclrStrip(_rclrNote!),
                const SizedBox(height: 8),
                for (final q in visibleQuestions) ...[
                  _QuestionCard(
                    question: q,
                    answer: session.answers[q.id],
                    onSingle: (v) => _setAnswer(q.id, v),
                    onMulti: (v) => _toggleMulti(q.id, v),
                    onText: (v) => _setAnswer(q.id, v),
                    onRating: (v) => _setAnswer(q.id, v),
                  ),
                  const SizedBox(height: 12),
                ],
                if (submitVisible)
                  Semantics(
                    identifier: 'survey-send',
                    label: 'survey-send',
                    button: true,
                    child: ElevatedButton(
                      onPressed: () => _onSend(session),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6366F1),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: const Text('Send'),
                    ),
                  )
                else
                  const Text(
                    'Complete required visible questions to send.',
                    style: TextStyle(color: Color(0xFF64748B)),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildGbcrBanner(GbcrMigrationResult g) {
    String outcome;
    switch (g.outcome) {
      case GbcrOutcome.unchanged:
        outcome = 'unchanged';
        break;
      case GbcrOutcome.recoveredAtomic:
        outcome = 'recovered_atomic';
        break;
      case GbcrOutcome.rollbackStable:
        outcome = 'rollback_stable';
        break;
    }

    return Semantics(
      identifier: 'gbcr-banner',
      label: 'gbcr-banner',
      container: true,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: const Color(0xFFE0F2FE),
          border: Border.all(color: const Color(0xFFBAE6FD)),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'GBCR · $outcome',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 4),
            for (final n in g.notes)
              Text(n,
                  style: const TextStyle(
                      fontSize: 13, color: Color(0xFF0C4A6E))),
            if (g.conflictCodes.isNotEmpty)
              Semantics(
                identifier: 'rclr-conflict-codes',
                label: 'rclr-conflict-codes',
                child: Text(
                  g.conflictCodes.map(rclrCodeToString).join(', '),
                  style:
                      const TextStyle(fontSize: 13, color: Color(0xFF0C4A6E)),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildRclrStrip(String note) {
    return Semantics(
      identifier: 'rclr-inline-conflict',
      label: 'rclr-inline-conflict',
      container: true,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: const Color(0xFFFEF2F2),
          border: Border.all(color: const Color(0xFFFECACA)),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text('RCLR: $note',
            style: const TextStyle(color: Color(0xFF991B1B))),
      ),
    );
  }

  void _onSend(SessionState session) {
    final answers = session.answers.length;
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Survey Submitted!'),
        content: Text('Thank you! $answers answers recorded.'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              _bootstrap();
            },
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}

class _QuestionCard extends StatefulWidget {
  const _QuestionCard({
    required this.question,
    required this.answer,
    required this.onSingle,
    required this.onMulti,
    required this.onText,
    required this.onRating,
  });

  final SurveyQuestion question;
  final Object? answer;
  final ValueChanged<String> onSingle;
  final ValueChanged<String> onMulti;
  final ValueChanged<String> onText;
  final ValueChanged<int> onRating;

  @override
  State<_QuestionCard> createState() => _QuestionCardState();
}

class _QuestionCardState extends State<_QuestionCard> {
  late final TextEditingController _textCtrl =
      TextEditingController(text: widget.answer is String ? widget.answer as String : '');

  @override
  void dispose() {
    _textCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final q = widget.question;
    return Semantics(
      identifier: 'question-${q.id}',
      label: 'question-${q.id}',
      container: true,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: const Color(0xFFE2E8F0)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(q.title,
                style: const TextStyle(
                    fontSize: 16, fontWeight: FontWeight.w500)),
            const SizedBox(height: 8),
            if (q.kind == QuestionKind.singleChoice && q.options != null)
              for (final opt in q.options!)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Semantics(
                    identifier: 'choice-${q.id}-$opt',
                    label: 'choice-${q.id}-$opt',
                    button: true,
                    child: ElevatedButton(
                      onPressed: () => widget.onSingle(opt),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: widget.answer == opt
                            ? const Color(0xFF6366F1)
                            : const Color(0xFFEEF2FF),
                        foregroundColor: widget.answer == opt
                            ? Colors.white
                            : const Color(0xFF1E293B),
                        elevation: 0,
                        alignment: Alignment.centerLeft,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 10),
                      ),
                      child: Text(opt),
                    ),
                  ),
                ),
            if (q.kind == QuestionKind.multiChoice && q.options != null)
              for (final opt in q.options!)
                _MultiRow(
                  qid: q.id,
                  option: opt,
                  selected: (widget.answer as List?)
                          ?.cast<String>()
                          .contains(opt) ??
                      false,
                  onTap: () => widget.onMulti(opt),
                ),
            if (q.kind == QuestionKind.text)
              Semantics(
                identifier: 'text-${q.id}',
                label: 'text-${q.id}',
                textField: true,
                child: TextField(
                  controller: _textCtrl,
                  decoration: InputDecoration(
                    hintText: 'Type answer',
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 8),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide:
                          const BorderSide(color: Color(0xFFCBD5E1)),
                    ),
                  ),
                  onEditingComplete: () => widget.onText(_textCtrl.text),
                  onSubmitted: widget.onText,
                ),
              ),
            if (q.kind == QuestionKind.rating)
              Wrap(
                spacing: 8,
                children: [
                  for (var n = 1; n <= (q.maxRating ?? 5); n++)
                    Semantics(
                      identifier: 'rate-${q.id}-$n',
                      label: 'rate-${q.id}-$n',
                      button: true,
                      child: ElevatedButton(
                        onPressed: () => widget.onRating(n),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: widget.answer == n
                              ? const Color(0xFF6366F1)
                              : const Color(0xFFEEF2FF),
                          foregroundColor: widget.answer == n
                              ? Colors.white
                              : const Color(0xFF1E293B),
                          elevation: 0,
                          minimumSize: const Size(44, 40),
                        ),
                        child: Text('$n'),
                      ),
                    ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

class _MultiRow extends StatelessWidget {
  const _MultiRow({
    required this.qid,
    required this.option,
    required this.selected,
    required this.onTap,
  });

  final String qid;
  final String option;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      identifier: 'multi-$qid-$option',
      label: 'multi-$qid-$option',
      button: true,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
          margin: const EdgeInsets.symmetric(vertical: 2),
          decoration: BoxDecoration(
            color: selected ? const Color(0xFFEEF2FF) : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  color: selected
                      ? const Color(0xFF6366F1)
                      : Colors.transparent,
                  border: Border.all(
                    color: selected
                        ? const Color(0xFF6366F1)
                        : const Color(0xFF94A3B8),
                    width: 2,
                  ),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: selected
                    ? const Icon(Icons.check, size: 14, color: Colors.white)
                    : null,
              ),
              const SizedBox(width: 10),
              Text(option, style: const TextStyle(fontSize: 15)),
            ],
          ),
        ),
      ),
    );
  }
}
