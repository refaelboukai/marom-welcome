import { IntakeSession } from "./types";
import { buildStudentProfile } from "./class-aggregations";
import { getStudentGender } from "./gender-utils";

export interface OptStudent {
  id: string;
  name: string;
  grade: string;
  gender: "male" | "female" | "unknown";
  conduct: number | null; // 1..5
  sensory: number | null; // 1..5 (5 = robust)
  risk: number;
  anchor: boolean;
  avoid: string[];
  prefer: string[];
}

export interface OptClass {
  key: string;
  label: string;
  teacherGrades: string[];
  capacity?: number;
}

export const toOptStudent = (s: IntakeSession): OptStudent => {
  const p = buildStudentProfile(s);
  const gender = s.gender === "male" || s.gender === "female" ? s.gender : getStudentGender(s.studentName);
  const conduct = p.conductMetrics && p.conductMetrics.average > 0 ? p.conductMetrics.average : null;
  const sensory = typeof p.sensorySensitivity === "number" && p.sensorySensitivity > 0 ? p.sensorySensitivity : null;
  return {
    id: s.id,
    name: s.studentName,
    grade: s.grade || "",
    gender: gender === "male" || gender === "female" ? gender : "unknown",
    conduct,
    sensory,
    risk: p.riskFlags.length,
    anchor: !!(conduct && conduct >= 4 && (p.scores?.qualityOfLife || 0) >= 4),
    avoid: s.relationships?.avoid || [],
    prefer: s.relationships?.prefer || [],
  };
};

const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);

export interface ClassHealth {
  key: string;
  score: number; // 0..100
  issues: string[];
  wins: string[];
  size: number;
  avgConduct: number | null;
  malePct: number;
}

export function classHealth(
  cls: OptClass,
  members: OptStudent[],
  avgSize: number,
  globalConduct: number | null
): ClassHealth {
  const n = members.length;
  const issues: string[] = [];
  const wins: string[] = [];
  let penalty = 0;

  const sizeGap = Math.abs(n - avgSize);
  if (n > 0 && sizeGap >= 2) {
    penalty += Math.min(22, sizeGap * 7);
    issues.push(n > avgSize ? `גדולה ב-${Math.round(sizeGap)} תלמידים מהממוצע` : `קטנה ב-${Math.round(sizeGap)} תלמידים מהממוצע`);
  } else if (n > 0) wins.push("גודל מאוזן");

  if (cls.capacity && n > cls.capacity) {
    penalty += (n - cls.capacity) * 9;
    issues.push(`חריגה מתקן הכיתה (${n}/${cls.capacity})`);
  }

  const males = members.filter((m) => m.gender === "male").length;
  const females = members.filter((m) => m.gender === "female").length;
  const known = males + females;
  const malePct = known ? males / known : 0.5;
  if (known >= 4) {
    const skew = Math.abs(malePct - 0.5);
    if (skew > 0.25) {
      penalty += Math.min(20, (skew - 0.25) * 90);
      issues.push(`הרכב מגדרי לא מאוזן (${males}♂ / ${females}♀)`);
    } else wins.push("איזון מגדרי טוב");
  }

  const conducts = members.map((m) => m.conduct).filter((v): v is number => v != null);
  const avgConduct = conducts.length ? Math.round(mean(conducts) * 100) / 100 : null;
  if (avgConduct != null && globalConduct != null) {
    const gap = Math.abs(avgConduct - globalConduct);
    if (gap > 0.35) {
      penalty += Math.min(18, gap * 26);
      issues.push(avgConduct < globalConduct ? "ריכוז גבוה של אתגרי התנהגות" : "פרופיל התנהגותי גבוה מהממוצע — הזדמנות לאיזון");
    } else wins.push("פרופיל התנהגותי דומה לשאר הכיתות");
  }

  const anchors = members.filter((m) => m.anchor).length;
  if (n >= 4 && anchors === 0) {
    penalty += 10;
    issues.push("אין תלמידי עוגן מייצבים");
  } else if (anchors > 0) wins.push(`${anchors} תלמידי עוגן`);

  const sensitive = members.filter((m) => m.sensory != null && m.sensory <= 2.5).length;
  if (sensitive >= 4) {
    penalty += 10;
    issues.push(`${sensitive} תלמידים רגישים חושית`);
  }

  const highRisk = members.filter((m) => m.risk >= 3).length;
  if (highRisk >= 3) {
    penalty += 10;
    issues.push(`${highRisk} תלמידים עם דגלי סיכון מרובים`);
  }

  const ids = new Set(members.map((m) => m.id));
  const conflicts = new Set<string>();
  members.forEach((m) => m.avoid.forEach((o) => { if (ids.has(o)) conflicts.add([m.id, o].sort().join("|")); }));
  if (conflicts.size) {
    penalty += conflicts.size * 14;
    issues.push(`${conflicts.size} התנגשויות כימיה חברתית`);
  }

  if (cls.teacherGrades.length) {
    const off = members.filter((m) => m.grade && !cls.teacherGrades.includes(m.grade)).length;
    if (off) {
      penalty += Math.min(15, off * 4);
      issues.push(`${off} תלמידים משכבה שאינה בשכבות המחנכת`);
    }
  }

  return {
    key: cls.key,
    score: Math.max(0, Math.min(100, Math.round(100 - penalty))),
    issues,
    wins,
    size: n,
    avgConduct,
    malePct,
  };
}

