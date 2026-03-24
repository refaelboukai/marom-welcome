import { IntakeSession, IntakeStatus } from "./types";
import { studentCodes, studentsData, ADMIN_CODE } from "@/data/students";

const STORAGE_KEY = "marom_intake_sessions";

function generateCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getAll(): IntakeSession[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveAll(sessions: IntakeSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function initializeSessions(): void {
  const existing = getAll();
  if (existing.length > 0) return;

  const sessions: IntakeSession[] = studentCodes.map((sc, i) => {
    // Try to find matching student data
    const nameParts = sc.name.split(" ");
    const studentData = studentsData.find(
      (s) => s.firstName === nameParts[0] || `${s.firstName} ${s.lastName}` === sc.name
    );

    return {
      id: `session_${i + 1}`,
      studentName: sc.name,
      studentIdNumber: studentData?.id || "",
      grade: studentData?.grade || "",
      intakeDate: new Date().toISOString().split("T")[0],
      parentName: studentData ? [studentData.motherName, studentData.fatherName].filter(Boolean).join(" / ") : "",
      parentPhone: studentData ? (studentData.motherPhone || studentData.fatherPhone) : "",
      studentCode: sc.code,
      parentCode: generateCode(),
      status: "not_started" as IntakeStatus,
      studentResponses: {},
      studentOpenResponses: {},
      parentResponses: {},
      staffResponses: {},
      staffOpenResponses: {},
      adminNotes: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  saveAll(sessions);
}

export function getSessions(): IntakeSession[] {
  initializeSessions();
  return getAll();
}

export function getSession(id: string): IntakeSession | undefined {
  return getSessions().find((s) => s.id === id);
}

export function findSessionByCode(code: string): { session: IntakeSession; role: "student" | "parent" } | null {
  const sessions = getSessions();
  for (const session of sessions) {
    if (session.studentCode === code) return { session, role: "student" };
    if (session.parentCode === code) return { session, role: "parent" };
  }
  return null;
}

export function isAdminCode(code: string): boolean {
  return code === ADMIN_CODE;
}

export function updateSession(id: string, updates: Partial<IntakeSession>): IntakeSession | null {
  const sessions = getSessions();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  sessions[idx] = { ...sessions[idx], ...updates, updatedAt: new Date().toISOString() };
  saveAll(sessions);
  return sessions[idx];
}

export function createSession(data: Partial<IntakeSession>): IntakeSession {
  const sessions = getSessions();
  const newSession: IntakeSession = {
    id: `session_${Date.now()}`,
    studentName: data.studentName || "",
    studentIdNumber: data.studentIdNumber || "",
    grade: data.grade || "",
    intakeDate: data.intakeDate || new Date().toISOString().split("T")[0],
    parentName: data.parentName || "",
    parentPhone: data.parentPhone || "",
    secondParentName: data.secondParentName,
    notes: data.notes,
    studentCode: generateCode(),
    parentCode: generateCode(),
    status: "not_started",
    studentResponses: {},
    studentOpenResponses: {},
    parentResponses: {},
    staffResponses: {},
    staffOpenResponses: {},
    adminNotes: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  sessions.push(newSession);
  saveAll(sessions);
  return newSession;
}

export function deleteSession(id: string): void {
  const sessions = getSessions().filter((s) => s.id !== id);
  saveAll(sessions);
}

export function resetSessions(): void {
  localStorage.removeItem(STORAGE_KEY);
}
