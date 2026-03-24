import { questionnaireItems } from "@/data/questionnaires";
import { DomainScore, QuestionnaireSection, RiskFlag, ScoreResults } from "./types";

function scoreItem(value: number, isReverse: boolean): number {
  return isReverse ? 6 - value : value;
}

function calcDomainScore(
  section: QuestionnaireSection,
  studentResponses: Record<string, number>,
  parentResponses: Record<string, number>
): DomainScore {
  const items = questionnaireItems.filter((i) => i.section === section);
  const studentValues: number[] = [];
  const parentValues: number[] = [];

  for (const item of items) {
    if (studentResponses[item.id] != null) {
      studentValues.push(scoreItem(studentResponses[item.id], item.isReverse));
    }
    if (parentResponses[item.id] != null) {
      parentValues.push(scoreItem(parentResponses[item.id], item.isReverse));
    }
  }

  const studentAvg = studentValues.length > 0 ? studentValues.reduce((a, b) => a + b, 0) / studentValues.length : 0;
  const parentAvg = parentValues.length > 0 ? parentValues.reduce((a, b) => a + b, 0) / parentValues.length : 0;

  const allValues = [...studentValues, ...parentValues];
  const rawAvg = allValues.length > 0 ? allValues.reduce((a, b) => a + b, 0) / allValues.length : 0;

  const totalAnswered = studentValues.length + parentValues.length;
  const totalPossible = items.length * 2;

  return {
    raw: Math.round(rawAvg * 100) / 100,
    normalized: Math.round(((rawAvg - 1) / 4) * 100),
    completionRate: Math.round((totalAnswered / totalPossible) * 100),
    studentNormalized: studentValues.length > 0 ? Math.round(((studentAvg - 1) / 4) * 100) : -1,
    parentNormalized: parentValues.length > 0 ? Math.round(((parentAvg - 1) / 4) * 100) : -1,
  };
}

export function calculateScores(
  studentResponses: Record<string, number>,
  parentResponses: Record<string, number>
): ScoreResults {
  return {
    qualityOfLife: calcDomainScore("quality_of_life", studentResponses, parentResponses),
    selfEfficacy: calcDomainScore("self_efficacy", studentResponses, parentResponses),
    locusOfControl: calcDomainScore("locus_of_control", studentResponses, parentResponses),
    cognitiveFlexibility: calcDomainScore("cognitive_flexibility", studentResponses, parentResponses),
  };
}

export function generateRiskFlags(scores: ScoreResults): RiskFlag[] {
  const flags: RiskFlag[] = [];

  if (scores.qualityOfLife.normalized > 0 && scores.qualityOfLife.normalized < 30) {
    flags.push({ domain: "איכות חיים", severity: "concern", message: "ציון איכות חיים נמוך — מומלץ בירור נוסף ושיח אישי" });
  }
  if (scores.selfEfficacy.normalized > 0 && scores.selfEfficacy.normalized < 25) {
    flags.push({ domain: "מסוגלות עצמית", severity: "urgent", message: "מסוגלות עצמית נמוכה מאוד — דורש תשומת לב מיידית" });
  }
  if (scores.locusOfControl.normalized > 0 && scores.locusOfControl.normalized < 25) {
    flags.push({ domain: "מיקוד שליטה", severity: "concern", message: "מיקוד שליטה חיצוני חזק — ייתכן שהתלמיד חווה חוסר אונים" });
  }
  if (scores.cognitiveFlexibility.normalized > 0 && scores.cognitiveFlexibility.normalized < 25) {
    flags.push({ domain: "גמישות קוגניטיבית", severity: "concern", message: "קושי בגמישות קוגניטיבית — מומלץ בירור נוסף" });
  }

  // Discrepancy check
  const sections = [
    { key: "qualityOfLife" as const, label: "איכות חיים" },
    { key: "selfEfficacy" as const, label: "מסוגלות עצמית" },
    { key: "locusOfControl" as const, label: "מיקוד שליטה" },
    { key: "cognitiveFlexibility" as const, label: "גמישות קוגניטיבית" },
  ];

  for (const { key, label } of sections) {
    const s = scores[key];
    if (s.studentNormalized >= 0 && s.parentNormalized >= 0) {
      const gap = Math.abs(s.studentNormalized - s.parentNormalized);
      if (gap > 30) {
        flags.push({
          domain: label,
          severity: "attention",
          message: `פער משמעותי (${gap} נקודות) בין תפיסת התלמיד להורה ב${label} — מומלץ שיח משותף`,
        });
      }
    }
  }

  // Combined patterns
  if (
    scores.selfEfficacy.normalized > 0 &&
    scores.selfEfficacy.normalized < 35 &&
    scores.locusOfControl.normalized > 0 &&
    scores.locusOfControl.normalized < 35
  ) {
    flags.push({
      domain: "דפוס משולב",
      severity: "urgent",
      message: "מסוגלות עצמית נמוכה בשילוב מיקוד שליטה חיצוני — ייתכן שהתלמיד חווה קושי להאמין ביכולתו להשפיע ולהצליח",
    });
  }

  return flags;
}

export function getScoreLabel(normalized: number): string {
  if (normalized < 0) return "לא זמין";
  if (normalized < 25) return "נמוך";
  if (normalized < 50) return "מתחת לממוצע";
  if (normalized < 75) return "ממוצע";
  return "גבוה";
}

export function getScoreColor(normalized: number): string {
  if (normalized < 0) return "text-muted-foreground";
  if (normalized < 25) return "text-destructive";
  if (normalized < 50) return "text-warning";
  if (normalized < 75) return "text-foreground";
  return "text-success";
}