/** Total board cost — lower is better. */
function boardCost(classes: OptClass[], assign: Record<string, string>, byId: Record<string, OptStudent>): number {
  const avgSize = Object.values(assign).filter(Boolean).length / Math.max(classes.length, 1);
  const allConducts = Object.keys(assign)
    .filter((id) => assign[id])
    .map((id) => byId[id]?.conduct)
    .filter((v): v is number => v != null);
  const globalConduct = allConducts.length ? mean(allConducts) : null;
  let cost = 0;
  classes.forEach((c) => {
    const members = Object.keys(assign).filter((id) => assign[id] === c.key).map((id) => byId[id]).filter(Boolean);
    cost += 100 - classHealth(c, members, avgSize, globalConduct).score;
  });
  // preferred pairs separated
  Object.keys(assign).forEach((id) => {
    const s = byId[id];
    if (!s || !assign[id]) return;
    s.prefer.forEach((o) => {
      if (assign[o] && assign[o] !== assign[id]) cost += 3;
    });
  });
  return cost;
}

export interface BalanceResult {
  assign: Record<string, string>;
  moves: { id: string; name: string; from: string; to: string }[];
  before: number;
  after: number;
}

/**
 * Hill-climbing rebalance: tries single moves and pairwise swaps that lower the
 * total board cost. Only students already assigned to a class participate,
 * unless includeUnassigned is set.
 */
export function autoBalance(
  classes: OptClass[],
  students: OptStudent[],
  current: Record<string, string>,
  opts: { includeUnassigned?: boolean; maxMoves?: number } = {}
): BalanceResult {
  const byId: Record<string, OptStudent> = {};
  students.forEach((s) => { byId[s.id] = s; });
  const pool = students.filter((s) => (opts.includeUnassigned ? true : !!current[s.id]));
  const assign: Record<string, string> = {};
  students.forEach((s) => { assign[s.id] = current[s.id] || ""; });

  const before = boardCost(classes, assign, byId);
  const maxMoves = opts.maxMoves ?? 40;
  const original = { ...assign };
  let cost = before;

  for (let iter = 0; iter < maxMoves; iter++) {
    let best: { type: "move" | "swap"; a: string; b?: string; to?: string; gain: number } | null = null;

    for (const s of pool) {
      for (const c of classes) {
        if (assign[s.id] === c.key) continue;
        const prev = assign[s.id];
        assign[s.id] = c.key;
        const next = boardCost(classes, assign, byId);
        assign[s.id] = prev;
        const gain = cost - next;
        if (gain > 0.5 && (!best || gain > best.gain)) best = { type: "move", a: s.id, to: c.key, gain };
      }
    }

    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        const a = pool[i].id, b = pool[j].id;
        if (assign[a] === assign[b]) continue;
        const pa = assign[a], pb = assign[b];
        assign[a] = pb; assign[b] = pa;
        const next = boardCost(classes, assign, byId);
        assign[a] = pa; assign[b] = pb;
        const gain = cost - next;
        if (gain > 0.5 && (!best || gain > best.gain)) best = { type: "swap", a, b, gain };
      }
    }

    if (!best) break;
    if (best.type === "move" && best.to) assign[best.a] = best.to;
    if (best.type === "swap" && best.b) {
      const pa = assign[best.a];
      assign[best.a] = assign[best.b];
      assign[best.b] = pa;
    }
    cost -= best.gain;
  }

  const labelOf = (k: string) => (k ? classes.find((c) => c.key === k)?.label || k : "ללא שיוך");
  const moves = students
    .filter((s) => (original[s.id] || "") !== (assign[s.id] || ""))
    .map((s) => ({ id: s.id, name: s.name, from: labelOf(original[s.id] || ""), to: labelOf(assign[s.id] || "") }));

  return { assign, moves, before: Math.round(before), after: Math.round(cost) };
}

