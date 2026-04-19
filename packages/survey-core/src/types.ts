export type QuestionKind =
  | "single_choice"
  | "multi_choice"
  | "rating"
  | "text";

export type SurveyQuestion = {
  id: string;
  kind: QuestionKind;
  title: string;
  /** single_choice / multi_choice */
  options?: string[];
  /** rating scale upper bound inclusive (e.g. 5) */
  maxRating?: number;
  required?: boolean;
};

export type EdgeCondition =
  | { type: "equals"; questionId: string; value: string }
  | { type: "oneOf"; questionId: string; values: string[] };

/** Directed edge in the survey DAG. Absent condition = always traversable once `from` is reached. */
export type SurveyEdge = {
  id: string;
  from: string;
  to: string;
  condition?: EdgeCondition;
};

export type SurveySchema = {
  id: string;
  version: number;
  entryId: string;
  questions: Record<string, SurveyQuestion>;
  edges: SurveyEdge[];
};

export type AnswerValue = string | string[] | number;

export type SessionAnswers = Record<string, AnswerValue>;

export type SessionState = {
  schemaId: string;
  schemaVersion: number;
  answers: SessionAnswers;
  /** Ordered trail of visited question ids (for stable rollback). */
  trail: string[];
  /** Current focus; may be undefined before start. */
  currentQuestionId?: string;
};

export type RclrResult = {
  visibleIds: Set<string>;
  /** True if every visible node has a valid anchoring path from entry (no orphan visibility). */
  consistent: boolean;
  /** If inconsistent, human-readable codes for UI (not a generic popup). */
  conflictCodes: RclrConflictCode[];
};

export type RclrConflictCode =
  | "ORPHAN_VISIBLE"
  | "MISSING_ENTRY"
  | "CYCLE_DETECTED"
  | "CONDITION_UNKNOWN_QUESTION"
  | "STALE_ANSWER";

export type GbcrMigrationResult =
  | {
      outcome: "unchanged";
      session: SessionState;
    }
  | {
      outcome: "recovered_atomic";
      session: SessionState;
      droppedAnswersFor: string[];
      notes: string[];
    }
  | {
      outcome: "rollback_stable";
      session: SessionState;
      stableNodeId: string;
      conflictCodes: RclrConflictCode[];
      notes: string[];
    };
