import {
  canShowSubmit,
  migrateSessionForNewSchema,
  resolveVisibility,
  type GbcrMigrationResult,
  type SessionState,
  type SurveySchema,
} from "@ares/survey-core";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Constants from "expo-constants";

const SURVEY_ID = "live-demo";

function apiBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string };
  if (Platform.OS === "android") return (extra.apiUrl ?? "http://10.0.2.2:4000").replace(/\/$/, "");
  return "http://127.0.0.1:4000";
}

async function fetchLatest(): Promise<SurveySchema> {
  const r = await fetch(`${apiBase()}/surveys/${SURVEY_ID}`);
  if (!r.ok) throw new Error(`survey ${r.status}`);
  return r.json() as Promise<SurveySchema>;
}

/* ─── Login Screen (adapted from Project 1 ARES login page) ──────────── */

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [loginType, setLoginType] = useState<"email" | "phone">("email");
  const [identifier, setIdentifier] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: string; message: string } | null>(null);

  const handleLogin = () => {
    if (!identifier || !pass) {
      setStatus({ type: "error", message: "Please fill in all fields." });
      return;
    }
    setLoading(true);
    setStatus(null);
    // Simulate authentication (adapted from P1 /api/login pattern)
    setTimeout(() => {
      setLoading(false);
      setStatus({ type: "success", message: "Login successful!" });
      setTimeout(onLogin, 600);
    }, 800);
  };

  return (
    <ScrollView contentContainerStyle={loginStyles.container} testID="login-screen">
      <StatusBar style="light" />
      {/* ARES Branding (adapted from Project 1) */}
      <View style={loginStyles.logoRow}>
        <View style={loginStyles.logoIcon}>
          <Text style={loginStyles.logoLetter}>A</Text>
        </View>
        <Text style={loginStyles.logoText}>ARES-X</Text>
      </View>
      <Text style={loginStyles.heading}>Welcome Back</Text>
      <Text style={loginStyles.subtitle}>Sign in to your secure account</Text>

      {/* Status message */}
      {status ? (
        <View style={[loginStyles.statusBox, status.type === "error" ? loginStyles.statusError : loginStyles.statusSuccess]}>
          <Text style={loginStyles.statusText}>{status.message}</Text>
        </View>
      ) : null}

      {/* Email / Phone tabs (adapted from Project 1) */}
      <View style={loginStyles.tabRow} testID="login-tabs">
        <TouchableOpacity
          style={[loginStyles.tab, loginType === "email" && loginStyles.tabActive]}
          onPress={() => { setLoginType("email"); setIdentifier(""); }}
          testID="tab-email"
        >
          <Text style={[loginStyles.tabText, loginType === "email" && loginStyles.tabTextActive]}>📧 Email</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[loginStyles.tab, loginType === "phone" && loginStyles.tabActive]}
          onPress={() => { setLoginType("phone"); setIdentifier(""); }}
          testID="tab-phone"
        >
          <Text style={[loginStyles.tabText, loginType === "phone" && loginStyles.tabTextActive]}>📱 Phone</Text>
        </TouchableOpacity>
      </View>

      {/* Identifier input */}
      <TextInput
        placeholder={loginType === "email" ? "you@example.com" : "+90 555 123 4567"}
        placeholderTextColor="#64748b"
        value={identifier}
        onChangeText={setIdentifier}
        style={loginStyles.input}
        autoCapitalize="none"
        keyboardType={loginType === "email" ? "email-address" : "phone-pad"}
        testID="login-user"
      />
      {/* Password input */}
      <TextInput
        placeholder="Enter your password"
        placeholderTextColor="#64748b"
        value={pass}
        onChangeText={setPass}
        style={loginStyles.input}
        secureTextEntry
        testID="login-pass"
      />

      {/* Sign In button */}
      <TouchableOpacity
        style={[loginStyles.primaryBtn, loading && loginStyles.btnDisabled]}
        onPress={handleLogin}
        disabled={loading}
        testID="login-submit"
      >
        <Text style={loginStyles.primaryBtnText}>{loading ? "Authenticating…" : "Sign In"}</Text>
      </TouchableOpacity>

      {/* Divider */}
      <View style={loginStyles.divider}>
        <View style={loginStyles.dividerLine} />
        <Text style={loginStyles.dividerText}>or continue with</Text>
        <View style={loginStyles.dividerLine} />
      </View>

      {/* Social auth buttons (adapted from Project 1: Google & GitHub) */}
      <TouchableOpacity style={loginStyles.socialBtn} testID="google-login-btn" onPress={onLogin}>
        <Text style={loginStyles.socialBtnText}>🔵 Login with Google</Text>
      </TouchableOpacity>
      <TouchableOpacity style={loginStyles.socialBtn} testID="github-login-btn" onPress={onLogin}>
        <Text style={loginStyles.socialBtnText}>⚫ Login with GitHub</Text>
      </TouchableOpacity>

      {/* Test accounts info (from Project 1) */}
      <Text style={loginStyles.testInfo}>
        Test: testuser@ares.com / Test@1234{"\n"}admin@ares.com / Admin@5678
      </Text>
    </ScrollView>
  );
}

