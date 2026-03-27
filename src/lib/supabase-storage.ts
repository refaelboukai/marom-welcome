import { supabase } from "@/integrations/supabase/client";
import { IntakeSession, IntakeStatus } from "./types";
import { studentCodes, studentsData, ADMIN_CODE } from "@/data/students";

// Convert DB row to IntakeSession
function rowToSession(row: any): IntakeSession {
  return {
    id: row.id,
    studentName: row.student_name,
    studentIdNumber: row.student_id_number || "",
    grade: row.grade || "",
    intakeDate: row.intake_date,
    parentName: row.parent_name || "",
    parentPhone: row.parent_phone || "",
    secondParentName: row.second_parent_name,
    notes: row.notes,
    studentCode: row.student_code,
    parentCode: row.parent_code,
    studentCodeActive: row.student_code_active !== false,
    parentCodeActive: row.parent_code_active !== false,
    staffCode: row.staff_code,
    classGroup: row.class_group || "",
    academicYear: row.academic_year || 'תשפ"ו',
    status: row.status as IntakeStatus,
    studentResponses: (row.student_responses as Record<string, number>) || {},
    studentOpenResponses: (row.student_open_responses as Record<string, string>) || {},
    parentResponses: (row.parent_responses as Record<string, number>) || {},
    parentOpenResponse: row.parent_open_response,
    staffResponses: (row.staff_responses as Record<string, number>) || {},
    staffOpenResponses: (row.staff_open_responses as Record<string, string>) || {},
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
    reassessmentStatus: row.reassessment_status || "not_started",
    reassessmentStudentResponses: (row.reassessment_student_responses as Record<string, number>) || {},
    reassessmentParentResponses: (row.reassessment_parent_responses as Record<string, number>) || {},
    reassessmentDate: row.reassessment_date,
  };
}

function generateCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function initializeSessionsDB(): Promise<void> {
  const { count } = await supabase
    .from("intake_sessions")
    .select("*", { count: "exact", head: true });

  if (count && count > 0) return;

  const sessions = studentCodes.map((sc) => {
    const nameParts = sc.name.split(" ");
    const studentData = studentsData.find(
      (s) => s.firstName === nameParts[0] || `${s.firstName} ${s.lastName}` === sc.name
    );

    return {
      student_name: sc.name,
      student_id_number: studentData?.id || "",
      grade: studentData?.grade || "",
      intake_date: new Date().toISOString().split("T")[0],
      parent_name: studentData ? [studentData.motherName, studentData.fatherName].filter(Boolean).join(" / ") : "",
      parent_phone: studentData ? (studentData.motherPhone || studentData.fatherPhone) : "",
      student_code: sc.code,
      parent_code: generateCode(),
      staff_code: generateCode(),
      class_group: sc.classGroup || "",
      status: "not_started",
    };
  });

  const { error } = await supabase.from("intake_sessions").insert(sessions);
  if (error) console.error("Failed to seed sessions:", error);
}

export async function getSessionsDB(): Promise<IntakeSession[]> {
  const { data, error } = await supabase
    .from("intake_sessions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching sessions:", error);
    return [];
  }
  return (data || []).map(rowToSession);
}

