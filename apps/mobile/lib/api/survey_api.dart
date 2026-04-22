import 'dart:convert';
import 'dart:io' show Platform;

import 'package:http/http.dart' as http;

import '../core/models.dart';

const _defaultSurveyId = 'live-demo';

class SurveyApi {
  SurveyApi({String? baseUrl}) : _baseUrl = baseUrl ?? _defaultBase();

  final String _baseUrl;

  static String _defaultBase() {
    const fromEnv = String.fromEnvironment('API_URL');
    if (fromEnv.isNotEmpty) return _trim(fromEnv);
    // Android emulator routes host loopback via 10.0.2.2.
    if (Platform.isAndroid) return 'http://10.0.2.2:4000';
    return 'http://127.0.0.1:4000';
  }

  static String _trim(String s) => s.endsWith('/') ? s.substring(0, s.length - 1) : s;

  Future<SurveySchema> fetchLatest({String surveyId = _defaultSurveyId}) async {
    final uri = Uri.parse('$_baseUrl/surveys/$surveyId');
    final r = await http.get(uri);
    if (r.statusCode != 200) {
      throw Exception('survey ${r.statusCode}');
    }
    final body = jsonDecode(r.body) as Map<String, dynamic>;
    return SurveySchema.fromJson(body);
  }
}
