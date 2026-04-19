import cors from "@fastify/cors";
import Fastify from "fastify";
import {
  assertAcyclic,
  migrateSessionForNewSchema,
  resolveVisibility,
  type SessionState,
  type SurveySchema,
} from "@ares/survey-core";
import * as store from "./store.js";

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

app.get("/health", async () => ({ ok: true }));

app.get<{ Params: { id: string } }>("/surveys/:id", async (req, reply) => {
  const s = store.getLatest(req.params.id);
  if (!s) return reply.code(404).send({ error: "not_found" });
  return s;
});

app.get<{ Params: { id: string; v: string } }>(
  "/surveys/:id/versions/:v",
  async (req, reply) => {
    const v = Number(req.params.v);
    const s = store.getVersion(req.params.id, v);
    if (!s) return reply.code(404).send({ error: "not_found" });
    return s;
  },
);

app.put<{ Params: { id: string }; Body: SurveySchema }>(
  "/surveys/:id",
  async (req, reply) => {
    const body = req.body;
    if (body.id !== req.params.id) {
      return reply.code(400).send({ error: "id_mismatch" });
    }
    try {
      assertAcyclic(body);
    } catch (e) {
      return reply.code(400).send({ error: "invalid_dag", message: String(e) });
    }
    const published = store.publish(body);
    return published;
  },
);

app.post<{
  Params: { id: string };
  Body: { clientVersion: number; session: SessionState };
}>("/surveys/:id/sync", async (req, reply) => {
  const latest = store.getLatest(req.params.id);
  if (!latest) return reply.code(404).send({ error: "not_found" });
  const prev = store.getVersion(req.params.id, req.body.clientVersion) ?? latest;
  const migrated = migrateSessionForNewSchema(prev, latest, req.body.session);
  const rclr = resolveVisibility(latest, migrated.session.answers);
  return { latest, migrated, rclr };
});

app.post<{ Body: SessionState; Querystring: { key?: string } }>(
  "/debug/session",
  async (req) => {
    const key = req.query.key ?? "default";
    store.putSession(key, req.body);
    return { ok: true, key };
  },
);

app.get<{ Querystring: { key?: string } }>("/debug/session", async (req) => {
  const key = req.query.key ?? "default";
  return store.getSession(key) ?? null;
});

const defaultSurvey: SurveySchema = {
  id: "live-demo",
  version: 1,
  entryId: "q1",
  questions: {
    q1: {
      id: "q1",
      kind: "single_choice",
      title: "Choose path",
      options: ["A", "B"],
      required: true,
    },
    q2: { id: "q2", kind: "text", title: "Path A detail", required: true },
    q3: { id: "q3", kind: "rating", title: "Path B score", maxRating: 5, required: true },
  },
  edges: [
    {
      id: "e1",
      from: "q1",
      to: "q2",
      condition: { type: "equals", questionId: "q1", value: "A" },
    },
    {
      id: "e2",
      from: "q1",
      to: "q3",
      condition: { type: "equals", questionId: "q1", value: "B" },
    },
  ],
};

store.seedIfEmpty(defaultSurvey);

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";
await app.listen({ port, host });
console.log(`API listening on http://${host}:${port}`);
