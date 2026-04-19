import type { SurveyEdge, SurveyQuestion, SurveySchema } from "@ares/survey-core";

export type ArchitectDraft = {
  schema: SurveySchema;
  selectedQuestionId?: string;
};

export type ArchitectAction =
  | { type: "select_question"; id?: string }
  | { type: "upsert_question"; question: SurveyQuestion }
  | { type: "remove_question"; id: string }
  | { type: "add_edge"; edge: SurveyEdge }
  | { type: "remove_edge"; id: string }
  | { type: "set_entry"; entryId: string }
  | { type: "load_schema"; schema: SurveySchema };
