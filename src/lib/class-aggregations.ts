import { IntakeSession, SECTION_LABELS, OPEN_QUESTION_LABELS } from "./types";
import { calculateScores, calculateQoLSubdomains, calculateLearningSubdomains, generateRiskFlags } from "./scoring";
import { questionnaireItems } from "@/data/questionnaires";

export interface StudentProfileForAI {
  id: string;
  name: string;
  grade: string;
  gender: string;
  age?: number;
  completion: number;
  scores: Record<string, number>;
  qolSubdomains: Record<string, number>;
  learningSubdomains: Record<string, number>;
  riskFlags: string[];
  topStrengths: string[]; // items scored high (>=4)
  topChallenges: string[]; // items scored low (<=2)
  openResponses: Record<string, string>;
}

export interface ClassAggregate {
  classKey: string;
  classLabel: string;
  studentCount: number;
  completedCount: number;
  genderBreakdown: { male: number; female: number; unspecified: number };
  gradeDistribution: Record<string, number>;
  avgScores: Record<string, number>; // 5 domains
  avgQol: Record<string, number>; // qol subdomains
  avgLearning: Record<string, number>; // learning subdomains
  commonStrengths: { text: string; count: number; itemId: string }[];
  commonChallenges: { text: string; count: number; itemId: string }[];
  studentsAtRisk: { name: string; flags: number }[];
  studentProfiles: StudentProfileForAI[];
}

function completionOf(s: IntakeSession): number {
  const total = questionnaireItems.length * 2;
  const answered = Object.keys(s.studentResponses || {}).length + Object.keys(s.parentResponses || {}).length;
  return Math.round((answered / total) * 100);
}

function itemAvg(s: IntakeSession, id: string): number {
  const vals: number[] = [];
  if (s.studentResponses?.[id] != null) vals.push(s.studentResponses[id]);
  if (s.parentResponses?.[id] != null) vals.push(s.parentResponses[id]);
  if (vals.length === 0) return -1;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function buildStudentProfile(s: IntakeSession): StudentProfileForAI {
  const scores = calculateScores(s.studentResponses || {}, s.parentResponses || {});
  const qol = calculateQoLSubdomains(s.studentResponses || {}, s.parentResponses || {});
  const lc = calculateLearningSubdomains(s.studentResponses || {}, s.parentResponses || {});
  const flags = generateRiskFlags(scores);

  // find strong / weak items
  const strong: { id: string; text: string; val: number }[] = [];
  const weak: { id: string; text: string; val: number }[] = [];
  for (const item of questionnaireItems) {
    const raw = itemAvg(s, item.id);
    if (raw < 0) continue;
    const effective = item.isReverse ? 6 - raw : raw;
    if (effective >= 4) strong.push({ id: item.id, text: item.studentText, val: effective });
    if (effective <= 2) weak.push({ id: item.id, text: item.studentText, val: effective });
  }
  strong.sort((a, b) => b.val - a.val);
  weak.sort((a, b) => a.val - b.val);

  return {
    id: s.id,
    name: s.studentName,
    grade: s.grade || "",
    gender: s.gender || "unspecified",
    completion: completionOf(s),
    scores: {
      qualityOfLife: scores.qualityOfLife.normalized,
      selfEfficacy: scores.selfEfficacy.normalized,
      locusOfControl: scores.locusOfControl.normalized,
      cognitiveFlexibility: scores.cognitiveFlexibility.normalized,
      learningCharacteristics: scores.learningCharacteristics.normalized,
    },
    qolSubdomains: Object.fromEntries(Object.entries(qol).map(([k, v]) => [k, v.normalized])),
    learningSubdomains: Object.fromEntries(Object.entries(lc).map(([k, v]) => [k, v.normalized])),
    riskFlags: flags.map((f) => `${f.domain}: ${f.message}`),
    topStrengths: strong.slice(0, 6).map((x) => x.text),
    topChallenges: weak.slice(0, 6).map((x) => x.text),
    openResponses: s.studentOpenResponses || {},
  };
}

export function aggregateClass(classKey: string, classLabel: string, sessions: IntakeSession[]): ClassAggregate {
  const profiles = sessions.map(buildStudentProfile);
  const withData = profiles.filter((p) => p.completion > 0);

  const gender = { male: 0, female: 0, unspecified: 0 };
  const grade: Record<string, number> = {};
  for (const p of profiles) {
    const g = (p.gender as "male" | "female") || "unspecified";
    gender[g in gender ? g : "unspecified"]++;
    const gk = p.grade || "—";
    grade[gk] = (grade[gk] || 0) + 1;
  }

  const avgScores: Record<string, number> = {};
  for (const key of ["qualityOfLife", "selfEfficacy", "locusOfControl", "cognitiveFlexibility", "learningCharacteristics"]) {
    const vals = withData.map((p) => p.scores[key]).filter((v) => v > 0);
    avgScores[key] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : 0;
  }

  const avgQol: Record<string, number> = {};
  const avgLearning: Record<string, number> = {};
  const allQolKeys = new Set<string>();
  const allLcKeys = new Set<string>();
  withData.forEach((p) => {
    Object.keys(p.qolSubdomains).forEach((k) => allQolKeys.add(k));
    Object.keys(p.learningSubdomains).forEach((k) => allLcKeys.add(k));
  });
  allQolKeys.forEach((k) => {
    const vals = withData.map((p) => p.qolSubdomains[k]).filter((v) => v > 0);
    avgQol[k] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : 0;
  });
  allLcKeys.forEach((k) => {
    const vals = withData.map((p) => p.learningSubdomains[k]).filter((v) => v > 0);
    avgLearning[k] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : 0;
  });

  // Common items (strong / weak) — count how many students share each
  const strengthCounts: Record<string, { text: string; count: number; itemId: string }> = {};
  const challengeCounts: Record<string, { text: string; count: number; itemId: string }> = {};
  for (const s of sessions) {
    for (const item of questionnaireItems) {
      const raw = itemAvg(s, item.id);
      if (raw < 0) continue;
      const eff = item.isReverse ? 6 - raw : raw;
      if (eff >= 4) {
        strengthCounts[item.id] = strengthCounts[item.id] || { text: item.studentText, count: 0, itemId: item.id };
        strengthCounts[item.id].count++;
      }
      if (eff <= 2) {
        challengeCounts[item.id] = challengeCounts[item.id] || { text: item.studentText, count: 0, itemId: item.id };
        challengeCounts[item.id].count++;
      }
    }
  }
  const commonStrengths = Object.values(strengthCounts).sort((a, b) => b.count - a.count).slice(0, 8);
  const commonChallenges = Object.values(challengeCounts).sort((a, b) => b.count - a.count).slice(0, 8);

  const studentsAtRisk = profiles
    .map((p) => ({ name: p.name, flags: p.riskFlags.length }))
    .filter((x) => x.flags > 0)
    .sort((a, b) => b.flags - a.flags);

  return {
    classKey,
    classLabel,
    studentCount: profiles.length,
    completedCount: withData.length,
    genderBreakdown: gender,
    gradeDistribution: grade,
    avgScores,
    avgQol,
    avgLearning,
    commonStrengths,
    commonChallenges,
    studentsAtRisk,
    studentProfiles: profiles,
  };
}

export const DOMAIN_LABELS_HE = SECTION_LABELS;
export const OPEN_LABELS_HE = OPEN_QUESTION_LABELS;