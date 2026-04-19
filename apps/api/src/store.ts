import type { SessionState, SurveySchema } from "@ares/survey-core";

type Stored = {
  history: SurveySchema[];
};

const surveys = new Map<string, Stored>();

export function getLatest(surveyId: string): SurveySchema | undefined {
  const s = surveys.get(surveyId);
  return s?.history[s.history.length - 1];
}

export function getVersion(surveyId: string, version: number): SurveySchema | undefined {
  const s = surveys.get(surveyId);
  return s?.history.find((h) => h.version === version);
}

export function publish(schema: SurveySchema): SurveySchema {
  const cur = surveys.get(schema.id);
  const nextVersion = cur ? Math.max(...cur.history.map((h) => h.version)) + 1 : schema.version;
  const next: SurveySchema = { ...schema, version: nextVersion };
  const history = cur ? [...cur.history, next] : [next];
  surveys.set(schema.id, { history });
  return next;
}

export function seedIfEmpty(schema: SurveySchema): SurveySchema {
  if (surveys.has(schema.id)) return getLatest(schema.id)!;
  surveys.set(schema.id, { history: [schema] });
  return schema;
}

/** Demo session store for E2E coordination (in-memory). */
const sessions = new Map<string, SessionState>();

export function putSession(key: string, state: SessionState) {
  sessions.set(key, state);
}

export function getSession(key: string): SessionState | undefined {
  return sessions.get(key);
}
