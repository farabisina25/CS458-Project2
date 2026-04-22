import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';

import 'ui/login_screen.dart';
import 'ui/survey_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // Keep semantics on so Appium (UiAutomator2) can locate widgets by their
  // Semantics(identifier:) on Android content-desc.
  SemanticsBinding.instance.ensureSemantics();
  runApp(const AresMobileApp());
}

class AresMobileApp extends StatelessWidget {
  const AresMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ARES-X Survey',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF6366F1)),
      ),
      home: const _Root(),
    );
  }
}

class _Root extends StatefulWidget {
  const _Root();

  @override
  State<_Root> createState() => _RootState();
}

class _RootState extends State<_Root> {
  bool _loggedIn = false;

  @override
  Widget build(BuildContext context) {
    if (!_loggedIn) {
      return LoginScreen(onLogin: () => setState(() => _loggedIn = true));
    }
    return const SurveyScreen();
  }
}
