import type { SurveySchema } from "@ares/survey-core";

const base = () => (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

export async function fetchLatestSurvey(id: string): Promise<SurveySchema> {
  const r = await fetch(`${base()}/surveys/${id}`);
  if (!r.ok) throw new Error(`fetch survey ${r.status}`);
  return r.json() as Promise<SurveySchema>;
}

export async function publishSurvey(schema: SurveySchema): Promise<SurveySchema> {
  const r = await fetch(`${base()}/surveys/${schema.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(schema),
  });
  if (!r.ok) throw new Error(`publish ${r.status}`);
  return r.json() as Promise<SurveySchema>;
}