export interface FitSuggestion {
  classKey: string;
  label: string;
  score: number; // 0..100 fit
  reasons: string[];
}

/** Rank classes for a single student. */
export function bestFit(
  student: OptStudent,
  classes: OptClass[],
  members: Record<string, OptStudent[]>
): FitSuggestion[] {
  const sizes = classes.map((c) => (members[c.key] || []).length);
  const avgSize = sizes.length ? mean(sizes) : 0;
  const allConducts = classes.flatMap((c) => (members[c.key] || []).map((m) => m.conduct)).filter((v): v is number => v != null);
  const globalConduct = allConducts.length ? mean(allConducts) : null;

  return classes
    .map((c) => {
      const list = members[c.key] || [];
      const withStudent = [...list, student];
      const base = classHealth(c, list, avgSize, globalConduct).score;
      const after = classHealth(c, withStudent, avgSize, globalConduct).score;
      const reasons: string[] = [];
      let score = 55 + (after - base);

      if (student.grade && c.teacherGrades.length) {
        if (c.teacherGrades.includes(student.grade)) { score += 18; reasons.push(`שכבה ${student.grade} תואמת למחנכת`); }
        else { score -= 22; reasons.push("שכבה שאינה בשכבות המחנכת"); }
      }
      const conflict = list.filter((m) => student.avoid.includes(m.id) || m.avoid.includes(student.id));
      if (conflict.length) { score -= 45; reasons.push(`התנגשות עם ${conflict.map((m) => m.name).join(", ")}`); }
      const friends = list.filter((m) => student.prefer.includes(m.id) || m.prefer.includes(student.id));
      if (friends.length) { score += 14; reasons.push(`יחד עם ${friends.map((m) => m.name).join(", ")}`); }

      if (list.length < avgSize) { score += 8; reasons.push("כיתה מתחת לגודל הממוצע"); }
      if (c.capacity && list.length >= c.capacity) { score -= 25; reasons.push("הכיתה בתקן מלא"); }

      if (student.conduct != null && student.conduct <= 2.5) {
        const anchors = list.filter((m) => m.anchor).length;
        if (anchors >= 2) { score += 10; reasons.push("יש בכיתה עוגנים מייצבים"); }
        const challenged = list.filter((m) => m.conduct != null && m.conduct <= 2.5).length;
        if (challenged >= 3) { score -= 14; reasons.push("ריכוז גבוה של אתגרי התנהגות"); }
      }
      if (student.sensory != null && student.sensory <= 2.5) {
        const sensitive = list.filter((m) => m.sensory != null && m.sensory <= 2.5).length;
        if (sensitive >= 3) { score -= 12; reasons.push("כיתה עם עומס חושי"); }
      }
      const g = student.gender;
      if (g !== "unknown") {
        const same = list.filter((m) => m.gender === g).length;
        const known = list.filter((m) => m.gender !== "unknown").length;
        if (known >= 4 && same / known > 0.7) { score -= 10; reasons.push("יעמיק את חוסר האיזון המגדרי"); }
      }

      return { classKey: c.key, label: c.label, score: Math.max(0, Math.min(100, Math.round(score))), reasons: reasons.slice(0, 4) };
    })
    .sort((a, b) => b.score - a.score);
}