const loginStyles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#0f172a" },
  logoRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  logoIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#6366f1", alignItems: "center", justifyContent: "center", marginRight: 10 },
  logoLetter: { color: "#fff", fontSize: 20, fontWeight: "700" },
  logoText: { color: "#e2e8f0", fontSize: 26, fontWeight: "700", letterSpacing: 1 },
  heading: { color: "#f1f5f9", fontSize: 22, fontWeight: "600", marginTop: 16 },
  subtitle: { color: "#64748b", fontSize: 14, marginBottom: 20 },
  statusBox: { width: "100%", padding: 10, borderRadius: 8, marginBottom: 12 },
  statusError: { backgroundColor: "#7f1d1d" },
  statusSuccess: { backgroundColor: "#14532d" },
  statusText: { color: "#f1f5f9", fontSize: 13, textAlign: "center" },
  tabRow: { flexDirection: "row", width: "100%", marginBottom: 12, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: "#334155" },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", backgroundColor: "#1e293b" },
  tabActive: { backgroundColor: "#6366f1" },
  tabText: { color: "#94a3b8", fontSize: 14, fontWeight: "500" },
  tabTextActive: { color: "#fff" },
  input: { width: "100%", borderWidth: 1, borderColor: "#334155", borderRadius: 10, padding: 12, color: "#f1f5f9", backgroundColor: "#1e293b", marginBottom: 10, fontSize: 15 },
  primaryBtn: { width: "100%", backgroundColor: "#6366f1", paddingVertical: 14, borderRadius: 10, alignItems: "center", marginTop: 4 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  btnDisabled: { opacity: 0.5 },
  divider: { flexDirection: "row", alignItems: "center", width: "100%", marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#334155" },
  dividerText: { color: "#64748b", marginHorizontal: 10, fontSize: 13 },
  socialBtn: { width: "100%", borderWidth: 1, borderColor: "#334155", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginBottom: 8, backgroundColor: "#1e293b" },
  socialBtnText: { color: "#e2e8f0", fontSize: 14, fontWeight: "500" },
  testInfo: { color: "#475569", fontSize: 12, marginTop: 16, textAlign: "center", lineHeight: 18 },
});

/* ─── Main App ────────────────────────────────────────────────────────── */

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  if (!loggedIn) {
    return <LoginScreen onLogin={() => setLoggedIn(true)} />;
  }

  return <SurveyFlow />;
}

/* ─── Survey Flow ─────────────────────────────────────────────────────── */

