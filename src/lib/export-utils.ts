import { IntakeSession, SECTION_LABELS } from "@/lib/types";
import { calculateScores, getScoreLabel } from "@/lib/scoring";
import { questionnaireItems } from "@/data/questionnaires";
import * as XLSX from "xlsx";

export function exportToExcel(sessions: IntakeSession[], filename: string) {
  const rows = sessions.map((s) => {
    const scores = calculateScores(s.studentResponses, s.parentResponses);
    return {
      "שם תלמיד": s.studentName,
      "ת.ז.": s.studentIdNumber,
      "כיתה": s.grade,
      "סטטוס": s.status,
      "קבוצת כיתה": s.classGroup === "tali" ? "הכיתה של טלי" : s.classGroup === "eden" ? "הכיתה של עדן" : "",
      "איכות חיים - תלמיד": scores.qualityOfLife.studentNormalized >= 0 ? scores.qualityOfLife.studentNormalized : "",
      "איכות חיים - הורה": scores.qualityOfLife.parentNormalized >= 0 ? scores.qualityOfLife.parentNormalized : "",
      "איכות חיים - כללי": scores.qualityOfLife.normalized >= 0 ? scores.qualityOfLife.normalized : "",
      "מסוגלות - תלמיד": scores.selfEfficacy.studentNormalized >= 0 ? scores.selfEfficacy.studentNormalized : "",
      "מסוגלות - הורה": scores.selfEfficacy.parentNormalized >= 0 ? scores.selfEfficacy.parentNormalized : "",
      "מסוגלות - כללי": scores.selfEfficacy.normalized >= 0 ? scores.selfEfficacy.normalized : "",
      "מיקוד שליטה - תלמיד": scores.locusOfControl.studentNormalized >= 0 ? scores.locusOfControl.studentNormalized : "",
      "מיקוד שליטה - הורה": scores.locusOfControl.parentNormalized >= 0 ? scores.locusOfControl.parentNormalized : "",
      "מיקוד שליטה - כללי": scores.locusOfControl.normalized >= 0 ? scores.locusOfControl.normalized : "",
      "גמישות - תלמיד": scores.cognitiveFlexibility.studentNormalized >= 0 ? scores.cognitiveFlexibility.studentNormalized : "",
      "גמישות - הורה": scores.cognitiveFlexibility.parentNormalized >= 0 ? scores.cognitiveFlexibility.parentNormalized : "",
      "גמישות - כללי": scores.cognitiveFlexibility.normalized >= 0 ? scores.cognitiveFlexibility.normalized : "",
      "השלמת תלמיד %": Math.round((Object.keys(s.studentResponses).length / questionnaireItems.length) * 100),
      "השלמת הורה %": Math.round((Object.keys(s.parentResponses).length / questionnaireItems.length) * 100),
      "הערות צוות": s.adminNotes || "",
      "תאריך יצירה": new Date(s.createdAt).toLocaleDateString("he-IL"),
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "תלמידים");

  // Auto-width
  const colWidths = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length, ...rows.map((r) => String((r as any)[key]).length)) + 2,
  }));
  ws["!cols"] = colWidths;

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportCodesExcel(sessions: IntakeSession[]) {
  const rows = sessions.map((s) => ({
    "שם תלמיד": s.studentName,
    "כיתה": s.classGroup === "tali" ? "הכיתה של טלי" : s.classGroup === "eden" ? "הכיתה של עדן" : "",
    "קוד תלמיד": s.studentCode,
    "קוד הורה": s.parentCode,
    "קוד צוות": s.staffCode || "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "קודים");
  XLSX.writeFile(wb, "קודי_גישה.xlsx");
}
