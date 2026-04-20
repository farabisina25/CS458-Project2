import { assertAcyclic, type SurveyEdge, type SurveyQuestion } from "@ares/survey-core";
import { useEffect, useReducer, useState } from "react";
import { fetchLatestSurvey, publishSurvey } from "./api.js";
import { architectReducer } from "./logic/architectReducer.js";
import type { ArchitectDraft } from "./logic/architectTypes.js";

const SURVEY_ID = "live-demo";

function initialDraft(): ArchitectDraft {
  return {
    schema: {
      id: SURVEY_ID,
      version: 1,
      entryId: "q1",
      questions: {},
      edges: [],
    },
  };
}

export function App() {
  const [draft, dispatch] = useReducer(architectReducer, initialDraft());
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    fetchLatestSurvey(SURVEY_ID)
      .then((schema) => {
        if (!cancelled) {
          dispatch({ type: "load_schema", schema });
          setHydrated(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          dispatch({ type: "load_schema", schema: initialDraft().schema });
          setHydrated(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedId = draft?.selectedQuestionId;
  const selected = selectedId ? draft.schema.questions[selectedId] : undefined;

  const onPublish = async () => {
    setError(null);
    setStatus("");
    try {
      assertAcyclic(draft.schema);
      const saved = await publishSurvey(draft.schema);
      dispatch({ type: "load_schema", schema: saved });
      setStatus(`Published v${saved.version}`);
    } catch (e) {
      setError(String(e));
    }
  };

  const addQuestion = () => {
    const existing = Object.keys(draft.schema.questions);
    let n = existing.length + 1;
    while (existing.includes(`q${n}`)) n++;
    const id = `q${n}`;
    const q: SurveyQuestion = {
      id,
      kind: "single_choice",
      title: `Question ${id}`,
      options: ["Option A", "Option B"],
      required: true,
    };
    dispatch({ type: "upsert_question", question: q });
    if (!draft.schema.entryId || !draft.schema.questions[draft.schema.entryId]) {
      dispatch({ type: "set_entry", entryId: id });
    }
  };

  const addEdge = () => {
    const ids = Object.keys(draft.schema.questions);
    if (ids.length < 2) return;
    const from = ids[ids.length - 2];
    const to = ids[ids.length - 1];
    const fromQ = draft.schema.questions[from];
    // Only add condition for choice questions; rating/text edges are unconditional
    const condition: SurveyEdge["condition"] =
      fromQ?.options && fromQ.options.length > 0
        ? { type: "equals", questionId: from, value: fromQ.options[0] }
        : undefined;
    const existing = draft.schema.edges;
    let n = existing.length + 1;
    while (existing.some((e) => e.id === `e${n}`)) n++;
    const edge: SurveyEdge = { id: `e${n}`, from, to, condition };
    dispatch({ type: "add_edge", edge });
  };

  if (!hydrated || !draft) return <div className="canvas">Loading architect…</div>;

  return (
    <div className="layout">
      <aside className="panel">
        <h2>Survey DAG</h2>
        <p className="muted">
          Schema <span className="badge">{draft.schema.id}</span> v{draft.schema.version}
        </p>
        <div className="toolbar">
          <button type="button" onClick={addQuestion}>
            Add question
          </button>
          <button type="button" onClick={addEdge}>
            Link last two
          </button>
          <button type="button" className="primary" data-testid="architect-publish" onClick={onPublish}>
            Publish
          </button>
        </div>
        {error ? <p className="error">{error}</p> : null}
        {status ? <p className="muted">{status}</p> : null}
        <hr />
        {Object.values(draft.schema.questions).map((q) => (
          <div
            key={q.id}
            data-testid={`architect-question-${q.id}`}
            className={`card ${selectedId === q.id ? "active" : ""}`}
            onClick={() => dispatch({ type: "select_question", id: q.id })}
            onKeyDown={(e) => e.key === "Enter" && dispatch({ type: "select_question", id: q.id })}
            role="button"
            tabIndex={0}
          >
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <strong>{q.title}</strong>
                <div className="muted">
                  {q.kind} · {q.id}
                </div>
              </div>
              {Object.keys(draft.schema.questions).length > 1 ? (
                <button
                  type="button"
                  className="danger"
                  data-testid={`remove-question-${q.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "remove_question", id: q.id });
                  }}
                  style={{ alignSelf: "flex-start" }}
                >
                  ✕
                </button>
              ) : null}
            </div>
          </div>
        ))}
        <h3 className="muted">Edges</h3>
        {draft.schema.edges.map((e) => (
          <div key={e.id} className="muted row">
            <span>
              {e.from} → {e.to}
            </span>
            <button type="button" className="danger" onClick={() => dispatch({ type: "remove_edge", id: e.id })}>
              Remove
            </button>
          </div>
        ))}
      </aside>
      <main className="canvas">
        <h1>Web Architect</h1>
        <p className="muted">
          Responsive designer with DAG validation. Publishing bumps the server version for mobile GBCR.
        </p>
        {selected ? (
          <Editor question={selected} onChange={(q) => dispatch({ type: "upsert_question", question: q })} />
        ) : (
          <p className="muted">Select a question to edit.</p>
        )}
      </main>
    </div>
  );
}

function Editor({
  question,
  onChange,
}: {
  question: SurveyQuestion;
  onChange: (q: SurveyQuestion) => void;
}) {
  return (
    <div className="card" style={{ cursor: "default" }}>
      <div className="row" style={{ marginBottom: "0.5rem" }}>
        <label>
          Title{" "}
          <input
            value={question.title}
            onChange={(e) => onChange({ ...question, title: e.target.value })}
          />
        </label>
        <label>
          Kind{" "}
          <select
            value={question.kind}
            onChange={(e) =>
              onChange({
                ...question,
                kind: e.target.value as SurveyQuestion["kind"],
              })
            }
          >
            <option value="single_choice">single_choice</option>
            <option value="multi_choice">multi_choice</option>
            <option value="rating">rating</option>
            <option value="text">text</option>
          </select>
        </label>
      </div>
      {question.kind === "single_choice" || question.kind === "multi_choice" ? (
        <label>
          Options (comma separated)
          <textarea
            rows={3}
            style={{ width: "100%", marginTop: "0.35rem" }}
            value={(question.options ?? []).join(", ")}
            onChange={(e) =>
              onChange({
                ...question,
                options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
              })
            }
          />
        </label>
      ) : null}
    </div>
  );
}
