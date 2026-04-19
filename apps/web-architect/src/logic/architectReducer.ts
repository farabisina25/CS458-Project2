import type { ArchitectAction, ArchitectDraft } from "./architectTypes.js";

export function architectReducer(state: ArchitectDraft, action: ArchitectAction): ArchitectDraft {
  switch (action.type) {
    case "select_question":
      return { ...state, selectedQuestionId: action.id };
    case "upsert_question": {
      const questions = { ...state.schema.questions, [action.question.id]: action.question };
      return { ...state, schema: { ...state.schema, questions } };
    }
    case "remove_question": {
      const { [action.id]: _, ...rest } = state.schema.questions;
      const edges = state.schema.edges.filter(
        (e) => e.from !== action.id && e.to !== action.id,
      );
      const entryId = state.schema.entryId === action.id ? Object.keys(rest)[0] ?? "" : state.schema.entryId;
      return {
        ...state,
        selectedQuestionId:
          state.selectedQuestionId === action.id ? undefined : state.selectedQuestionId,
        schema: { ...state.schema, questions: rest, edges, entryId },
      };
    }
    case "add_edge":
      return { ...state, schema: { ...state.schema, edges: [...state.schema.edges, action.edge] } };
    case "remove_edge":
      return {
        ...state,
        schema: {
          ...state.schema,
          edges: state.schema.edges.filter((e) => e.id !== action.id),
        },
      };
    case "set_entry":
      return { ...state, schema: { ...state.schema, entryId: action.entryId } };
    case "load_schema":
      return { ...state, schema: action.schema, selectedQuestionId: undefined };
    default:
      return state;
  }
}
