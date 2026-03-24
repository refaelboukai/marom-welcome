import jsPDF from "jspdf";
import { IntakeSession, SECTION_LABELS } from "@/lib/types";
import { calculateScores, generateRiskFlags, generateInsights, getScoreLabel, getTopFocusAreas } from "@/lib/scoring";

// Register Heebo font (using built-in helvetica for now; Hebrew rendered as RTL text)
export function generateStudentPDF(session: IntakeSession, target: "staff" | "parent" = "staff") {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const scores = calculateScores(session.studentResponses, session.parentResponses);
  const riskFlags = generateRiskFlags(scores);
  const insights = generateInsights(scores);
  const focusAreas = getTopFocusAreas(scores);

  let y = 20;
  const pageWidth = 190;
  const rightX = 200;

  // Helper for RTL text
  const addRTL = (text: string, x: number, yPos: number, size = 10, style: "normal" | "bold" = "normal") => {
    doc.setFontSize(size);
    doc.setFont("helvetica", style);
    // Reverse for basic RTL display
    const lines = doc.splitTextToSize(text, pageWidth - 20);
    lines.forEach((line: string) => {
      doc.text(line, x, yPos, { align: "right" });
      yPos += size * 0.5;
    });
    return yPos;
  };

  const checkPage = (needed: number) => {
    if (y + needed > 270) {
      doc.addPage();
      y = 20;
    }
  };

  // Header
  doc.setDrawColor(80, 150, 120);
  doc.setLineWidth(0.5);
  doc.line(10, 15, 200, 15);

  y = addRTL("מרום בית אקשטיין — סיכום קליטה", rightX, y, 16, "bold");
  y += 4;
  y = addRTL(`תלמיד/ה: ${session.studentName}`, rightX, y, 12, "bold");
  y += 2;
  y = addRTL(`כיתה: ${session.grade || "—"} | ת.ז.: ${session.studentIdNumber || "—"}`, rightX, y, 9);
  y += 2;
  y = addRTL(`תאריך: ${new Date(session.createdAt).toLocaleDateString("he-IL")}`, rightX, y, 9);
  y += 8;

  doc.line(10, y, 200, y);
  y += 8;

  // Scores Table
  checkPage(40);
  y = addRTL("ציונים לפי תחום", rightX, y, 13, "bold");
  y += 4;

  const scoreData = [
    { label: SECTION_LABELS.quality_of_life, s: scores.qualityOfLife },
    { label: SECTION_LABELS.self_efficacy, s: scores.selfEfficacy },
    { label: SECTION_LABELS.locus_of_control, s: scores.locusOfControl },
    { label: SECTION_LABELS.cognitive_flexibility, s: scores.cognitiveFlexibility },
  ];

  // Table header
  doc.setFillColor(240, 245, 240);
  doc.rect(10, y - 3, 190, 8, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Level", 15, y + 2);
  doc.text("Parent", 55, y + 2);
  doc.text("Student", 90, y + 2);
  doc.text("Score", 125, y + 2);
  doc.text("Domain", rightX, y + 2, { align: "right" });
  y += 10;

  scoreData.forEach(({ label, s }) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(getScoreLabel(s.normalized), 15, y);
    doc.text(s.parentNormalized >= 0 ? String(s.parentNormalized) : "—", 60, y);
    doc.text(s.studentNormalized >= 0 ? String(s.studentNormalized) : "—", 95, y);
    doc.text(s.normalized >= 0 ? String(s.normalized) : "—", 130, y);
    doc.text(label, rightX, y, { align: "right" });
    y += 7;
  });

  y += 6;

  // Focus areas
  if (focusAreas.length > 0) {
    checkPage(20);
    y = addRTL("תחומי מיקוד מומלצים", rightX, y, 12, "bold");
    y += 3;
    focusAreas.forEach((area, i) => {
      y = addRTL(`${i + 1}. ${area}`, rightX - 5, y, 10);
      y += 2;
    });
    y += 4;
  }

  // Risk flags
  if (riskFlags.length > 0 && target === "staff") {
    checkPage(25);
    y = addRTL("דגלי זהירות", rightX, y, 12, "bold");
    y += 3;
    riskFlags.forEach((flag) => {
      const severity = flag.severity === "urgent" ? "[!]" : flag.severity === "concern" ? "[?]" : "[i]";
      y = addRTL(`${severity} ${flag.domain}: ${flag.message}`, rightX - 5, y, 9);
      y += 3;
    });
    y += 4;
  }

  // Insights - staff only
  if (target === "staff") {
    checkPage(30);
    y = addRTL("תמונת מצב", rightX, y, 12, "bold");
    y += 3;
    y = addRTL(insights.summary, rightX - 5, y, 9);
    y += 6;

    if (insights.strengths.length > 0) {
      checkPage(20);
      y = addRTL("חוזקות", rightX, y, 11, "bold");
      y += 3;
      insights.strengths.forEach((s) => {
        y = addRTL(`• ${s}`, rightX - 5, y, 9);
        y += 2;
      });
      y += 4;
    }

    if (insights.recommendations.length > 0) {
      checkPage(25);
      y = addRTL("המלצות", rightX, y, 11, "bold");
      y += 3;
      insights.recommendations.forEach((s, i) => {
        y = addRTL(`${i + 1}. ${s}`, rightX - 5, y, 9);
        y += 3;
      });
    }
  }

  // Parent version - simpler
  if (target === "parent") {
    checkPage(20);
    y = addRTL("סיכום כללי", rightX, y, 12, "bold");
    y += 3;
    y = addRTL(insights.summary, rightX - 5, y, 10);
    y += 6;

    if (insights.strengths.length > 0) {
      y = addRTL("חוזקות שזוהו:", rightX, y, 11, "bold");
      y += 3;
      insights.strengths.forEach((s) => {
        y = addRTL(`• ${s}`, rightX - 5, y, 9);
        y += 2;
      });
    }
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150);
    doc.text(`Marom Beit Ekstein — Confidential — Page ${i}/${totalPages}`, 105, 290, { align: "center" });
    doc.setTextColor(0);
  }

  doc.save(`${session.studentName}_${target === "staff" ? "staff_report" : "parent_report"}.pdf`);
}
