import { IntakeSession, SECTION_LABELS } from "@/lib/types";
import { calculateScores } from "@/lib/scoring";
import { AssessmentRound } from "@/lib/supabase-storage";

type SemesterType = "semester_a" | "semester_b" | "annual";

const SEMESTER_LABELS: Record<SemesterType, string> = {
  semester_a: "מחצית א׳",
  semester_b: "מחצית ב׳",
  annual: "סיכום שנתי",
};

/** Positive, growth-oriented interpretation — no score labels */
function getPositiveInterpretation(score: number, domain: string): string {
  const map: Record<string, { high: string; mid: string; growing: string; emerging: string }> = {
    qualityOfLife: {
      high: "מביע/ה שביעות רצון ותחושת רווחה בתחומי חיים מגוונים — חברתי, רגשי ולימודי. זהו בסיס חשוב להמשך צמיחה.",
      mid: "מזהה תחומים בהם מרגיש/ה טוב לצד תחומים שבהם שואף/ת להתפתח. הליווי מאפשר חיזוק המשאבים הקיימים.",
      growing: "נמצא/ת בתהליך של בניית תחושת רווחה. עם ליווי מתאים וחוויות חיוביות, ניתן לחזק את תחושת השייכות והסיפוק.",
      emerging: "מתחיל/ה לזהות צרכים בתחומי חיים שונים. זוהי נקודת מוצא חשובה לבניית תכנית ליווי אישית.",
    },
    selfEfficacy: {
      high: "מאמין/ה ביכולתו/ה להתמודד עם אתגרים ולהצליח. תחושת מסוגלות זו מהווה משאב משמעותי לקידום בכל תחום.",
      mid: "מפתח/ת את תחושת המסוגלות ומתחיל/ה לזהות חוזקות אישיות. חיזוק חוויות הצלחה יתמוך בהמשך ההתקדמות.",
      growing: "נמצא/ת בדרך לבניית ביטחון ביכולותיו/ה. משימות הדרגתיות עם חוויות הצלחה יסייעו לחזק את תחושת המסוגלות.",
      emerging: "בתחילת הדרך של גילוי היכולות. ליווי אישי המדגיש הצלחות קטנות יבנה בהדרגה את הביטחון העצמי.",
    },
    locusOfControl: {
      high: "חש/ה שיש לו/ה השפעה על מה שקורה ומקשר/ת בין מאמץ לתוצאות. תפיסה זו מחזקת מוטיבציה ואחריות אישית.",
      mid: "מתחיל/ה לזהות קשרים בין פעולות לתוצאות. חיזוק תחושת השליטה יתמוך ביוזמה עצמית ובמוטיבציה.",
      growing: "בתהליך של פיתוח תחושת שליטה. מתן הזדמנויות לבחירה וקבלת החלטות יחזק את תחושת ההשפעה.",
      emerging: "לומד/ת לזהות את ההשפעה על סביבתו/ה. ליווי שמדגיש קשר בין מאמץ לתוצאה יבנה תחושת משמעות ושליטה.",
    },
    cognitiveFlexibility: {
      high: "מגלה יכולת לחשוב על חלופות ולהסתגל למצבים שונים. גמישות זו מהווה כלי חשוב להתמודדות יעילה.",
      mid: "מפתח/ת את יכולת החשיבה הגמישה ולומד/ת לשקול אפשרויות שונות. תרגול ממוקד יחזק מיומנות חשובה זו.",
      growing: "בתהליך של הרחבת דרכי החשיבה. חשיפה למצבים מגוונים ותרגול פתרון בעיות יתמכו בפיתוח הגמישות.",
      emerging: "מתחיל/ה להכיר דרכי חשיבה חדשות. ליווי שמעודד הסתכלות ממספר זוויות יסייע בפיתוח חשיבה יצירתית ופתוחה.",
    },
    learningCharacteristics: {
      high: "מגלה תפקודי למידה אדפטיביים: זיכרון עבודה, ארגון, ויסות רגשי וחושי. מהווה בסיס מצוין ללמידה עצמאית ומשמעותית.",
      mid: "מפתח/ת מיומנויות למידה והתאמות אישיות. שילוב עזרים ויזואליים, פירוק משימות וצ'קליסטים יחזק את התפקוד.",
      growing: "מזהה צרכים אישיים בלמידה. התאמות פדגוגיות — הפסקות תנועה, אביזרי תחושה וחיבור רלוונטי לתוכן — יתמכו בהתקדמות.",
      emerging: "זקוק/ה להתאמות פדגוגיות ייעודיות לפי האשכולות הנוירו-פדגוגיים. ליווי אישי ושיתוף הצוות יבנו מסגרת למידה מותאמת.",
    },
  };

  const d = map[domain] || map.qualityOfLife;
  if (score < 0) return "טרם נאספו מספיק נתונים בתחום זה. המשך המעקב יאפשר תמונה מלאה יותר.";
  if (score >= 4.0) return d.high;
  if (score >= 3.0) return d.mid;
  if (score >= 2.0) return d.growing;
  return d.emerging;
}