export async function getSessionDB(id: string): Promise<IntakeSession | null> {
  const { data, error } = await supabase
    .from("intake_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return rowToSession(data);
}

export async function findSessionByCodeDB(code: string): Promise<{ session: IntakeSession; role: "student" | "parent" } | null> {
  // Check student code
  const { data: studentData } = await supabase
    .from("intake_sessions")
    .select("*")
    .eq("student_code", code)
    .maybeSingle();

  if (studentData) {
    if (!(studentData as any).student_code_active) return null;
    return { session: rowToSession(studentData), role: "student" };
  }

  // Check parent code
  const { data: parentData } = await supabase
    .from("intake_sessions")
    .select("*")
    .eq("parent_code", code)
    .maybeSingle();

  if (parentData) {
    if (!(parentData as any).parent_code_active) return null;
    return { session: rowToSession(parentData), role: "parent" };
  }

  return null;
}

export function isAdminCode(code: string): boolean {
  return code === ADMIN_CODE;
}

export async function updateSessionDB(id: string, updates: Partial<IntakeSession>): Promise<IntakeSession | null> {
  const dbUpdates: any = { updated_at: new Date().toISOString() };

  if (updates.studentName !== undefined) dbUpdates.student_name = updates.studentName;
  if (updates.studentIdNumber !== undefined) dbUpdates.student_id_number = updates.studentIdNumber;
  if (updates.grade !== undefined) dbUpdates.grade = updates.grade;
  if (updates.intakeDate !== undefined) dbUpdates.intake_date = updates.intakeDate;
  if (updates.parentName !== undefined) dbUpdates.parent_name = updates.parentName;
  if (updates.parentPhone !== undefined) dbUpdates.parent_phone = updates.parentPhone;
  if (updates.secondParentName !== undefined) dbUpdates.second_parent_name = updates.secondParentName;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.studentResponses !== undefined) dbUpdates.student_responses = updates.studentResponses;
  if (updates.studentOpenResponses !== undefined) dbUpdates.student_open_responses = updates.studentOpenResponses;
  if (updates.parentResponses !== undefined) dbUpdates.parent_responses = updates.parentResponses;
  if (updates.parentOpenResponse !== undefined) dbUpdates.parent_open_response = updates.parentOpenResponse;
  if (updates.adminNotes !== undefined) dbUpdates.admin_notes = updates.adminNotes;
  if (updates.closedAt !== undefined) dbUpdates.closed_at = updates.closedAt;
  if (updates.staffResponses !== undefined) dbUpdates.staff_responses = updates.staffResponses;
  if (updates.staffOpenResponses !== undefined) dbUpdates.staff_open_responses = updates.staffOpenResponses;
  if (updates.classGroup !== undefined) dbUpdates.class_group = updates.classGroup;
  if (updates.academicYear !== undefined) dbUpdates.academic_year = updates.academicYear;
  if (updates.reassessmentStatus !== undefined) dbUpdates.reassessment_status = updates.reassessmentStatus;
  if (updates.reassessmentStudentResponses !== undefined) dbUpdates.reassessment_student_responses = updates.reassessmentStudentResponses;
  if (updates.reassessmentParentResponses !== undefined) dbUpdates.reassessment_parent_responses = updates.reassessmentParentResponses;
  if (updates.reassessmentDate !== undefined) dbUpdates.reassessment_date = updates.reassessmentDate;

  const { data, error } = await supabase
    .from("intake_sessions")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Error updating session:", error);
    return null;
  }
  return data ? rowToSession(data) : null;
}

export async function createSessionDB(data: Partial<IntakeSession>): Promise<IntakeSession | null> {
  const row = {
    student_name: data.studentName || "",
    student_id_number: data.studentIdNumber || "",
    grade: data.grade || "",
    intake_date: data.intakeDate || new Date().toISOString().split("T")[0],
    parent_name: data.parentName || "",
    parent_phone: data.parentPhone || "",
    second_parent_name: data.secondParentName,
    notes: data.notes,
    student_code: generateCode(),
    parent_code: generateCode(),
    staff_code: generateCode(),
    class_group: data.classGroup || "",
    academic_year: data.academicYear || 'תשפ"ו',
    status: "not_started",
  };

  const { data: inserted, error } = await supabase
    .from("intake_sessions")
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error("Error creating session:", error);
    return null;
  }
  return rowToSession(inserted);
}

export async function deleteSessionDB(id: string): Promise<void> {
  const { error } = await supabase.from("intake_sessions").delete().eq("id", id);
  if (error) console.error("Error deleting session:", error);
}

// Academic assessment functions
export async function getAcademicAssessments(sessionId: string) {
  const { data, error } = await supabase
    .from("academic_assessments")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching assessments:", error);
    return [];
  }
  return data || [];
}

export async function createAcademicAssessment(sessionId: string, subject: string, gradeLevel: string) {
  const { data, error } = await supabase
    .from("academic_assessments")
    .insert({
      session_id: sessionId,
      subject,
      grade_level: gradeLevel,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating assessment:", error);
    return null;
  }
  return data;
}

export async function updateAcademicAssessment(id: string, updates: any) {
  const { data, error } = await supabase
    .from("academic_assessments")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating assessment:", error);
    return null;
  }
  return data;
}

