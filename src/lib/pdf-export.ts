import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { IntakeSession, SECTION_LABELS } from "@/lib/types";
import { calculateScores, generateRiskFlags, generateInsights, getScoreLabel, getTopFocusAreas } from "@/lib/scoring";

function buildReportHTML(session: IntakeSession, target: "staff" | "parent"): string {
  const scores = calculateScores(session.studentResponses, session.parentResponses);
  const riskFlags = generateRiskFlags(scores);
  const insights = generateInsights(scores);
  const focusAreas = getTopFocusAreas(scores);

  const scoreData = [
    { label: SECTION_LABELS.quality_of_life, s: scores.qualityOfLife },
    { label: SECTION_LABELS.self_efficacy, s: scores.selfEfficacy },
    { label: SECTION_LABELS.locus_of_control, s: scores.locusOfControl },
    { label: SECTION_LABELS.cognitive_flexibility, s: scores.cognitiveFlexibility },
  ];

  const fmt = (n: number) => n >= 0 ? n.toFixed(2) : "—";

  let html = `
    <div style="font-family: 'Heebo', 'Rubik', 'Arial', sans-serif; direction: rtl; padding: 40px; max-width: 700px; margin: 0 auto; color: #1a1a2e; line-height: 1.6;">
      <div style="border-bottom: 3px solid #4a9a7a; padding-bottom: 16px; margin-bottom: 24px;">
        <h1 style="font-size: 22px; font-weight: 700; color: #1a1a2e; margin: 0 0 8px 0;">מרום בית אקשטיין — סיכום ${target === "parent" ? "להורים" : "לצוות"}</h1>
        <p style="font-size: 16px; font-weight: 600; margin: 0 0 4px 0;">תלמיד/ה: ${session.studentName}</p>
        <p style="font-size: 12px; color: #666; margin: 0;">כיתה: ${session.grade || "—"} &nbsp;|&nbsp; ת.ז.: ${session.studentIdNumber || "—"}</p>
        <p style="font-size: 12px; color: #666; margin: 0;">תאריך: ${new Date(session.createdAt).toLocaleDateString("he-IL")}</p>
      </div>

      <div style="border-bottom: 2px solid #4a9a7a; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="font-size: 16px; font-weight: 700; margin: 0 0 12px 0;">ציונים לפי תחום</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #eef5f0;">
              <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #ccc;">תחום</th>
              <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #ccc;">ציון</th>
              <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #ccc;">תלמיד</th>
              <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #ccc;">הורה</th>
              <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #ccc;">רמה</th>
            </tr>
          </thead>
          <tbody>
            ${scoreData.map(({ label, s }) => `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 12px; font-weight: 600;">${label}</td>
                <td style="padding: 8px 12px; text-align: center; font-weight: 700;">${fmt(s.normalized)}</td>
                <td style="padding: 8px 12px; text-align: center;">${fmt(s.studentNormalized)}</td>
                <td style="padding: 8px 12px; text-align: center;">${fmt(s.parentNormalized)}</td>
                <td style="padding: 8px 12px; text-align: center;">${getScoreLabel(s.normalized)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>`;

  if (focusAreas.length > 0) {
    html += `
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 15px; font-weight: 700; margin: 0 0 8px 0;">תחומי מיקוד מומלצים</h2>
        <ul style="margin: 0; padding: 0 20px; list-style: none;">
          ${focusAreas.map((a, i) => `<li style="margin-bottom: 4px; font-size: 13px;">📌 ${i + 1}. ${a}</li>`).join("")}
        </ul>
      </div>`;
  }

  if (target === "staff" && riskFlags.length > 0) {
    html += `
      <div style="margin-bottom: 20px; background: #fff5f5; border: 1px solid #fdd; border-radius: 8px; padding: 16px;">
        <h2 style="font-size: 15px; font-weight: 700; color: #c53030; margin: 0 0 8px 0;">⚠ דגלי זהירות</h2>
        ${riskFlags.map(f => `
          <p style="font-size: 12px; margin: 4px 0; color: #333;">
            <strong>${f.severity === "urgent" ? "🔴" : f.severity === "concern" ? "🟡" : "🔵"} ${f.domain}:</strong> ${f.message}
          </p>
        `).join("")}
      </div>`;
  }

  // Insights
  html += `
    <div style="margin-bottom: 20px;">
      <h2 style="font-size: 15px; font-weight: 700; margin: 0 0 8px 0;">${target === "parent" ? "סיכום כללי" : "תמונת מצב"}</h2>
      <p style="font-size: 13px; color: #444; margin: 0 0 12px 0;">${insights.summary}</p>
    </div>`;

  if (insights.strengths.length > 0) {
    html += `
      <div style="margin-bottom: 20px; background: #f0faf4; border: 1px solid #c6f6d5; border-radius: 8px; padding: 16px;">
        <h3 style="font-size: 14px; font-weight: 700; color: #276749; margin: 0 0 8px 0;">💪 חוזקות</h3>
        ${insights.strengths.map(s => `<p style="font-size: 12px; margin: 3px 0; color: #333;">• ${s}</p>`).join("")}
      </div>`;
  }

  if (target === "staff") {
    if (insights.areasForSupport.length > 0) {
      html += `
        <div style="margin-bottom: 20px; background: #fffaf0; border: 1px solid #feebc8; border-radius: 8px; padding: 16px;">
          <h3 style="font-size: 14px; font-weight: 700; color: #975a16; margin: 0 0 8px 0;">🎯 תחומים לקידום</h3>
          ${insights.areasForSupport.map(s => `<p style="font-size: 12px; margin: 3px 0; color: #333;">• ${s}</p>`).join("")}
        </div>`;
    }

    if (insights.recommendations.length > 0) {
      html += `
        <div style="margin-bottom: 20px;">
          <h2 style="font-size: 15px; font-weight: 700; margin: 0 0 8px 0;">💡 המלצות</h2>
          ${insights.recommendations.map((s, i) => `<p style="font-size: 12px; margin: 4px 0; color: #333;">${i + 1}. ${s}</p>`).join("")}
        </div>`;
    }

    if (insights.interpretation) {
      html += `
        <div style="margin-bottom: 20px; background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
          <h3 style="font-size: 14px; font-weight: 700; margin: 0 0 8px 0;">📋 פרשנות חינוכית-טיפולית</h3>
          <p style="font-size: 12px; color: #444; white-space: pre-line;">${insights.interpretation}</p>
        </div>`;
    }
  }

  // Open responses
  const openEntries = Object.entries(session.studentOpenResponses).filter(([, v]) => v);
  if (openEntries.length > 0) {
    const labels: Record<string, string> = {
      significant_figure: "דמות משמעותית בחיי",
      interests: "תחומי עניין",
      dream: "החלום שלי",
      want_to_change: "מה הייתי רוצה לשנות",
      areas_to_advance: "שלושה תחומים שאני רוצה לקדם",
    };
    html += `
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 15px; font-weight: 700; margin: 0 0 8px 0;">✍ תשובות פתוחות</h2>
        ${openEntries.map(([k, v]) => `
          <div style="background: #f7f7f9; border-radius: 6px; padding: 10px 14px; margin-bottom: 8px;">
            <p style="font-size: 11px; color: #888; margin: 0 0 2px 0; font-weight: 600;">${labels[k] || k}</p>
            <p style="font-size: 13px; margin: 0; color: #333;">${v}</p>
          </div>
        `).join("")}
      </div>`;
  }

  html += `
      <div style="border-top: 1px solid #ddd; padding-top: 12px; margin-top: 24px; text-align: center;">
        <p style="font-size: 10px; color: #999; margin: 0;">מרום בית אקשטיין — ${target === "parent" ? "דו\"ח להורים" : "דו\"ח לצוות"} — חסוי</p>
      </div>
    </div>`;

  return html;
}

export async function generateStudentPDF(session: IntakeSession, target: "staff" | "parent" = "staff") {
  // Create an off-screen container
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "700px";
  container.style.background = "white";
  container.innerHTML = buildReportHTML(session, target);
  document.body.appendChild(container);

  // Wait for fonts to load
  await document.fonts.ready;

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    const imgData = canvas.toDataURL("image/png");

    // Multi-page support
    let position = 0;
    let remaining = imgHeight;
    let pageNum = 0;

    while (remaining > 0) {
      if (pageNum > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, -position, imgWidth, imgHeight);
      position += pdfHeight;
      remaining -= pdfHeight;
      pageNum++;
    }

    pdf.save(`${session.studentName}_${target === "staff" ? "staff_report" : "parent_report"}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