/** Positive trend description */
function getPositiveTrendLabel(change: number): string {
  if (change > 0.5) return "נראית התקדמות משמעותית — יש להמשיך ולחזק את הכיוון";
  if (change > 0.2) return "ניכרת התקדמות חיובית";
  if (change > 0) return "ניכרת מגמה חיובית עדינה";
  if (change < -0.5) return "תחום זה מצריך תשומת לב מוגברת וליווי ממוקד";
  if (change < -0.2) return "תחום זה דורש חיזוק — מומלץ להתמקד בו בתקופה הקרובה";
  if (change < 0) return "תחום זה יכול להרוויח מתשומת לב נוספת";
  return "יציבות בתחום זה — ניתן לשאוף להתקדמות נוספת";
}

function getTrendArrow(change: number): string {
  if (change > 0.3) return "⬆️";
  if (change > 0) return "↗️";
  if (change < -0.3) return "🔄";
  if (change < 0) return "🔄";
  return "➡️";
}

export function generateSemesterSummary(
  session: IntakeSession,
  rounds: AssessmentRound[],
  semesterType: SemesterType
): string {
  const intakeScores = calculateScores(session.studentResponses, session.parentResponses);
  
  const completedRounds = rounds
    .filter(r => Object.keys(r.student_responses).length > 0 || Object.keys(r.parent_responses).length > 0)
    .sort((a, b) => a.round_number - b.round_number);

  const domains = [
    { key: "qualityOfLife" as const, label: SECTION_LABELS.quality_of_life },
    { key: "selfEfficacy" as const, label: SECTION_LABELS.self_efficacy },
    { key: "locusOfControl" as const, label: SECTION_LABELS.locus_of_control },
    { key: "cognitiveFlexibility" as const, label: SECTION_LABELS.cognitive_flexibility },
    { key: "learningCharacteristics" as const, label: SECTION_LABELS.learning_characteristics },
  ];

  let relevantRounds: AssessmentRound[];
  if (semesterType === "semester_a") {
    relevantRounds = completedRounds.slice(0, Math.ceil(completedRounds.length / 2));
  } else if (semesterType === "semester_b") {
    relevantRounds = completedRounds.slice(Math.ceil(completedRounds.length / 2));
  } else {
    relevantRounds = completedRounds;
  }

  const latestRound = relevantRounds.length > 0 ? relevantRounds[relevantRounds.length - 1] : null;
  const latestScores = latestRound 
    ? calculateScores(latestRound.student_responses as Record<string, number>, latestRound.parent_responses as Record<string, number>)
    : null;

  const trends = domains.map(d => {
    const intake = intakeScores[d.key].normalized;
    const latest = latestScores ? latestScores[d.key].normalized : intake;
    const change = (intake >= 0 && latest >= 0) ? latest - intake : 0;
    return { ...d, intake, latest, change };
  });

  const dateStr = new Date().toLocaleDateString("he-IL");
  const semesterLabel = SEMESTER_LABELS[semesterType];

  let summary = `סיכום רגשי-חברתי — ${semesterLabel}\n`;
  summary += `${session.studentName} | כיתה ${session.grade || "—"} | ${dateStr}\n`;
  summary += `${"─".repeat(40)}\n\n`;

  for (const t of trends) {
    summary += `${getTrendArrow(t.change)} ${t.label}\n`;
    summary += `   ${getPositiveInterpretation(t.latest, t.key)}\n`;
    if (t.intake >= 0 && t.latest >= 0 && Math.abs(t.change) > 0.01) {
      summary += `   ${getPositiveTrendLabel(t.change)}\n`;
    }
    summary += `\n`;
  }

  // Overall
  const validTrends = trends.filter(t => t.intake >= 0 && t.latest >= 0);
  if (validTrends.length > 0) {
    const avgChange = validTrends.reduce((s, t) => s + t.change, 0) / validTrends.length;
    summary += `${"─".repeat(40)}\n`;
    if (avgChange > 0.2) {
      summary += `📈 סיכום: ניכרת מגמת התקדמות חיובית עם צמיחה והתפתחות.\n`;
    } else if (avgChange > 0) {
      summary += `📈 סיכום: נראים ניצנים של התקדמות. המשך הליווי יתמוך בהעמקת השינוי.\n`;
    } else if (avgChange > -0.2) {
      summary += `📈 סיכום: נשמרת יציבות. ניתן להתמקד בתחומים ספציפיים לקידום.\n`;
    } else {
      summary += `📈 סיכום: ישנם תחומים שמצריכים חיזוק וליווי. עם תכנית ממוקדת, ניתן לקדם התפתחות משמעותית.\n`;
    }
  }

  // Highlights
  const strengths = trends.filter(t => t.latest >= 4.0);
  const improved = validTrends.filter(t => t.change > 0.2);
  const needsAttention = validTrends.filter(t => t.change < -0.2);

  if (strengths.length > 0) {
    summary += `\n💪 חוזקות בולטות: ${strengths.map(t => t.label).join(", ")}\n`;
  }
  if (improved.length > 0) {
    summary += `✅ תחומים בהתקדמות: ${improved.map(t => t.label).join(", ")}\n`;
  }
  if (needsAttention.length > 0) {
    summary += `🎯 תחומי מיקוד לתקופה הקרובה: ${needsAttention.map(t => t.label).join(", ")}\n`;
  }

  return summary;
}

export { SEMESTER_LABELS, type SemesterType };