// AI pedagogical assessment
export async function generatePedagogicalTest(subject: string, gradeLevel: string, topic?: string) {
  const { data, error } = await supabase.functions.invoke("pedagogical-assessment", {
    body: { mode: "generate_test", subject, gradeLevel, topic },
  });
  if (error) throw error;
  return data;
}

export async function analyzePedagogicalResults(
  subject: string,
  gradeLevel: string,
  studentAnswers: any,
  existingScores?: any,
  studentName?: string
) {
  const { data, error } = await supabase.functions.invoke("pedagogical-assessment", {
    body: { mode: "analyze", subject, gradeLevel, studentAnswers, existingScores, studentName },
  });
  if (error) throw error;
  return data;
}

export async function generateAIInsights(
  existingScores: any,
  studentAnswers?: any,
  studentName?: string,
  gradeLevel?: string
) {
  const { data, error } = await supabase.functions.invoke("pedagogical-assessment", {
    body: { mode: "insights", existingScores, studentAnswers, studentName, gradeLevel },
  });
  if (error) throw error;
  return data;
}

// Assessment Rounds
export interface AssessmentRound {
  id: string;
  session_id: string;
  round_number: number;
  round_label: string;
  participants: string; // 'both' | 'student' | 'parent'
  student_responses: Record<string, number>;
  parent_responses: Record<string, number>;
  student_status: string;
  parent_status: string;
  created_at: string;
  completed_at: string | null;
}

export async function getAssessmentRounds(sessionId: string): Promise<AssessmentRound[]> {
  const { data, error } = await supabase
    .from("assessment_rounds")
    .select("*")
    .eq("session_id", sessionId)
    .order("round_number", { ascending: true });
  if (error) { console.error("Error fetching rounds:", error); return []; }
  return (data || []).map((r: any) => ({
    ...r,
    student_responses: r.student_responses || {},
    parent_responses: r.parent_responses || {},
  }));
}

export async function createAssessmentRound(sessionId: string, roundLabel: string, participants: string): Promise<AssessmentRound | null> {
  // Get next round number
  const { data: existing } = await supabase
    .from("assessment_rounds")
    .select("round_number")
    .eq("session_id", sessionId)
    .order("round_number", { ascending: false })
    .limit(1);
  const nextNum = existing && existing.length > 0 ? (existing[0] as any).round_number + 1 : 1;

  const { data, error } = await (supabase as any)
    .from("assessment_rounds")
    .insert({
      session_id: sessionId,
      round_number: nextNum,
      round_label: roundLabel,
      participants,
      student_status: participants === 'parent' ? 'not_required' : 'pending',
      parent_status: participants === 'student' ? 'not_required' : 'pending',
    })
    .select()
    .single();
  if (error) { console.error("Error creating round:", error); return null; }
  return { ...data, student_responses: {}, parent_responses: {} };
}

export async function updateAssessmentRound(id: string, updates: Partial<AssessmentRound>): Promise<void> {
  const { error } = await (supabase as any)
    .from("assessment_rounds")
    .update(updates)
    .eq("id", id);
  if (error) console.error("Error updating round:", error);
}

export async function getActiveRoundForSession(sessionId: string, role: 'student' | 'parent'): Promise<AssessmentRound | null> {
  const statusField = role === 'student' ? 'student_status' : 'parent_status';
  const { data, error } = await (supabase as any)
    .from("assessment_rounds")
    .select("*")
    .eq("session_id", sessionId)
    .eq(statusField, "pending")
    .order("round_number", { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  const r = data[0];
  // Check participants field
  if (role === 'student' && r.participants === 'parent') return null;
  if (role === 'parent' && r.participants === 'student') return null;
  return { ...r, student_responses: r.student_responses || {}, parent_responses: r.parent_responses || {} };
}

export async function resetAllSessionsDB(): Promise<boolean> {
  // Delete all related records first
  const { error: spError } = await supabase.from("support_plans").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (spError) { console.error("Error deleting support_plans:", spError); return false; }

  const { error: aaError } = await supabase.from("academic_assessments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (aaError) { console.error("Error deleting academic_assessments:", aaError); return false; }

  const { error: isError } = await supabase.from("intake_sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (isError) { console.error("Error deleting intake_sessions:", isError); return false; }

  // Re-seed
  await initializeSessionsDB();
  return true;
}
