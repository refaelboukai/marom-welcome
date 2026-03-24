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
    staffCode: row.staff_code,
    classGroup: row.class_group || "",
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

  if (studentData) return { session: rowToSession(studentData), role: "student" };

  // Check parent code
  const { data: parentData } = await supabase
    .from("intake_sessions")
    .select("*")
    .eq("parent_code", code)
    .maybeSingle();

  if (parentData) return { session: rowToSession(parentData), role: "parent" };

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
