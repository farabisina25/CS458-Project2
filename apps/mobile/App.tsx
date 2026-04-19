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
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  if (!loggedIn) {
    return (
      <View style={styles.center} testID="login-screen">
        <StatusBar style="dark" />
        <Text style={styles.title}>ARES-X</Text>
        <Text style={styles.subtitle}>Secure access · Project 1 login pattern</Text>
        <TextInput
          placeholder="Username"
          value={user}
          onChangeText={setUser}
          style={styles.input}
          autoCapitalize="none"
          testID="login-user"
        />
        <TextInput
          placeholder="Password"
          value={pass}
          onChangeText={setPass}
          style={styles.input}
          secureTextEntry
          testID="login-pass"
        />
        <Button
          title="Sign in"
          onPress={() => setLoggedIn(true)}
          testID="login-submit"
        />
      </View>
    );
  }

  return <SurveyFlow />;
}

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

  const setAnswer = (qid: string, value: string | number) => {
    setSession((s) => {
      if (!s || !schema) return s;
      const answers = { ...s.answers, [qid]: value };
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
          {q.kind === "single_choice" && q.options
            ? q.options.map((opt) => (
                <View key={opt} style={styles.choiceRow}>
                  <Button
                    title={opt}
                    onPress={() => setAnswer(q.id, opt)}
                    testID={`choice-${q.id}-${opt}`}
                  />
                </View>
              ))
            : null}
          {q.kind === "text" ? (
            <TextInput
              style={styles.input}
              placeholder="Type answer"
              onEndEditing={(e) => setAnswer(q.id, e.nativeEvent.text)}
              testID={`text-${q.id}`}
            />
          ) : null}
          {q.kind === "rating" ? (
            <View style={styles.row}>
              {Array.from({ length: q.maxRating ?? 5 }, (_, i) => i + 1).map((n) => (
                <Button key={n} title={String(n)} onPress={() => setAnswer(q.id, n)} testID={`rate-${q.id}-${n}`} />
              ))}
            </View>
          ) : null}
        </View>
      ))}
      {submitVisible ? (
        <Button title="Send" testID="survey-send" onPress={() => {}} />
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
});
