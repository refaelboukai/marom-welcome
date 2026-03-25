import { questionnaireItems } from "@/data/questionnaires";
import { DomainScore, GASGoal, InsightResult, QuestionnaireSection, RiskFlag, ScoreResults } from "./types";

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

  const studentAvg = studentValues.length > 0 ? studentValues.reduce((a, b) => a + b, 0) / studentValues.length : -1;
  const parentAvg = parentValues.length > 0 ? parentValues.reduce((a, b) => a + b, 0) / parentValues.length : -1;

  const allValues = [...studentValues, ...parentValues];
  const rawAvg = allValues.length > 0 ? allValues.reduce((a, b) => a + b, 0) / allValues.length : -1;

  const totalAnswered = studentValues.length + parentValues.length;
  const totalPossible = items.length * 2;

  const round2 = (v: number) => Math.round(v * 100) / 100;

  return {
    raw: rawAvg >= 0 ? round2(rawAvg) : -1,
    normalized: rawAvg >= 0 ? round2(rawAvg) : -1,
    completionRate: Math.round((totalAnswered / totalPossible) * 100),
    studentNormalized: studentAvg >= 0 ? round2(studentAvg) : -1,
    parentNormalized: parentAvg >= 0 ? round2(parentAvg) : -1,
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

export function calculateQoLSubdomains(
  studentResponses: Record<string, number>,
  parentResponses: Record<string, number>
): Record<string, DomainScore> {
  const subdomains = ["general_wellbeing", "social", "emotional", "independence", "academic", "health_lifestyle", "family_support", "self_view"];
  const result: Record<string, DomainScore> = {};

  for (const sub of subdomains) {
    const items = questionnaireItems.filter(i => i.section === "quality_of_life" && i.subdomain === sub);
    if (items.length === 0) continue;

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

    const studentAvg = studentValues.length > 0 ? studentValues.reduce((a, b) => a + b, 0) / studentValues.length : -1;
    const parentAvg = parentValues.length > 0 ? parentValues.reduce((a, b) => a + b, 0) / parentValues.length : -1;
    const allValues = [...studentValues, ...parentValues];
    const rawAvg = allValues.length > 0 ? allValues.reduce((a, b) => a + b, 0) / allValues.length : -1;
    const round2 = (v: number) => Math.round(v * 100) / 100;

    result[sub] = {
      raw: rawAvg >= 0 ? round2(rawAvg) : -1,
      normalized: rawAvg >= 0 ? round2(rawAvg) : -1,
      completionRate: Math.round(((studentValues.length + parentValues.length) / (items.length * 2)) * 100),
      studentNormalized: studentAvg >= 0 ? round2(studentAvg) : -1,
      parentNormalized: parentAvg >= 0 ? round2(parentAvg) : -1,
    };
  }

  return result;
}

export function generateRiskFlags(scores: ScoreResults): RiskFlag[] {
  const flags: RiskFlag[] = [];

  if (scores.qualityOfLife.normalized > 0 && scores.qualityOfLife.normalized < 2.5) {
    flags.push({ domain: "איכות חיים", severity: "concern", message: "ציון איכות חיים נמוך — מומלץ בירור נוסף ושיח אישי" });
  }
  if (scores.selfEfficacy.normalized > 0 && scores.selfEfficacy.normalized < 2.0) {
    flags.push({ domain: "מסוגלות עצמית", severity: "urgent", message: "מסוגלות עצמית נמוכה מאוד — דורש תשומת לב מיידית" });
  }
  if (scores.locusOfControl.normalized > 0 && scores.locusOfControl.normalized < 2.0) {
    flags.push({ domain: "מיקוד שליטה", severity: "concern", message: "מיקוד שליטה חיצוני חזק — ייתכן שהתלמיד חווה חוסר אונים" });
  }
  if (scores.cognitiveFlexibility.normalized > 0 && scores.cognitiveFlexibility.normalized < 2.0) {
    flags.push({ domain: "גמישות קוגניטיבית", severity: "concern", message: "קושי בגמישות קוגניטיבית — מומלץ בירור נוסף" });
  }

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
      if (gap > 1.2) {
        flags.push({
          domain: label,
          severity: "attention",
          message: `פער משמעותי (${gap.toFixed(1)}) בין תפיסת התלמיד להורה ב${label} — מומלץ שיח משותף`,
        });
      }
    }
  }

  if (
    scores.selfEfficacy.normalized > 0 && scores.selfEfficacy.normalized < 2.5 &&
    scores.locusOfControl.normalized > 0 && scores.locusOfControl.normalized < 2.5
  ) {
    flags.push({
      domain: "דפוס משולב",
      severity: "urgent",
      message: "ייתכן שהתלמיד חווה קושי להאמין ביכולתו להשפיע על מצבו ולהצליח באופן עקבי",
    });
  }

  if (scores.cognitiveFlexibility.normalized > 0 && scores.cognitiveFlexibility.normalized < 2.5) {
    flags.push({
      domain: "גמישות חשיבה",
      severity: "attention",
      message: "ייתכן קושי בחשיבה על חלופות, בשינוי נקודת מבט ובהתמודדות עם מצבים מורכבים",
    });
  }

  const seen = new Set<string>();
  return flags.filter((f) => {
    const k = f.domain + f.severity;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function generateInsights(scores: ScoreResults): InsightResult {
  const strengths: string[] = [];
  const areasForSupport: string[] = [];
  const discrepancies: string[] = [];
  const recommendations: string[] = [];

  const domains = [
    { key: "qualityOfLife" as const, label: "איכות חיים" },
    { key: "selfEfficacy" as const, label: "מסוגלות עצמית" },
    { key: "locusOfControl" as const, label: "מיקוד שליטה" },
    { key: "cognitiveFlexibility" as const, label: "גמישות קוגניטיבית" },
  ];

  for (const { key, label } of domains) {
    const s = scores[key];
    if (s.normalized >= 4.0) {
      strengths.push(`${label} — ציון גבוה (${s.normalized}), מהווה משאב משמעותי`);
    } else if (s.normalized >= 0 && s.normalized < 2.5) {
      areasForSupport.push(`${label} — ציון נמוך (${s.normalized}), דורש תמיכה וחיזוק`);
    }

    if (s.studentNormalized >= 0 && s.parentNormalized >= 0) {
      const gap = Math.abs(s.studentNormalized - s.parentNormalized);
      if (gap > 1.0) {
        const who = s.studentNormalized > s.parentNormalized ? "התלמיד מדווח גבוה יותר מההורה" : "ההורה מדווח גבוה יותר מהתלמיד";
        discrepancies.push(`${label}: ${who} (פער ${gap.toFixed(1)}) — מומלץ העמקה`);
      }
    }
  }

  if (scores.selfEfficacy.normalized >= 0 && scores.selfEfficacy.normalized < 2.5) {
    recommendations.push("חיזוק תחושת מסוגלות באמצעות משימות הדרגתיות עם חוויות הצלחה");
  }
  if (scores.locusOfControl.normalized >= 0 && scores.locusOfControl.normalized < 2.5) {
    recommendations.push("עבודה על העצמה ותחושת שליטה — מתן בחירות וחיזוק אחריות אישית");
  }
  if (scores.cognitiveFlexibility.normalized >= 0 && scores.cognitiveFlexibility.normalized < 2.5) {
    recommendations.push("תרגול אסטרטגיות חשיבה גמישה, פתרון בעיות ונקיטת פרספקטיבה");
  }
  if (scores.qualityOfLife.normalized >= 0 && scores.qualityOfLife.normalized < 2.5) {
    recommendations.push("בירור מעמיק של תחומי איכות חיים — חברתי, רגשי, לימודי ומשפחתי");
  }
  if (discrepancies.length > 0) {
    recommendations.push("שיח משותף עם התלמיד וההורה לגבי פערים בתפיסה");
  }

  const validDomains = domains.filter(({ key }) => scores[key].normalized >= 0);
  const avgScore = validDomains.length > 0
    ? validDomains.reduce((sum, { key }) => sum + scores[key].normalized, 0) / validDomains.length
    : -1;

  let summary: string;
  if (avgScore >= 4.0) {
    summary = "התלמיד מציג תמונה כללית חיובית ברוב התחומים. קיימים משאבים רגשיים ואישיותיים משמעותיים.";
  } else if (avgScore >= 3.0) {
    summary = "התלמיד מציג תמונה מעורבת. ישנם תחומים בהם קיימים משאבים לצד תחומים הדורשים תשומת לב וליווי.";
  } else if (avgScore >= 0) {
    summary = "התלמיד מציג ציונים נמוכים במספר תחומים. מומלץ ליווי אישי ותכנית תמיכה ממוקדת.";
  } else {
    summary = "אין מספיק נתונים לסיכום.";
  }

  const interpretation = generateInterpretation(scores);

  return { summary, strengths, areasForSupport, discrepancies, recommendations, interpretation };
}

function generateInterpretation(scores: ScoreResults): string {
  const parts: string[] = [];

  if (scores.selfEfficacy.normalized >= 0 && scores.selfEfficacy.normalized < 2.5 &&
      scores.locusOfControl.normalized >= 0 && scores.locusOfControl.normalized < 2.5) {
    parts.push("ייתכן שהתלמיד חווה קושי להאמין ביכולתו להשפיע על מצבו ולהצליח באופן עקבי. שילוב של מסוגלות נמוכה עם מיקוד שליטה חיצוני עשוי להעיד על תחושת חוסר אונים.");
  }

  if (scores.cognitiveFlexibility.normalized >= 0 && scores.cognitiveFlexibility.normalized < 2.5) {
    parts.push("ייתכן קושי בחשיבה על חלופות, בשינוי נקודת מבט ובהתמודדות עם מצבים מורכבים או מלחיצים.");
  }

  if (scores.qualityOfLife.normalized >= 0 && scores.qualityOfLife.normalized < 2.5) {
    parts.push("ציון איכות החיים הנמוך עשוי להעיד על קושי בתחומים רגשיים, חברתיים או לימודיים. מומלץ בירור מעמיק.");
  }

  if (parts.length === 0) {
    parts.push("לא זוהו דפוסים מדאיגים מובהקים. מומלץ להמשיך ולעקוב.");
  }

  return parts.join("\n\n");
}

export function generateGASGoals(scores: ScoreResults): GASGoal[] {
  const goals: GASGoal[] = [];

  if (scores.selfEfficacy.normalized >= 0 && scores.selfEfficacy.normalized < 3.0) {
    goals.push({
      id: "gas_se",
      area: "מסוגלות עצמית",
      current: "התלמיד מביע קושי להאמין ביכולתו להצליח ולהתמודד עם אתגרים",
      level0: "התלמיד מזהה לפחות חוזקה אחת שלו ומסוגל לציין דוגמה להצלחה אישית",
      level1: "התלמיד מנסה משימות חדשות ביוזמה עצמית ומדווח על תחושת הצלחה",
      level2: "התלמיד מתמודד עם אתגרים באופן עצמאי ומביע ביטחון ביכולתו",
    });
  }

  if (scores.locusOfControl.normalized >= 0 && scores.locusOfControl.normalized < 3.0) {
    goals.push({
      id: "gas_loc",
      area: "מיקוד שליטה",
      current: "התלמיד נוטה לייחס אירועים לגורמים חיצוניים ולא חש שליטה על מצבו",
      level0: "התלמיד מזהה מצב אחד שבו יש לו השפעה על התוצאה",
      level1: "התלמיד מקבל החלטות עצמאיות בתחומים מוגדרים ומזהה קשר בין מאמץ לתוצאה",
      level2: "התלמיד מביע תחושת שליטה באופן עקבי ומקשר הצלחות למאמצים שלו",
    });
  }

  if (scores.cognitiveFlexibility.normalized >= 0 && scores.cognitiveFlexibility.normalized < 3.0) {
    goals.push({
      id: "gas_cf",
      area: "גמישות קוגניטיבית",
      current: "התלמיד מתקשה לשקול חלופות ולהגיב בצורה גמישה למצבים קשים",
      level0: "התלמיד מזהה לפחות שתי דרכי פעולה אפשריות במצב מוגדר",
      level1: "התלמיד שוקל חלופות לפני תגובה ומצליח לשנות כיוון חשיבה כשצריך",
      level2: "התלמיד מגיב בגמישות למצבים מורכבים ומביא פתרונות יצירתיים",
    });
  }

  if (scores.qualityOfLife.normalized >= 0 && scores.qualityOfLife.normalized < 3.0) {
    goals.push({
      id: "gas_qol",
      area: "איכות חיים ורווחה רגשית",
      current: "התלמיד מדווח על שביעות רצון נמוכה מתחומי חיים שונים",
      level0: "התלמיד מצליח לזהות ולמנות תחום אחד שבו הוא מרגיש טוב",
      level1: "התלמיד מדווח על שיפור בשני תחומי חיים לפחות (חברתי, לימודי, רגשי)",
      level2: "התלמיד מביע שביעות רצון כללית ומזהה משמעות בתחומים מרכזיים",
    });
  }

  return goals;
}

export function getTopFocusAreas(scores: ScoreResults): string[] {
  const areas: { label: string; score: number }[] = [
    { label: "מסוגלות עצמית", score: scores.selfEfficacy.normalized },
    { label: "מיקוד שליטה", score: scores.locusOfControl.normalized },
    { label: "גמישות קוגניטיבית", score: scores.cognitiveFlexibility.normalized },
    { label: "איכות חיים", score: scores.qualityOfLife.normalized },
  ].filter((a) => a.score >= 0);

  return areas.sort((a, b) => a.score - b.score).slice(0, 3).map((a) => `${a.label} (${a.score})`);
}

export function getScoreLabel(score: number): string {
  if (score < 0) return "לא זמין";
  if (score < 2.0) return "נמוך";
  if (score < 3.0) return "מתחת לממוצע";
  if (score < 4.0) return "ממוצע";
  return "גבוה";
}

export function getScoreColor(score: number): string {
  if (score < 0) return "text-muted-foreground";
  if (score < 2.0) return "text-destructive";
  if (score < 3.0) return "text-warning";
  if (score < 4.0) return "text-foreground";
  return "text-success";
}

export function detectStraightLining(responses: Record<string, number>): boolean {
  const values = Object.values(responses);
  if (values.length < 10) return false;
  const sameCount = values.filter((v) => v === values[0]).length;
  return sameCount / values.length > 0.85;
}

export function getCompletionPercentage(responses: Record<string, number>, total: number): number {
  return Math.round((Object.keys(responses).length / total) * 100);
}
