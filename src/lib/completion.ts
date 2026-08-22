import { IntakeSession } from "./types";
import { studentParentItems, allQuestionnaireItems } from "@/data/questionnaires";

export type FillState = "done" | "partial" | "none";

export interface RespondentProgress {
  answered: number;
  total: number;
  percent: number;
  state: FillState;
}

export interface CompletionRow {
  session: IntakeSession;
  student: RespondentProgress;
  parent: RespondentProgress;
  staff: RespondentProgress;
  allDone: boolean;
  daysSinceUpdate: number;
  /** Short Hebrew description of what is missing */
  missingLabel: string;
}

const progress = (responses: Record<string, number> | undefined, total: number): RespondentProgress => {
  const answered = Object.values(responses || {}).filter((v) => v != null).length;
  const percent = total > 0 ? Math.round((Math.min(answered, total) / total) * 100) : 0;
  const state: FillState = percent >= 100 ? "done" : answered > 0 ? "partial" : "none";
  return { answered, total, percent, state };
};

export function getCompletionRow(session: IntakeSession): CompletionRow {
  const spTotal = studentParentItems.length;
  const staffTotal = allQuestionnaireItems.length;

  const student = progress(session.studentResponses, spTotal);
  const parent = progress(session.parentResponses, spTotal);
  const staff = progress(session.staffResponses, staffTotal);

  const missing: string[] = [];
  if (student.state !== "done") missing.push(student.state === "none" ? "תלמיד — טרם החל" : "תלמיד — לא סיים");
  if (parent.state !== "done") missing.push(parent.state === "none" ? "הורה — טרם החל" : "הורה — לא סיים");
  if (staff.state !== "done") missing.push(staff.state === "none" ? "צוות — טרם החל" : "צוות — לא סיים");

  const updated = new Date(session.updatedAt || session.createdAt || Date.now()).getTime();
  const daysSinceUpdate = Math.max(0, Math.floor((Date.now() - updated) / 86400000));

  return {
    session,
    student,
    parent,
    staff,
    allDone: student.state === "done" && parent.state === "done" && staff.state === "done",
    daysSinceUpdate,
    missingLabel: missing.length === 0 ? "הכול הושלם" : missing.join(" · "),
  };
}

export type TrackFilter =
  | "all"
  | "complete"
  | "in_progress"
  | "student_only"
  | "parent_only"
  | "missing_staff"
  | "not_started"
  | "stale";

export const TRACK_FILTER_LABELS: Record<TrackFilter, string> = {
  all: "הכול",
  complete: "השלימו הכול",
  in_progress: "התחילו ולא סיימו",
  student_only: "רק התלמיד השלים",
  parent_only: "רק ההורה השלים",
  missing_staff: "חסרה הערכת צוות",
  not_started: "טרם החלו כלל",
  stale: "ללא פעילות 7+ ימים",
};

export function matchesFilter(row: CompletionRow, filter: TrackFilter): boolean {
  const s = row.student.state, p = row.parent.state, t = row.staff.state;
  switch (filter) {
    case "all":
      return true;
    case "complete":
      return row.allDone;
    case "in_progress":
      return !row.allDone && [s, p, t].some((x) => x === "partial" || x === "done");
    case "student_only":
      return s === "done" && p !== "done";
    case "parent_only":
      return p === "done" && s !== "done";
    case "missing_staff":
      return t !== "done";
    case "not_started":
      return s === "none" && p === "none" && t === "none";
    case "stale":
      return !row.allDone && row.daysSinceUpdate >= 7;
  }
}

export function buildCompletionRows(sessions: IntakeSession[]): CompletionRow[] {
  return sessions.map(getCompletionRow);
}

export function completionSummary(rows: CompletionRow[]) {
  return {
    total: rows.length,
    complete: rows.filter((r) => r.allDone).length,
    inProgress: rows.filter((r) => matchesFilter(r, "in_progress")).length,
    notStarted: rows.filter((r) => matchesFilter(r, "not_started")).length,
    missingStaff: rows.filter((r) => r.staff.state !== "done").length,
    studentOnly: rows.filter((r) => matchesFilter(r, "student_only")).length,
    parentOnly: rows.filter((r) => matchesFilter(r, "parent_only")).length,
    stale: rows.filter((r) => matchesFilter(r, "stale")).length,
  };
}