function SurveyFlow() {
  const [schema, setSchema] = useState<SurveySchema | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [rclrNote, setRclrNote] = useState<string | null>(null);
  const [gbcr, setGbcr] = useState<GbcrMigrationResult | null>(null);
  const schemaRef = useRef<SurveySchema | null>(null);
  const sessionRef = useRef<SessionState | null>(null);

  useEffect(() => {
    schemaRef.current = schema;
  }, [schema]);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const bootstrap = useCallback(async () => {
    const latest = await fetchLatest();
    schemaRef.current = latest;
    setSchema(latest);
    setSession({
      schemaId: latest.id,
      schemaVersion: latest.version,
      answers: {},
      trail: [],
      currentQuestionId: latest.entryId,
    });
  }, []);

  useEffect(() => {
    bootstrap().catch(() => {});
  }, [bootstrap]);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const latest = await fetchLatest();
        const cur = schemaRef.current;
        const sess = sessionRef.current;
        if (!cur || !sess) {
          if (!cur) setSchema(latest);
          return;
        }
        if (latest.version === cur.version) return;
        const migrated = migrateSessionForNewSchema(cur, latest, sess);
        setGbcr(migrated);
        setSchema(latest);
        setSession(migrated.session);
        schemaRef.current = latest;
        const rclr = resolveVisibility(latest, migrated.session.answers);
        setRclrNote(rclr.consistent ? null : rclr.conflictCodes.join(", "));
      } catch {
        /* offline */
      }
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const rclr = useMemo(() => {
    if (!schema || !session) return null;
    return resolveVisibility(schema, session.answers);
  }, [schema, session]);

  const submitVisible = schema && session && rclr ? canShowSubmit(schema, session.answers, rclr) : false;

  const visibleQuestions = useMemo(() => {
    if (!schema || !rclr) return [];
    return Object.values(schema.questions).filter((q) => rclr.visibleIds.has(q.id));
  }, [schema, rclr]);

  const setAnswer = (qid: string, value: string | string[] | number) => {
    setSession((s) => {
      if (!s || !schema) return s;
      const answers = { ...s.answers, [qid]: value };
      const trail = s.trail.includes(qid) ? s.trail : [...s.trail, qid];
      return { ...s, answers, trail, currentQuestionId: qid };
    });
  };

  const toggleMultiChoice = (qid: string, option: string) => {
    setSession((s) => {
      if (!s) return s;
      const current = (s.answers[qid] as string[] | undefined) ?? [];
      const next = current.includes(option) ? current.filter((v) => v !== option) : [...current, option];
      const answers = { ...s.answers, [qid]: next };
      const trail = s.trail.includes(qid) ? s.trail : [...s.trail, qid];
      return { ...s, answers, trail, currentQuestionId: qid };
    });
  };

  if (!schema || !session) {
    return (
      <View style={styles.center}>
        <Text>Loading survey…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.survey} testID="survey-screen">
      <StatusBar style="dark" />
      <Text style={styles.title}>Live survey</Text>
      <Text style={styles.muted} testID="schema-version-label">
        {schema.id} v{schema.version}
      </Text>
      {gbcr && gbcr.outcome !== "unchanged" ? (
        <View style={styles.banner} testID="gbcr-banner">
          <Text style={styles.bannerTitle}>GBCR · {gbcr.outcome}</Text>
          {"notes" in gbcr
            ? gbcr.notes.map((n) => (
                <Text key={n} style={styles.bannerText}>
                  {n}
                </Text>
              ))
            : null}
          {"conflictCodes" in gbcr ? (
            <Text style={styles.bannerText} testID="rclr-conflict-codes">
              {(gbcr.conflictCodes ?? []).join(", ")}
            </Text>
          ) : null}
        </View>
      ) : null}
      {rclrNote ? (
        <View style={styles.warn} testID="rclr-inline-conflict">
          <Text style={styles.warnText}>RCLR: {rclrNote}</Text>
        </View>
      ) : null}
      {visibleQuestions.map((q) => (
        <View key={q.id} style={styles.card} testID={`question-${q.id}`}>
          <Text style={styles.qtitle}>{q.title}</Text>
          {/* single_choice */}
          {q.kind === "single_choice" && q.options
            ? q.options.map((opt) => (
                <View key={opt} style={styles.choiceRow}>
                  <Button
                    title={opt}
                    onPress={() => setAnswer(q.id, opt)}
                    color={session.answers[q.id] === opt ? "#6366f1" : undefined}
                    testID={`choice-${q.id}-${opt}`}
                  />
                </View>
              ))
            : null}
          {/* multi_choice (checkbox-style) */}
          {q.kind === "multi_choice" && q.options
            ? q.options.map((opt) => {
                const selected = Array.isArray(session.answers[q.id]) && (session.answers[q.id] as string[]).includes(opt);
                return (
                  <Pressable
                    key={opt}
                    style={[styles.checkRow, selected && styles.checkRowSelected]}
                    onPress={() => toggleMultiChoice(q.id, opt)}
                    testID={`multi-${q.id}-${opt}`}
                  >
                    <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                      {selected ? <Text style={styles.checkmark}>✓</Text> : null}
                    </View>
                    <Text style={styles.checkLabel}>{opt}</Text>
                  </Pressable>
                );
              })
            : null}
          {/* text */}
          {q.kind === "text" ? (
            <TextInput
              style={styles.input}
              placeholder="Type answer"
              onEndEditing={(e) => setAnswer(q.id, e.nativeEvent.text)}
              testID={`text-${q.id}`}
            />
          ) : null}
          {/* rating */}
          {q.kind === "rating" ? (
            <View style={styles.row}>
              {Array.from({ length: q.maxRating ?? 5 }, (_, i) => i + 1).map((n) => (
                <Button
                  key={n}
                  title={String(n)}
                  onPress={() => setAnswer(q.id, n)}
                  color={session.answers[q.id] === n ? "#6366f1" : undefined}
                  testID={`rate-${q.id}-${n}`}
                />
              ))}
            </View>
          ) : null}
        </View>
      ))}
      {submitVisible ? (
        <Button title="Send" testID="survey-send" onPress={() => {
          if (!session) return;
          Alert.alert(
            "Survey Submitted!",
            `Thank you! ${Object.keys(session.answers).length} answers recorded.`,
            [{ text: "OK", onPress: () => bootstrap() }],
          );
        }} />
      ) : (
        <Text style={styles.muted}>Complete required visible questions to send.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  survey: { padding: 16, gap: 12, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: "600" },
  subtitle: { fontSize: 14, color: "#64748b", marginBottom: 8 },
  muted: { color: "#64748b" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 8,
    minWidth: 240,
    marginVertical: 4,
  },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff",
  },
  qtitle: { fontSize: 16, fontWeight: "500", marginBottom: 8 },
  choiceRow: { marginVertical: 4 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  banner: {
    borderWidth: 1,
    borderColor: "#bae6fd",
    backgroundColor: "#e0f2fe",
    padding: 10,
    borderRadius: 10,
  },
  bannerTitle: { fontWeight: "600", marginBottom: 4 },
  bannerText: { fontSize: 13, color: "#0c4a6e" },
  warn: {
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    padding: 8,
    borderRadius: 8,
  },
  warnText: { color: "#991b1b" },
  /* multi_choice checkbox styles */
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginVertical: 2,
  },
  checkRowSelected: {
    backgroundColor: "#eef2ff",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#94a3b8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
  },
  checkmark: { color: "#fff", fontSize: 14, fontWeight: "700" },
  checkLabel: { fontSize: 15 },
});
