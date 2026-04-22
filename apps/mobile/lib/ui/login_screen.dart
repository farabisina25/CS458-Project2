import 'package:flutter/material.dart';

/// Login screen adapted from Project 1 ARES login page.
/// All Semantics(identifier:) values match Appium testIDs used in e2e/mobile-appium.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.onLogin});

  final VoidCallback onLogin;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

enum _LoginType { email, phone }

class _LoginScreenState extends State<LoginScreen> {
  _LoginType _type = _LoginType.email;
  final _identifier = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  String? _error;
  String? _success;

  @override
  void dispose() {
    _identifier.dispose();
    _password.dispose();
    super.dispose();
  }

  void _submit() {
    if (_identifier.text.isEmpty || _password.text.isEmpty) {
      setState(() {
        _error = 'Please fill in all fields.';
        _success = null;
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
      _success = null;
    });
    Future.delayed(const Duration(milliseconds: 800), () {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _success = 'Login successful!';
      });
      Future.delayed(const Duration(milliseconds: 600), () {
        if (!mounted) return;
        widget.onLogin();
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    const bg = Color(0xFF0F172A);
    const card = Color(0xFF1E293B);
    const indigo = Color(0xFF6366F1);
    const border = Color(0xFF334155);
    const muted = Color(0xFF64748B);
    const textLight = Color(0xFFF1F5F9);

    InputDecoration field(String hint) => InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: muted),
          filled: true,
          fillColor: card,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          border: OutlineInputBorder(
            borderSide: const BorderSide(color: border),
            borderRadius: BorderRadius.circular(10),
          ),
          enabledBorder: OutlineInputBorder(
            borderSide: const BorderSide(color: border),
            borderRadius: BorderRadius.circular(10),
          ),
          focusedBorder: OutlineInputBorder(
            borderSide: const BorderSide(color: indigo),
            borderRadius: BorderRadius.circular(10),
          ),
        );

    Widget tab(String label, _LoginType t, String id) {
      final active = _type == t;
      return Expanded(
        child: Semantics(
          identifier: id,
          label: id,
          button: true,
          child: InkWell(
            onTap: () {
              setState(() {
                _type = t;
                _identifier.clear();
              });
            },
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 10),
              color: active ? indigo : card,
              alignment: Alignment.center,
              child: Text(
                label,
                style: TextStyle(
                  color: active ? Colors.white : const Color(0xFF94A3B8),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: bg,
      body: Semantics(
        identifier: 'login-screen',
        label: 'login-screen',
        container: true,
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: indigo,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          alignment: Alignment.center,
                          child: const Text(
                            'A',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        const Text(
                          'ARES-X',
                          style: TextStyle(
                            color: Color(0xFFE2E8F0),
                            fontSize: 26,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Welcome Back',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: textLight,
                        fontSize: 22,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Sign in to your secure account',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: muted, fontSize: 14),
                    ),
                    const SizedBox(height: 20),
                    if (_error != null)
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF7F1D1D),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: textLight),
                        ),
                      ),
                    if (_success != null)
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF14532D),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          _success!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: textLight),
                        ),
                      ),
                    const SizedBox(height: 12),
                    Semantics(
                      identifier: 'login-tabs',
                      label: 'login-tabs',
                      container: true,
                      child: Container(
                        decoration: BoxDecoration(
                          border: Border.all(color: border),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: Row(
                          children: [
                            tab('Email', _LoginType.email, 'tab-email'),
                            tab('Phone', _LoginType.phone, 'tab-phone'),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Semantics(
                      identifier: 'login-user',
                      label: 'login-user',
                      textField: true,
                      child: TextField(
                        controller: _identifier,
                        style: const TextStyle(color: textLight),
                        keyboardType: _type == _LoginType.email
                            ? TextInputType.emailAddress
                            : TextInputType.phone,
                        autocorrect: false,
                        decoration: field(_type == _LoginType.email
                            ? 'you@example.com'
                            : '+90 555 123 4567'),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Semantics(
                      identifier: 'login-pass',
                      label: 'login-pass',
                      textField: true,
                      child: TextField(
                        controller: _password,
                        obscureText: true,
                        style: const TextStyle(color: textLight),
                        decoration: field('Enter your password'),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Semantics(
                      identifier: 'login-submit',
                      label: 'login-submit',
                      button: true,
                      child: ElevatedButton(
                        onPressed: _loading ? null : _submit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: indigo,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                          textStyle: const TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                        child:
                            Text(_loading ? 'Authenticating…' : 'Sign In'),
                      ),
                    ),
                    const SizedBox(height: 18),
                    Row(
                      children: const [
                        Expanded(child: Divider(color: border)),
                        Padding(
                          padding: EdgeInsets.symmetric(horizontal: 10),
                          child: Text('or continue with',
                              style: TextStyle(color: muted, fontSize: 13)),
                        ),
                        Expanded(child: Divider(color: border)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Semantics(
                      identifier: 'google-login-btn',
                      label: 'google-login-btn',
                      button: true,
                      child: OutlinedButton(
                        onPressed: widget.onLogin,
                        style: OutlinedButton.styleFrom(
                          backgroundColor: card,
                          foregroundColor: const Color(0xFFE2E8F0),
                          side: const BorderSide(color: border),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: const Text('Login with Google'),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Semantics(
                      identifier: 'github-login-btn',
                      label: 'github-login-btn',
                      button: true,
                      child: OutlinedButton(
                        onPressed: widget.onLogin,
                        style: OutlinedButton.styleFrom(
                          backgroundColor: card,
                          foregroundColor: const Color(0xFFE2E8F0),
                          side: const BorderSide(color: border),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: const Text('Login with GitHub'),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Test: testuser@ares.com / Test@1234\n'
                      'admin@ares.com / Admin@5678',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          color: Color(0xFF475569),
                          fontSize: 12,
                          height: 1.5),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
