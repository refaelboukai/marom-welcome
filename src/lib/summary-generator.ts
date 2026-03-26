import { IntakeSession, SECTION_LABELS } from "@/lib/types";
import { calculateScores, getScoreLabel } from "@/lib/scoring";
import { getScoreInterpretation } from "@/lib/domain-descriptions";
import { AssessmentRound } from "@/lib/supabase-storage";

type SemesterType = "semester_a" | "semester_b" | "annual";

const SEMESTER_LABELS: Record<SemesterType, string> = {
  semester_a: "מחצית א׳",
  semester_b: "מחצית ב׳",
  annual: "סיכום שנתי",
};

interface DomainTrend {
  label: string;
  intakeScore: number;
  latestScore: number;
  change: number;
  arrow: string;
  interpretation: string;
}

function getTrendArrow(change: number): string {
  if (change > 0.3) return "⬆️";
  if (change > 0) return "↗️";
  if (change < -0.3) return "⬇️";
  if (change < 0) return "↘️";
  return "➡️";
}

function getTrendLabel(change: number): string {
  if (change > 0.5) return "שיפור משמעותי";
  if (change > 0.2) return "שיפור";
  if (change > 0) return "שיפור קל";
  if (change < -0.5) return "ירידה משמעותית";
  if (change < -0.2) return "ירידה";
  if (change < 0) return "ירידה קלה";
  return "ללא שינוי";
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
    { key: "qualityOfLife" as const, label: SECTION_LABELS.quality_of_life, domainKey: "qualityOfLife" },
    { key: "selfEfficacy" as const, label: SECTION_LABELS.self_efficacy, domainKey: "selfEfficacy" },
    { key: "locusOfControl" as const, label: SECTION_LABELS.locus_of_control, domainKey: "locusOfControl" },
    { key: "cognitiveFlexibility" as const, label: SECTION_LABELS.cognitive_flexibility, domainKey: "cognitiveFlexibility" },
  ];

  // Determine which rounds belong to this semester
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

  const trends: DomainTrend[] = domains.map(d => {
    const intake = intakeScores[d.key].normalized;
    const latest = latestScores ? latestScores[d.key].normalized : intake;
    const change = (intake >= 0 && latest >= 0) ? latest - intake : 0;
    return {
      label: d.label,
      intakeScore: intake,
      latestScore: latest,
      change,
      arrow: getTrendArrow(change),
      interpretation: getScoreInterpretation(latest, d.domainKey),
    };
  });

  const fmt = (n: number) => n >= 0 ? n.toFixed(2) : "—";
  const dateStr = new Date().toLocaleDateString("he-IL");
  const semesterLabel = SEMESTER_LABELS[semesterType];

  let summary = `📋 ${semesterLabel} — ${session.studentName}\n`;
  summary += `כיתה: ${session.grade || "—"} | תאריך: ${dateStr}\n`;
  summary += `${"─".repeat(40)}\n\n`;

  // Scores table
  summary += `📊 ציונים ומגמות:\n\n`;
  for (const t of trends) {
    summary += `${t.arrow} ${t.label}\n`;
    summary += `   קליטה: ${fmt(t.intakeScore)} → עכשיו: ${fmt(t.latestScore)}`;
    if (t.intakeScore >= 0 && t.latestScore >= 0) {
      const changeStr = t.change > 0 ? `+${t.change.toFixed(2)}` : t.change.toFixed(2);
      summary += ` (${changeStr}, ${getTrendLabel(t.change)})`;
    }
    summary += `\n   ${t.interpretation}\n\n`;
  }

  // Overall trend
  const validTrends = trends.filter(t => t.intakeScore >= 0 && t.latestScore >= 0);
  if (validTrends.length > 0) {
    const avgChange = validTrends.reduce((s, t) => s + t.change, 0) / validTrends.length;
    summary += `${"─".repeat(40)}\n`;
    summary += `📈 מגמה כללית: ${getTrendArrow(avgChange)} ${getTrendLabel(avgChange)} (${avgChange > 0 ? "+" : ""}${avgChange.toFixed(2)})\n`;
  }

  // Strengths and areas
  const strengths = trends.filter(t => t.latestScore >= 4.0);
  const concerns = trends.filter(t => t.latestScore >= 0 && t.latestScore < 2.5);
  const improved = validTrends.filter(t => t.change > 0.2);
  const declined = validTrends.filter(t => t.change < -0.2);

  if (strengths.length > 0) {
    summary += `\n💪 חוזקות: ${strengths.map(t => t.label).join(", ")}\n`;
  }
  if (concerns.length > 0) {
    summary += `⚠️ דורש תשומת לב: ${concerns.map(t => t.label).join(", ")}\n`;
  }
  if (improved.length > 0) {
    summary += `✅ שיפור: ${improved.map(t => `${t.label} (${t.change > 0 ? "+" : ""}${t.change.toFixed(2)})`).join(", ")}\n`;
  }
  if (declined.length > 0) {
    summary += `🔻 ירידה: ${declined.map(t => `${t.label} (${t.change.toFixed(2)})`).join(", ")}\n`;
  }

  // Rounds info
  if (completedRounds.length > 0) {
    summary += `\n📝 סבבי הערכה שבוצעו: ${completedRounds.length}\n`;
    for (const r of completedRounds) {
      const rDate = new Date(r.created_at).toLocaleDateString("he-IL");
      summary += `   • ${r.round_label} (${rDate})\n`;
    }
  }

  return summary;
}

export { SEMESTER_LABELS, type SemesterType };
