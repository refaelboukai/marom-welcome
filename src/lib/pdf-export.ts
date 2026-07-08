import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { IntakeSession, SECTION_LABELS, QOL_SUBDOMAIN_LABELS, LC_SUBDOMAIN_LABELS } from "@/lib/types";
import { calculateScores, calculateQoLSubdomains, calculateLearningSubdomains, generateRiskFlags, generateInsights, generateGASGoals, getScoreLabel, getTopFocusAreas } from "@/lib/scoring";
import { DOMAIN_DESCRIPTIONS, QOL_SUBDOMAIN_DESCRIPTIONS, LC_SUBDOMAIN_DESCRIPTIONS, getScoreInterpretation } from "@/lib/domain-descriptions";

function buildReportHTML(session: IntakeSession, target: "staff" | "parent"): string {
  const scores = calculateScores(session.studentResponses, session.parentResponses);
  const qolSubs = calculateQoLSubdomains(session.studentResponses, session.parentResponses);
  const lcSubs = calculateLearningSubdomains(session.studentResponses, session.parentResponses);
  const riskFlags = generateRiskFlags(scores);
  const insights = generateInsights(scores);
  const focusAreas = getTopFocusAreas(scores);

  const scoreData = [
    { key: "qualityOfLife", label: SECTION_LABELS.quality_of_life, s: scores.qualityOfLife },
    { key: "selfEfficacy", label: SECTION_LABELS.self_efficacy, s: scores.selfEfficacy },
    { key: "locusOfControl", label: SECTION_LABELS.locus_of_control, s: scores.locusOfControl },
    { key: "cognitiveFlexibility", label: SECTION_LABELS.cognitive_flexibility, s: scores.cognitiveFlexibility },
    { key: "learningCharacteristics", label: SECTION_LABELS.learning_characteristics, s: scores.learningCharacteristics },
  ];

  const fmt = (n: number) => n >= 0 ? n.toFixed(2) : "—";

  let html = `
    <div style="font-family: 'Heebo', 'Rubik', 'Arial', sans-serif; direction: rtl; padding: 40px; max-width: 700px; margin: 0 auto; color: #1a1a2e; line-height: 1.6;">
      <div data-section style="border-bottom: 3px solid #4a9a7a; padding-bottom: 16px; margin-bottom: 24px;">
        <h1 style="font-size: 22px; font-weight: 700; color: #1a1a2e; margin: 0 0 8px 0;">מרום בית אקשטיין — סיכום ${target === "parent" ? "להורים" : "לצוות"}</h1>
        <p style="font-size: 16px; font-weight: 600; margin: 0 0 4px 0;">תלמיד/ה: ${session.studentName}</p>
        <p style="font-size: 12px; color: #666; margin: 0;">כיתה: ${session.grade || "—"} &nbsp;|&nbsp; ת.ז.: ${session.studentIdNumber || "—"}</p>
        <p style="font-size: 12px; color: #666; margin: 0;">תאריך: ${new Date(session.createdAt).toLocaleDateString("he-IL")}</p>
        <p style="font-size: 11px; color: #888; margin: 8px 0 0 0;">סולם הציונים: 1–5 (1 = נמוך, 5 = גבוה). כל ציון מלווה בפרשנות מילולית.</p>
      </div>

      <div data-section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; font-weight: 700; margin: 0 0 12px 0;">ציונים לפי תחום — עם פרשנות</h2>
        ${scoreData.map(({ key, label, s }) => `
          <div style="margin-bottom: 14px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #fafcfd;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <strong style="font-size: 14px; color: #1a1a2e;">${label}</strong>
              <span style="font-size: 18px; font-weight: 800; color: ${s.normalized < 2 ? '#e53e3e' : s.normalized < 3 ? '#d69e2e' : s.normalized < 4 ? '#333' : '#276749'};">${fmt(s.normalized)}</span>
            </div>
            <p style="font-size: 11px; color: #555; margin: 0 0 4px 0;">${DOMAIN_DESCRIPTIONS[key]?.description || ""}</p>
            <p style="font-size: 11px; font-weight: 600; margin: 0 0 4px 0; color: ${s.normalized >= 4 ? '#276749' : s.normalized >= 3 ? '#4a9a7a' : s.normalized >= 2 ? '#d69e2e' : s.normalized >= 0 ? '#e53e3e' : '#888'};">
              ${getScoreInterpretation(s.normalized, key)}
            </p>
            <p style="font-size: 10px; color: #888; margin: 0;">תלמיד: ${fmt(s.studentNormalized)} | הורה: ${fmt(s.parentNormalized)} | רמה: ${getScoreLabel(s.normalized)}</p>
          </div>
        `).join("")}
      </div>`;

  // QoL Subdomain breakdown
  html += `
    <div data-section style="margin-bottom: 20px;">
      <h2 style="font-size: 15px; font-weight: 700; margin: 0 0 10px 0;">📊 פירוט מדדי איכות חיים</h2>
      <p style="font-size: 11px; color: #888; margin: 0 0 10px 0;">מדד איכות החיים מורכב משמונה תחומים. כל תחום מוסבר בצורה מילולית.</p>
      ${Object.entries(qolSubs).map(([key, s]) => `
        <div style="margin-bottom: 8px; padding: 8px 12px; border: 1px solid #e8f0fe; border-radius: 6px; background: #f8faff;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="font-size: 12px;">${QOL_SUBDOMAIN_LABELS[key] || key}</strong>
            <span style="font-size: 14px; font-weight: 700; color: ${s.normalized < 2.5 ? '#e53e3e' : s.normalized < 3.0 ? '#d69e2e' : '#333'};">${fmt(s.normalized)}</span>
          </div>
          <p style="font-size: 10px; color: #666; margin: 2px 0 0 0;">${QOL_SUBDOMAIN_DESCRIPTIONS[key] || ""}</p>
          <p style="font-size: 10px; font-weight: 600; margin: 2px 0 0 0; color: ${s.normalized >= 4 ? '#276749' : s.normalized >= 3 ? '#4a9a7a' : s.normalized >= 2 ? '#d69e2e' : s.normalized >= 0 ? '#e53e3e' : '#888'};">
            ${getScoreInterpretation(s.normalized, key)}
          </p>
          <p style="font-size: 10px; color: #888; margin: 2px 0 0 0;">ת: ${fmt(s.studentNormalized)} | ה: ${fmt(s.parentNormalized)} | ${getScoreLabel(s.normalized)}</p>
        </div>
      `).join("")}
    </div>`;

  // Learning Characteristics subdomain breakdown
  if (Object.keys(lcSubs).length > 0 && Object.values(lcSubs).some(s => s.normalized >= 0)) {
    html += `
    <div data-section style="margin-bottom: 20px;">
      <h2 style="font-size: 15px; font-weight: 700; margin: 0 0 10px 0;">🧩 מאפייני למידה — פירוט אשכולות נוירו-פדגוגיים</h2>
      <p style="font-size: 11px; color: #888; margin: 0 0 10px 0;">ארבעה אשכולות המאפשרים התאמות פדגוגיות ממוקדות. ציון נמוך מסמן צורך בתמיכה ובהתאמות.</p>
      ${Object.entries(lcSubs).map(([key, s]) => `
        <div style="margin-bottom: 8px; padding: 8px 12px; border: 1px solid #fef0e8; border-radius: 6px; background: #fffaf7;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="font-size: 12px;">${LC_SUBDOMAIN_LABELS[key] || key}</strong>
            <span style="font-size: 14px; font-weight: 700; color: ${s.normalized < 2.5 ? '#e53e3e' : s.normalized < 3.0 ? '#d69e2e' : '#333'};">${fmt(s.normalized)}</span>
          </div>
          <p style="font-size: 10px; color: #666; margin: 2px 0 0 0;">${LC_SUBDOMAIN_DESCRIPTIONS[key] || ""}</p>
          <p style="font-size: 10px; color: #888; margin: 2px 0 0 0;">ת: ${fmt(s.studentNormalized)} | ה: ${fmt(s.parentNormalized)} | ${getScoreLabel(s.normalized)}</p>
        </div>
      `).join("")}
    </div>`;
  }

  if (target === "staff" && riskFlags.length > 0) {
    html += `
      <div data-section style="margin-bottom: 20px; background: #fff5f5; border: 1px solid #fdd; border-radius: 8px; padding: 16px;">
        <h2 style="font-size: 15px; font-weight: 700; color: #c53030; margin: 0 0 8px 0;">⚠ דגלי זהירות</h2>
        ${riskFlags.map(f => `
          <p style="font-size: 12px; margin: 4px 0; color: #333;">
            <strong>${f.severity === "urgent" ? "🔴" : f.severity === "concern" ? "🟡" : "🔵"} ${f.domain}:</strong> ${f.message}
          </p>
        `).join("")}
      </div>`;
  }

  html += `
    <div data-section style="margin-bottom: 20px;">
      <h2 style="font-size: 15px; font-weight: 700; margin: 0 0 8px 0;">${target === "parent" ? "סיכום כללי" : "תמונת מצב"}</h2>
      <p style="font-size: 13px; color: #444; margin: 0 0 12px 0;">${insights.summary}</p>
    </div>`;

  if (insights.strengths.length > 0) {
    html += `
      <div data-section style="margin-bottom: 20px; background: #f0faf4; border: 1px solid #c6f6d5; border-radius: 8px; padding: 16px;">
        <h3 style="font-size: 14px; font-weight: 700; color: #276749; margin: 0 0 8px 0;">💪 חוזקות</h3>
        ${insights.strengths.map(s => `<p style="font-size: 12px; margin: 3px 0; color: #333;">• ${s}</p>`).join("")}
      </div>`;
  }

  if (target === "staff") {
    if (insights.areasForSupport.length > 0) {
      html += `
        <div data-section style="margin-bottom: 20px; background: #fffaf0; border: 1px solid #feebc8; border-radius: 8px; padding: 16px;">
          <h3 style="font-size: 14px; font-weight: 700; color: #975a16; margin: 0 0 8px 0;">🎯 תחומים לקידום</h3>
          ${insights.areasForSupport.map(s => `<p style="font-size: 12px; margin: 3px 0; color: #333;">• ${s}</p>`).join("")}
        </div>`;
    }

    if (insights.recommendations.length > 0) {
      html += `
        <div data-section style="margin-bottom: 20px;">
          <h2 style="font-size: 15px; font-weight: 700; margin: 0 0 8px 0;">💡 המלצות</h2>
          ${insights.recommendations.map((s, i) => `<p style="font-size: 12px; margin: 4px 0; color: #333;">${i + 1}. ${s}</p>`).join("")}
        </div>`;
    }

    if (insights.interpretation) {
      html += `
        <div data-section style="margin-bottom: 20px; background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
          <h3 style="font-size: 14px; font-weight: 700; margin: 0 0 8px 0;">📋 פרשנות חינוכית-טיפולית</h3>
          <p style="font-size: 12px; color: #444; white-space: pre-line;">${insights.interpretation}</p>
        </div>`;
    }
  }

  // Staff open responses
  const staffLabels: Record<string, string> = {
    staff_behavioral: "תפקוד התנהגותי",
    staff_social: "תפקוד חברתי",
    staff_academic: "תפקוד לימודי",
    staff_emotional: "תפקוד רגשי",
    staff_recommendations: "המלצות הצוות",
  };
  const staffEntries = Object.entries(session.staffOpenResponses || {}).filter(([, v]) => v);
  if (staffEntries.length > 0) {
    html += `
      <div data-section style="margin-bottom: 20px;">
        <h2 style="font-size: 15px; font-weight: 700; margin: 0 0 8px 0;">📋 הערכת צוות חינוכי</h2>
        ${staffEntries.map(([k, v]) => `
          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 10px 14px; margin-bottom: 8px;">
            <p style="font-size: 11px; color: #92400e; margin: 0 0 2px 0; font-weight: 600;">${staffLabels[k] || k}</p>
            <p style="font-size: 13px; margin: 0; color: #333;">${v}</p>
          </div>
        `).join("")}
      </div>`;
  }

  // Admin notes
  if (target === "staff" && session.adminNotes) {
    html += `
      <div data-section style="margin-bottom: 20px;">
        <h2 style="font-size: 15px; font-weight: 700; margin: 0 0 8px 0;">📝 הערות צוות</h2>
        <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px;">
          <p style="font-size: 13px; margin: 0; color: #333; white-space: pre-line;">${session.adminNotes}</p>
        </div>
      </div>`;
  }

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
      <div data-section style="margin-bottom: 20px;">
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
      <div data-section style="border-top: 1px solid #ddd; padding-top: 12px; margin-top: 24px; text-align: center;">
        <p style="font-size: 10px; color: #999; margin: 0;">מרום בית אקשטיין — ${target === "parent" ? "דו\"ח להורים" : "דו\"ח לצוות"} — חסוי</p>
      </div>
    </div>`;

  return html;
}

export interface PersonalPlanData {
  aiRecommendations?: {
    personalInsight: string;
    strengths: string[];
    areasForSupport: string[];
    recommendations: string[];
    suggestedGoals: string[];
    parentGuidance: string;
  };
  supportPlans?: { domain: string; description: string; status: string }[];
}

function buildPersonalPlanHTML(session: IntakeSession, planData: PersonalPlanData): string {
  const scores = calculateScores(session.studentResponses, session.parentResponses);
  const qolSubs = calculateQoLSubdomains(session.studentResponses, session.parentResponses);
  const lcSubs = calculateLearningSubdomains(session.studentResponses, session.parentResponses);
  const gasGoals = generateGASGoals(scores);
  const insights = generateInsights(scores);
  const focusAreas = getTopFocusAreas(scores);
  const ai = planData.aiRecommendations;

  const scoreData = [
    { key: "qualityOfLife", label: SECTION_LABELS.quality_of_life, s: scores.qualityOfLife },
    { key: "selfEfficacy", label: SECTION_LABELS.self_efficacy, s: scores.selfEfficacy },
    { key: "locusOfControl", label: SECTION_LABELS.locus_of_control, s: scores.locusOfControl },
    { key: "cognitiveFlexibility", label: SECTION_LABELS.cognitive_flexibility, s: scores.cognitiveFlexibility },
    { key: "learningCharacteristics", label: SECTION_LABELS.learning_characteristics, s: scores.learningCharacteristics },
  ];
  const fmt = (n: number) => n >= 0 ? n.toFixed(2) : "—";

  let html = `
    <div style="font-family: 'Heebo', 'Rubik', 'Arial', sans-serif; direction: rtl; padding: 40px; max-width: 700px; margin: 0 auto; color: #1a1a2e; line-height: 1.7;">
      <div data-section style="text-align: center; margin-bottom: 24px; border-bottom: 3px solid #4a9a7a; padding-bottom: 20px;">
        <h1 style="font-size: 24px; font-weight: 800; color: #1a1a2e; margin: 0 0 4px 0;">המלצות ודרכי פעולה — תכנית אישית</h1>
        <p style="font-size: 13px; color: #4a9a7a; font-weight: 600; margin: 0 0 12px 0;">מרום בית אקשטיין</p>
        <p style="font-size: 18px; font-weight: 700; margin: 0 0 4px 0;">תלמיד/ה: ${session.studentName}</p>
        <p style="font-size: 12px; color: #666; margin: 0;">כיתה: ${session.grade || "—"} &nbsp;|&nbsp; תאריך: ${new Date(session.createdAt).toLocaleDateString("he-IL")}</p>
        <p style="font-size: 11px; color: #888; margin: 8px 0 0 0;">סולם הציונים: 1–5 (1 = נמוך, 5 = גבוה). כל ציון מלווה בהסבר מילולי ופרשנות.</p>
      </div>

      <div data-section style="margin-bottom: 24px;">
        <h2 style="font-size: 16px; font-weight: 700; margin: 0 0 12px 0; color: #4a9a7a;">📊 סיכום ציונים — עם פרשנות מילולית</h2>
        ${scoreData.map(({ key, label, s }) => `
          <div style="margin-bottom: 14px; border: 1px solid #d4edda; border-radius: 8px; padding: 12px 14px; background: #f8fdf9;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <strong style="font-size: 14px; color: #1a1a2e;">${label}</strong>
              <span style="font-size: 18px; font-weight: 800; color: ${s.normalized < 2 ? '#e53e3e' : s.normalized < 3 ? '#d69e2e' : s.normalized < 4 ? '#333' : '#276749'};">${fmt(s.normalized)} — ${getScoreLabel(s.normalized)}</span>
            </div>
            <p style="font-size: 11px; color: #555; margin: 0 0 4px 0;">${DOMAIN_DESCRIPTIONS[key]?.description || ""}</p>
            <p style="font-size: 11px; font-weight: 600; margin: 0 0 4px 0; color: ${s.normalized >= 4 ? '#276749' : s.normalized >= 3 ? '#4a9a7a' : s.normalized >= 2 ? '#d69e2e' : s.normalized >= 0 ? '#e53e3e' : '#888'};">
              ${getScoreInterpretation(s.normalized, key)}
            </p>
            <p style="font-size: 10px; color: #888; margin: 0;">תלמיד: ${fmt(s.studentNormalized)} | הורה: ${fmt(s.parentNormalized)}</p>
          </div>
        `).join("")}
      </div>`;

  // QoL Subdomain Table
  html += `
    <div data-section style="margin-bottom: 24px;">
      <h2 style="font-size: 15px; font-weight: 700; margin: 0 0 10px 0; color: #2b6cb0;">📋 פירוט מדדי איכות חיים</h2>
      <p style="font-size: 11px; color: #888; margin: 0 0 10px 0;">מדד איכות החיים מורכב משמונה תחומים. כל תחום מוסבר מילולית.</p>
      ${Object.entries(qolSubs).map(([key, s]) => `
        <div style="margin-bottom: 8px; padding: 8px 12px; border: 1px solid #e8f0fe; border-radius: 6px; background: #f8faff;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="font-size: 12px;">${QOL_SUBDOMAIN_LABELS[key] || key}</strong>
            <span style="font-size: 14px; font-weight: 700; color: ${s.normalized < 2.5 ? '#e53e3e' : s.normalized < 3.0 ? '#d69e2e' : '#333'};">${fmt(s.normalized)} — ${getScoreLabel(s.normalized)}</span>
          </div>
          <p style="font-size: 10px; color: #666; margin: 2px 0 0 0;">${QOL_SUBDOMAIN_DESCRIPTIONS[key] || ""}</p>
          <p style="font-size: 10px; color: #888; margin: 2px 0 0 0;">ת: ${fmt(s.studentNormalized)} | ה: ${fmt(s.parentNormalized)}</p>
        </div>
      `).join("")}
    </div>`;

  // Learning Characteristics breakdown in personal plan
  if (Object.keys(lcSubs).length > 0 && Object.values(lcSubs).some(s => s.normalized >= 0)) {
    html += `
    <div data-section style="margin-bottom: 24px;">
      <h2 style="font-size: 15px; font-weight: 700; margin: 0 0 10px 0; color: #b7791f;">🧩 מאפייני למידה — אשכולות נוירו-פדגוגיים</h2>
      <p style="font-size: 11px; color: #888; margin: 0 0 10px 0;">בסיס להתאמות פדגוגיות אישיות לתלמיד. כל אשכול מלווה בהמלצות פעולה.</p>
      ${Object.entries(lcSubs).map(([key, s]) => `
        <div style="margin-bottom: 8px; padding: 8px 12px; border: 1px solid #fef0e8; border-radius: 6px; background: #fffaf7;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="font-size: 12px;">${LC_SUBDOMAIN_LABELS[key] || key}</strong>
            <span style="font-size: 14px; font-weight: 700; color: ${s.normalized < 2.5 ? '#e53e3e' : s.normalized < 3.0 ? '#d69e2e' : '#333'};">${fmt(s.normalized)} — ${getScoreLabel(s.normalized)}</span>
          </div>
          <p style="font-size: 10px; color: #666; margin: 2px 0 0 0;">${LC_SUBDOMAIN_DESCRIPTIONS[key] || ""}</p>
          <p style="font-size: 10px; color: #888; margin: 2px 0 0 0;">ת: ${fmt(s.studentNormalized)} | ה: ${fmt(s.parentNormalized)}</p>
        </div>
      `).join("")}
    </div>`;
  }

  // AI Personal Insight
  if (ai?.personalInsight) {
    html += `
      <div data-section style="margin-bottom: 20px; background: #f0f7ff; border: 1px solid #bee3f8; border-radius: 8px; padding: 16px;">
        <h2 style="font-size: 15px; font-weight: 700; color: #2b6cb0; margin: 0 0 8px 0;">🧠 תובנה אישית</h2>
        <p style="font-size: 13px; color: #333;">${ai.personalInsight}</p>
      </div>`;
  }

  if (ai && (ai.strengths.length > 0 || ai.areasForSupport.length > 0)) {
    html += `<div data-section style="display: flex; gap: 12px; margin-bottom: 20px;">`;
    if (ai.strengths.length > 0) {
      html += `
        <div style="flex: 1; background: #f0faf4; border: 1px solid #c6f6d5; border-radius: 8px; padding: 14px;">
          <h3 style="font-size: 13px; font-weight: 700; color: #276749; margin: 0 0 8px 0;">💪 חוזקות</h3>
          ${ai.strengths.map(s => `<p style="font-size: 12px; margin: 3px 0; color: #333;">• ${s}</p>`).join("")}
        </div>`;
    }
    if (ai.areasForSupport.length > 0) {
      html += `
        <div style="flex: 1; background: #fffaf0; border: 1px solid #feebc8; border-radius: 8px; padding: 14px;">
          <h3 style="font-size: 13px; font-weight: 700; color: #975a16; margin: 0 0 8px 0;">🎯 תחומים לתמיכה</h3>
          ${ai.areasForSupport.map(s => `<p style="font-size: 12px; margin: 3px 0; color: #333;">• ${s}</p>`).join("")}
        </div>`;
    }
    html += `</div>`;
  }

  if (ai?.recommendations && ai.recommendations.length > 0) {
    html += `
      <div data-section style="margin-bottom: 20px; background: #faf5ff; border: 1px solid #e9d8fd; border-radius: 8px; padding: 16px;">
        <h2 style="font-size: 15px; font-weight: 700; color: #6b46c1; margin: 0 0 10px 0;">💡 המלצות מעשיות</h2>
        ${ai.recommendations.map((r, i) => `
          <div style="margin-bottom: 8px; padding: 8px 12px; background: white; border-radius: 6px;">
            <p style="font-size: 12px; margin: 0; color: #333;"><strong style="color: #6b46c1;">${i + 1}.</strong> ${r}</p>
          </div>
        `).join("")}
      </div>`;
  }

  if (gasGoals.length > 0) {
    html += `
      <div data-section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; font-weight: 700; margin: 0 0 12px 0; color: #4a9a7a;">🎯 יעדי GAS — סולם השגת מטרות</h2>
        ${gasGoals.map(goal => `
          <div style="margin-bottom: 16px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background: #eef5f0; padding: 10px 14px;">
              <h3 style="font-size: 14px; font-weight: 700; color: #276749; margin: 0;">${goal.area}</h3>
            </div>
            <div style="padding: 12px 14px; font-size: 12px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #f0f0f0;">
                  <td style="padding: 6px 8px; font-weight: 600; color: #666; width: 100px;">מצב נוכחי</td>
                  <td style="padding: 6px 8px; color: #333;">${goal.current}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f0f0f0;">
                  <td style="padding: 6px 8px; font-weight: 600; color: #e53e3e;">יעד (-1)</td>
                  <td style="padding: 6px 8px; color: #333;">${goal.level0}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f0f0f0;">
                  <td style="padding: 6px 8px; font-weight: 600; color: #38a169;">יעד (+1)</td>
                  <td style="padding: 6px 8px; color: #333;">${goal.level1}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 8px; font-weight: 600; color: #276749;">יעד (+2)</td>
                  <td style="padding: 6px 8px; color: #333;">${goal.level2}</td>
                </tr>
              </table>
            </div>
          </div>
        `).join("")}
      </div>`;
  }

  if (ai?.suggestedGoals && ai.suggestedGoals.length > 0) {
    html += `
      <div data-section style="margin-bottom: 20px; background: #f0f7ff; border: 1px solid #bee3f8; border-radius: 8px; padding: 16px;">
        <h2 style="font-size: 15px; font-weight: 700; color: #2b6cb0; margin: 0 0 8px 0;">🌟 יעדים מוצעים</h2>
        ${ai.suggestedGoals.map((g, i) => `<p style="font-size: 12px; margin: 4px 0; color: #333;">${i + 1}. ${g}</p>`).join("")}
      </div>`;
  }

  if (planData.supportPlans && planData.supportPlans.length > 0) {
    html += `
      <div data-section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; font-weight: 700; margin: 0 0 12px 0; color: #4a9a7a;">📋 תכניות תמיכה פעילות</h2>
        ${planData.supportPlans.map(p => `
          <div style="margin-bottom: 8px; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fafafa;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <strong style="font-size: 13px; color: #333;">${p.domain}</strong>
              <span style="font-size: 10px; padding: 2px 8px; border-radius: 12px; background: ${p.status === 'active' ? '#c6f6d5' : '#e2e8f0'}; color: ${p.status === 'active' ? '#276749' : '#666'};">${p.status === 'active' ? 'פעיל' : 'הושלם'}</span>
            </div>
            <p style="font-size: 12px; color: #555; margin: 0;">${p.description}</p>
          </div>
        `).join("")}
      </div>`;
  }

  if (ai?.parentGuidance) {
    html += `
      <div data-section style="margin-bottom: 20px; background: #fff5f7; border: 1px solid #fed7e2; border-radius: 8px; padding: 16px;">
        <h2 style="font-size: 15px; font-weight: 700; color: #97266d; margin: 0 0 8px 0;">👨‍👩‍👧 הנחיה להורים</h2>
        <p style="font-size: 13px; color: #333;">${ai.parentGuidance}</p>
      </div>`;
  }

  // Staff open responses in personal plan
  const staffLabels2: Record<string, string> = {
    staff_behavioral: "תפקוד התנהגותי",
    staff_social: "תפקוד חברתי",
    staff_academic: "תפקוד לימודי",
    staff_emotional: "תפקוד רגשי",
    staff_recommendations: "המלצות הצוות",
  };
  const staffEntries2 = Object.entries(session.staffOpenResponses || {}).filter(([, v]) => v);
  if (staffEntries2.length > 0) {
    html += `
      <div data-section style="margin-bottom: 20px;">
        <h2 style="font-size: 15px; font-weight: 700; margin: 0 0 8px 0;">📋 הערכת צוות חינוכי</h2>
        ${staffEntries2.map(([k, v]) => `
          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 10px 14px; margin-bottom: 8px;">
            <p style="font-size: 11px; color: #92400e; margin: 0 0 2px 0; font-weight: 600;">${staffLabels2[k] || k}</p>
            <p style="font-size: 13px; margin: 0; color: #333;">${v}</p>
          </div>
        `).join("")}
      </div>`;
  }

  // Admin notes in personal plan
  if (session.adminNotes) {
    html += `
      <div data-section style="margin-bottom: 20px;">
        <h2 style="font-size: 15px; font-weight: 700; margin: 0 0 8px 0;">📝 הערות צוות</h2>
        <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px;">
          <p style="font-size: 13px; margin: 0; color: #333; white-space: pre-line;">${session.adminNotes}</p>
        </div>
      </div>`;
  }

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
      <div data-section style="margin-bottom: 20px;">
        <h2 style="font-size: 15px; font-weight: 700; margin: 0 0 8px 0;">✍ קולו של התלמיד</h2>
        ${openEntries.map(([k, v]) => `
          <div style="background: #f7f7f9; border-radius: 6px; padding: 10px 14px; margin-bottom: 8px;">
            <p style="font-size: 11px; color: #888; margin: 0 0 2px 0; font-weight: 600;">${labels[k] || k}</p>
            <p style="font-size: 13px; margin: 0; color: #333;">${v}</p>
          </div>
        `).join("")}
      </div>`;
  }

  html += `
      <div data-section style="border-top: 2px solid #4a9a7a; padding-top: 12px; margin-top: 24px; text-align: center;">
        <p style="font-size: 11px; color: #4a9a7a; font-weight: 600; margin: 0;">מרום בית אקשטיין — תכנית אישית לקידום איכות חיים</p>
        <p style="font-size: 10px; color: #999; margin: 4px 0 0 0;">מסמך חסוי — ${new Date().toLocaleDateString("he-IL")}</p>
      </div>
    </div>`;

  return html;
}

async function renderHTMLToPDF(html: string, filename: string, options?: { grayscale?: boolean }) {
  const grayscale = options?.grayscale === true;
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "700px";
  container.style.background = "white";
  container.innerHTML = html;
  document.body.appendChild(container);

  await document.fonts.ready;

  try {
    // Measure section positions before rendering
    const sections = container.querySelectorAll("[data-section]");
    const sectionBounds = Array.from(sections).map(el => ({
      top: (el as HTMLElement).offsetTop,
      bottom: (el as HTMLElement).offsetTop + (el as HTMLElement).offsetHeight,
    }));

    const canvas = await html2canvas(container, {
      scale: grayscale ? 1.5 : 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const scale = pdfWidth / 700; // container width in px
    const pageHeightInPx = pdfHeight / scale;
    const canvasScale = canvas.width / 700;

    // Find clean break points between sections
    const breakPoints: number[] = [0];
    let nextBreak = pageHeightInPx;

    while (nextBreak < container.scrollHeight) {
      let bestBreak = nextBreak;
      // Check if this break falls inside a section
      for (const bound of sectionBounds) {
        if (bound.top < nextBreak && bound.bottom > nextBreak) {
          // Section would be split — break before it (with small margin)
          bestBreak = Math.max(bound.top - 5, breakPoints[breakPoints.length - 1] + 50);
          break;
        }
      }
      breakPoints.push(bestBreak);
      nextBreak = bestBreak + pageHeightInPx;
    }

    // Render each page
    for (let i = 0; i < breakPoints.length; i++) {
      if (i > 0) pdf.addPage();
      const startPx = breakPoints[i] * canvasScale;
      const endPx = (i < breakPoints.length - 1 ? breakPoints[i + 1] : container.scrollHeight) * canvasScale;
      const sliceHeight = endPx - startPx;

      if (sliceHeight <= 0) continue;

      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      const ctx = pageCanvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(canvas, 0, startPx, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

      if (grayscale) {
        const imgData = ctx.getImageData(0, 0, pageCanvas.width, pageCanvas.height);
        const d = imgData.data;
        for (let p = 0; p < d.length; p += 4) {
          const gray = Math.round(0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]);
          d[p] = d[p + 1] = d[p + 2] = gray;
        }
        ctx.putImageData(imgData, 0, 0);
      }

      const imgHeight = (sliceHeight * pdfWidth) / canvas.width;
      if (grayscale) {
        const imgData = pageCanvas.toDataURL("image/jpeg", 0.6);
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, Math.min(imgHeight, pdfHeight), undefined, "FAST");
      } else {
        const imgData = pageCanvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, Math.min(imgHeight, pdfHeight));
      }
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}

export async function generateStudentPDF(session: IntakeSession, target: "staff" | "parent" = "staff") {
  const html = buildReportHTML(session, target);
  await renderHTMLToPDF(html, `${session.studentName}_${target === "staff" ? "staff_report" : "parent_report"}.pdf`);
}

export async function generatePersonalPlanPDF(session: IntakeSession, planData: PersonalPlanData, options?: { grayscale?: boolean }) {
  const html = buildPersonalPlanHTML(session, planData);
  const suffix = options?.grayscale ? "_שחור_לבן" : "";
  await renderHTMLToPDF(html, `${session.studentName}_תכנית_אישית${suffix}.pdf`, options);
}

// ============================================================
//  Empowering, student-facing narrative plan (no numeric scores)
// ============================================================

interface DomainNarrativeBits {
  strengthPhrase: string;   // when score >= 4
  growthPhrase: string;     // when score < 3
  neutralPhrase: string;    // when 3 <= score < 4
  reflection: string;       // reflection question for the student
}

const DOMAIN_SHORT_LABEL: Record<string, string> = {
  qualityOfLife: "איכות חיים",
  selfEfficacy: "מסוגלות עצמית",
  locusOfControl: "מיקוד שליטה",
  cognitiveFlexibility: "גמישות קוגניטיבית",
  learningCharacteristics: "מאפייני למידה",
};

const DOMAIN_ONE_LINER: Record<string, string> = {
  qualityOfLife: "עד כמה את/ה מרגיש/ה טוב ביום־יום — בבית, בבית הספר ובחברה.",
  selfEfficacy: "האמונה שלך ביכולת להתמודד עם משימות ואתגרים ולהצליח בהם.",
  locusOfControl: "התחושה שהמעשים שלך משפיעים על מה שקורה בחיים שלך.",
  cognitiveFlexibility: "היכולת להסתכל על מצבים מזוויות שונות ולמצוא פתרונות יצירתיים.",
  learningCharacteristics: "האופן שבו הראש שלך אוהב ללמוד — קשב, זיכרון, ארגון וויסות.",
};

const DOMAIN_NARRATIVES: Record<string, DomainNarrativeBits> = {
  qualityOfLife: {
    strengthPhrase: "אנחנו רואים אצלך <strong>תחושת רווחה ואיכות חיים טובה</strong> — משאב חשוב שאפשר להישען עליו וגם לחלוק עם הסביבה.",
    growthPhrase: "נשמח לבדוק יחד <strong>איך אפשר להרחיב את תחושת הרווחה והשייכות</strong> — ברמה החברתית, הרגשית והלימודית — ולבנות רשת תמיכה שתעזור לך להרגיש טוב יותר בכל יום.",
    neutralPhrase: "יש בסיס יציב של תחושת רווחה, ואפשר יחד <strong>לחזק תחומים שבהם תרצה/י להרגיש עוד יותר טוב</strong>.",
    reflection: "מה יעזור לך להרגיש שהיום־יום בבית הספר מתאים יותר עבורך?",
  },
  selfEfficacy: {
    strengthPhrase: "בולטת אצלך <strong>אמונה ביכולת האישית שלך</strong> להתמודד עם אתגרים ולהצליח — נשמח להמשיך לחזק זאת ולהעניק לך במות נוספות לבטא זאת.",
    growthPhrase: "יחד נעבוד על <strong>הרחבת תחושת המסוגלות</strong> — לזהות הצלחות קטנות, לחגוג צעדים, ולבנות ביטחון להתמודד עם אתגרים חדשים.",
    neutralPhrase: "יש לך כוחות של אמונה עצמית — אפשר יחד <strong>לזהות מצבים שבהם המסוגלות שלך מזדהרת</strong> ולהעתיק אותם לתחומים נוספים.",
    reflection: "באיזה תחום היית רוצה להרגיש 'אני יכול/ה' יותר?",
  },
  locusOfControl: {
    strengthPhrase: "אנחנו רואים <strong>תחושת השפעה על מה שקורה בחייך</strong> — יכולת שתעזור לך להוביל את עצמך קדימה.",
    growthPhrase: "נבנה יחד תרגול של <strong>זיהוי הבחירות שיש לך בכל סיטואציה</strong> — כדי שתרגיש/י שהמאמצים שלך אכן משנים את מה שקורה סביבך.",
    neutralPhrase: "יש לך מודעות טובה להשפעה שלך — אפשר לחדד עוד <strong>אילו מהמאמצים שלך יוצרים את השינוי הגדול ביותר</strong>.",
    reflection: "מה הצעד הקטן שאת/ה מרגיש/ה שתלוי בך היום?",
  },
  cognitiveFlexibility: {
    strengthPhrase: "בולטת אצלך <strong>גמישות מחשבתית ויכולת לראות דברים מכמה זוויות</strong> — כלי משמעותי לפתרון בעיות.",
    growthPhrase: "נתמקד יחד <strong>ביכולת להסתכל על דברים מנקודות מבט שונות ולהרחיב את הגמישות המחשבתית ופתרון הבעיות</strong> — עם תרגולים קטנים של 'תוכנית ב'' ומעברים בין משימות.",
    neutralPhrase: "יש לך יכולת גמישות טובה — נחפש יחד <strong>מצבים שבהם היה קשה יותר לשנות כיוון</strong>, ונתרגל דרכי התמודדות רכות.",
    reflection: "מתי לאחרונה גילית פתרון שלא חשבת עליו קודם?",
  },
  learningCharacteristics: {
    strengthPhrase: "מזהים אצלך <strong>מאפייני למידה אדפטיביים</strong> — היכולות לארגן את עצמך, להתמיד ולהתמודד עם עומס הן חוזקות אמיתיות.",
    growthPhrase: "נבנה יחד <strong>התאמות למידה אישיות</strong> — פירוק משימות לצעדים קטנים, כלי עזר ויזואליים, הפסקות תנועה ופינה שקטה — כדי שהלמידה תרגיש נוחה ומזמינה יותר.",
    neutralPhrase: "יש לך סגנון למידה שאפשר לשכלל — נחפש יחד <strong>איזה כלי עזר קטן יעשה את ההבדל הגדול</strong> ביום־יום הלימודי.",
    reflection: "מה עוזר לך הכי הרבה להתרכז וללמוד טוב?",
  },
};

function buildEmpoweringPlanHTML(session: IntakeSession, planData: PersonalPlanData): string {
  const scores = calculateScores(session.studentResponses, session.parentResponses);
  const ai = planData.aiRecommendations;

  const domainsInOrder: { key: keyof typeof DOMAIN_NARRATIVES; label: string; score: number }[] = [
    { key: "qualityOfLife", label: SECTION_LABELS.quality_of_life, score: scores.qualityOfLife.normalized },
    { key: "selfEfficacy", label: SECTION_LABELS.self_efficacy, score: scores.selfEfficacy.normalized },
    { key: "locusOfControl", label: SECTION_LABELS.locus_of_control, score: scores.locusOfControl.normalized },
    { key: "cognitiveFlexibility", label: SECTION_LABELS.cognitive_flexibility, score: scores.cognitiveFlexibility.normalized },
    { key: "learningCharacteristics", label: SECTION_LABELS.learning_characteristics, score: scores.learningCharacteristics.normalized },
  ];

  const withData = domainsInOrder.filter(d => d.score >= 0);
  const strengths = withData.filter(d => d.score >= 4);
  const growth = withData.filter(d => d.score < 3);
  const neutral = withData.filter(d => d.score >= 3 && d.score < 4);

  const firstName = (session.studentName || "").split(" ")[0] || session.studentName;

  const measured = withData.map(d => DOMAIN_SHORT_LABEL[d.key as string]).filter(Boolean);
  const measuredList =
    measured.length <= 1 ? measured[0] || "" :
    measured.length === 2 ? `${measured[0]} ו${measured[1]}` :
    `${measured.slice(0, -1).join(", ")} ו${measured[measured.length - 1]}`;

  const strengthsList = strengths.map(d => DOMAIN_SHORT_LABEL[d.key as string]).filter(Boolean).join(", ");
  const growthList = growth.map(d => DOMAIN_SHORT_LABEL[d.key as string]).filter(Boolean).join(", ");

  const measuredSentence = measured.length
    ? `בשאלונים נגענו ב<strong>${measuredList}</strong> — כדי להבין איך את/ה חווה את היום־יום שלך.`
    : "";

  // Per-domain narrative sentence (prose with bold key phrases)
  const domainParagraph = (d: typeof withData[number]) => {
    const bits = DOMAIN_NARRATIVES[d.key];
    const short = DOMAIN_SHORT_LABEL[d.key as string] || d.label;
    const oneLiner = DOMAIN_ONE_LINER[d.key as string] || "";
    const phrase = d.score >= 4 ? bits.strengthPhrase : d.score < 3 ? bits.growthPhrase : bits.neutralPhrase;
    return `<div data-section style="margin: 0 0 12px 0;">
      <p style="font-size: 13.5px; margin: 0; text-align: justify;">
        ב<strong>${short}</strong> — ${oneLiner} ${phrase}
      </p>
    </div>`;
  };

  // Supports language — what we want to strengthen and how
  const supportsIntro = growthList
    ? `מהתמונה עולה שנרצה יחד <strong>לחזק ולתמוך</strong> במיוחד ב<strong>${growthList}</strong>.`
    : strengthsList
      ? `יש לך בסיס יציב — נרצה יחד <strong>לשכלל ולהעמיק</strong> את מה שכבר עובד, במיוחד סביב <strong>${strengthsList}</strong>.`
      : `נבחר יחד תחום קטן שמרגיש לך משמעותי ונתחיל ממנו.`;

  const supportsList = (growth.length > 0 ? growth : neutral.length > 0 ? neutral : strengths).slice(0, 3);

  const html = `
    <div style="font-family: 'Heebo', 'Rubik', 'Arial', sans-serif; direction: rtl; padding: 40px 44px; max-width: 700px; margin: 0 auto; color: #1a1a2e; line-height: 1.9;">

      <!-- ===== PAGE 1 — Findings ===== -->
      <div data-section style="text-align: center; margin-bottom: 22px; border-bottom: 2px solid #4a9a7a; padding-bottom: 14px;">
        <h1 style="font-size: 22px; font-weight: 800; color: #1a1a2e; margin: 0 0 4px 0;">תכנית עבודה משותפת</h1>
        <p style="font-size: 12px; color: #4a9a7a; font-weight: 600; margin: 0 0 8px 0;">לבניית תכנית אישית מותאמת על בסיס השאלונים</p>
        <p style="font-size: 16px; font-weight: 700; margin: 0;">${session.studentName}</p>
        <p style="font-size: 11px; color: #666; margin: 2px 0 0 0;">${session.grade || ""} &nbsp;•&nbsp; ${new Date().toLocaleDateString("he-IL")}</p>
      </div>

      <div data-section style="margin-bottom: 12px;">
        <h2 style="font-size: 17px; font-weight: 800; color: #1a1a2e; margin: 0 0 8px 0;">מה עלה בשאלונים</h2>
        <p style="font-size: 13.5px; margin: 0; text-align: justify;">
          ${firstName} יקר/ה, מילאת שאלונים על עצמך — <strong>לא מבחן ולא ציון</strong>. ${measuredSentence}
          מהתשובות שלך מתגבשת <strong>תמונה מילולית</strong> שנעזר בה יחד כדי להבין <strong>מה עוזר לך</strong>, <strong>מה מאתגר אותך</strong>, ואיפה כדאי להתחיל.
        </p>
      </div>
      ${withData.map(domainParagraph).join("")}

      <!-- ===== PAGE 2 — Supports + Goals ===== -->
      <div style="page-break-before: always;"></div>

      <div data-section style="margin-bottom: 18px; border-bottom: 2px solid #4a9a7a; padding-bottom: 10px;">
        <h2 style="font-size: 20px; font-weight: 800; color: #1a1a2e; margin: 0;">מה נרצה לחזק בסמסטר הראשון</h2>
        <p style="font-size: 12px; color: #4a9a7a; font-weight: 600; margin: 4px 0 0 0;">התמיכות שנתמקד בהן יחד • ${session.studentName}</p>
      </div>

      <div data-section style="margin-bottom: 14px;">
        <p style="font-size: 13.5px; margin: 0 0 12px 0; text-align: justify;">
          ${supportsIntro} התמיכות שלנו יכולות להיות <strong>שיחות אישיות</strong> עם המחנכת, <strong>ליווי רגשי</strong> של מדריכה או תרפיסטית, <strong>התאמות למידה</strong> בכיתה, <strong>תרגול מיומנויות חברתיות</strong>, ו<strong>שותפות של ההורים</strong> בבית.
        </p>
      </div>
      ${supportsList.length > 0 ? `
      <div data-section style="margin-bottom: 10px;">
        <p style="font-size: 13.5px; margin: 0 0 6px 0;">בפועל, נשים דגש בעיקר על:</p>
      </div>
      ${supportsList.map(d => {
          const bits = DOMAIN_NARRATIVES[d.key];
          const short = DOMAIN_SHORT_LABEL[d.key as string] || d.label;
          return `<div data-section style="margin: 0 0 8px 0;">
            <p style="font-size: 13px; margin: 0; text-align: justify;">
              <strong>${short}:</strong> ${d.score < 3 ? bits.growthPhrase : d.score >= 4 ? bits.strengthPhrase : bits.neutralPhrase}
            </p>
          </div>`;
        }).join("")}
      ` : ""}
      ${ai?.recommendations && ai.recommendations.length > 0 ? `
      <div data-section style="margin-bottom: 14px;">
        <p style="font-size: 13px; margin: 10px 0 0 0; text-align: justify; color: #333;">
          <strong>רעיונות פתיחה לשיחה:</strong> ${ai.recommendations.slice(0, 3).map(r => r.replace(/^[-•*]\s*/, "")).join(" • ")}
        </p>
      </div>
      ` : ""}

      <div data-section style="margin-bottom: 10px;">
        <h2 style="font-size: 17px; font-weight: 800; color: #1a1a2e; margin: 0 0 6px 0;">שלוש מטרות שנגדיר יחד</h2>
        <p style="font-size: 12.5px; color: #555; margin: 0;">
          נבחר יחד <strong>שלוש מטרות</strong> — יכולות להיות <strong>חברתית, לימודית, רגשית או התנהגותית</strong>. לכל מטרה נרשום את התחום, את המטרה במילים שלך, ואיך נדע שהצלחנו.
        </p>
      </div>
      ${[1, 2, 3].map(n => `
          <div data-section style="margin-bottom: 12px; border: 1px solid #cbd5e0; border-radius: 10px; padding: 12px 16px;">
            <p style="font-size: 13px; font-weight: 700; margin: 0 0 6px 0; color: #4a9a7a;">מטרה ${n} &nbsp;•&nbsp; <span style="color:#888; font-weight:500;">תחום (חברתי / לימודי / רגשי / התנהגותי):</span></p>
            <div style="border-bottom: 1px solid #cbd5e0; height: 18px; margin-bottom: 8px;"></div>
            <p style="font-size: 12px; margin: 4px 0 4px 0; color: #333;"><strong>המטרה במילים שלי:</strong></p>
            <div style="border-bottom: 1px solid #e2e8f0; height: 16px; margin-bottom: 4px;"></div>
            <div style="border-bottom: 1px solid #e2e8f0; height: 16px; margin-bottom: 8px;"></div>
            <p style="font-size: 12px; margin: 4px 0 4px 0; color: #333;"><strong>איך נדע שהצלחנו:</strong></p>
            <div style="border-bottom: 1px solid #e2e8f0; height: 16px;"></div>
          </div>
        `).join("")}

      <div data-section style="border-top: 1px solid #4a9a7a; padding-top: 10px; text-align: center;">
        <p style="font-size: 12px; color: #4a9a7a; font-weight: 600; margin: 0;">אנחנו כאן איתך — צעד אחר צעד.</p>
        <p style="font-size: 10px; color: #999; margin: 4px 0 0 0;">מרום בית אקשטיין • ${new Date().toLocaleDateString("he-IL")}</p>
      </div>
    </div>`;

  return html;
}

export async function generateEmpoweringPlanPDF(
  session: IntakeSession,
  planData: PersonalPlanData,
  options?: { grayscale?: boolean },
) {
  const html = buildEmpoweringPlanHTML(session, planData);
  const suffix = options?.grayscale ? "_שחור_לבן" : "";
  await renderHTMLToPDF(html, `${session.studentName}_תכנית_מעצימה${suffix}.pdf`, options);
}

export async function generateEmpoweringPlanDOC(
  session: IntakeSession,
  planData: PersonalPlanData,
) {
  const inner = buildEmpoweringPlanHTML(session, planData);
  const docHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>${session.studentName} — תכנית מעצימה</title>
  <!--[if gte mso 9]><xml>
    <w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument>
  </xml><![endif]-->
  <style>body{direction:rtl;font-family:'Heebo','Rubik','Arial',sans-serif;}</style>
</head>
<body dir="rtl">${inner}</body>
</html>`;
  // Word opens HTML with the "\ufeff" BOM + application/msword MIME reliably
  const blob = new Blob(["\ufeff", docHtml], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${session.studentName}_תכנית_מעצימה.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------- Class Insights PDF ----------------

export interface ClassInsightsPDFPayload {
  classLabel: string;
  teacherName?: string;
  studentCount: number;
  completedCount: number;
  genderBreakdown: { male: number; female: number; unspecified: number };
  avgScores: Record<string, number>;
  atRiskCount: number;
  cohesion?: number;
  diversity?: number;
  classSummary?: string;
  themedCategories?: {
    title: string;
    type?: string;
    description: string;
    relatedItems?: string[];
    students?: string[];
    practices?: string[];
  }[];
  groupTherapyFocus?: { topic: string; rationale: string; techniques: string[] };
  groupWorkGoals?: {
    goal: string;
    domain?: string;
    indicator?: string;
    weeklyPractice?: string;
    targetStudents?: string[];
  }[];
  subGroups?: { label: string; students: string[]; sharedNeed: string; suggestedIntervention: string }[];
  anchors?: { name: string; why: string }[];
  atRisk?: { name: string; why: string; priority?: string }[];
  pedagogicalNote?: string;
}

function buildClassInsightsHTML(p: ClassInsightsPDFPayload): string {
  const domainLabelHe: Record<string, string> = {
    qualityOfLife: "איכות חיים",
    selfEfficacy: "מסוגלות עצמית",
    locusOfControl: "מיקוד שליטה",
    cognitiveFlexibility: "גמישות קוגניטיבית",
    learningCharacteristics: "מאפייני למידה",
  };
  const fmt = (n: number) => (n > 0 ? n.toFixed(2) : "—");
  return `
  <div style="font-family: 'Heebo','Rubik','Arial',sans-serif; direction: rtl; padding: 32px; max-width: 700px; margin: 0 auto; color: #1a1a2e; line-height: 1.6;">
    <div data-section style="border-bottom: 3px solid #4a9a7a; padding-bottom: 14px; margin-bottom: 20px;">
      <h1 style="font-size: 22px; font-weight: 800; margin: 0 0 6px 0;">תמונה כיתתית — ${p.classLabel}</h1>
      <p style="font-size: 12px; color: #4a9a7a; font-weight: 600; margin: 0;">מרום בית אקשטיין • מסמך עבודה קבוצתית</p>
      ${p.teacherName ? `<p style="font-size: 12px; color: #555; margin: 4px 0 0 0;">מחנכת: ${p.teacherName}</p>` : ""}
      <p style="font-size: 11px; color: #888; margin: 4px 0 0 0;">${new Date().toLocaleDateString("he-IL")}</p>
    </div>

    <div data-section style="margin-bottom: 18px;">
      <h2 style="font-size: 15px; font-weight: 700; margin: 0 0 10px 0;">מבט מהיר</h2>
      <table style="width:100%; border-collapse: collapse; font-size: 12px;">
        <tr>
          <td style="border:1px solid #e2e8f0; padding:8px; background:#f8faff;"><b>תלמידים בכיתה:</b> ${p.studentCount}</td>
          <td style="border:1px solid #e2e8f0; padding:8px; background:#f8faff;"><b>מילאו שאלון:</b> ${p.completedCount}</td>
        </tr>
        <tr>
          <td style="border:1px solid #e2e8f0; padding:8px;"><b>בנים:</b> ${p.genderBreakdown.male} · <b>בנות:</b> ${p.genderBreakdown.female}${p.genderBreakdown.unspecified ? ` · לא צוין: ${p.genderBreakdown.unspecified}` : ""}</td>
          <td style="border:1px solid #e2e8f0; padding:8px;"><b>דגלי תשומת לב:</b> ${p.atRiskCount}</td>
        </tr>
        ${p.cohesion !== undefined ? `<tr>
          <td style="border:1px solid #e2e8f0; padding:8px;"><b>לכידות פרופיל:</b> ${p.cohesion}%</td>
          <td style="border:1px solid #e2e8f0; padding:8px;"><b>מגוון בכיתה:</b> ${p.diversity ?? 100 - (p.cohesion || 0)}%</td>
        </tr>` : ""}
      </table>
    </div>

    <div data-section style="margin-bottom: 18px;">
      <h2 style="font-size: 15px; font-weight: 700; margin: 0 0 10px 0;">ממוצעים כיתתיים לפי תחום (1–5)</h2>
      <table style="width:100%; border-collapse: collapse; font-size: 12px;">
        ${Object.entries(p.avgScores).map(([k, v]) => `
          <tr>
            <td style="border:1px solid #e2e8f0; padding:6px 8px; background:#fafcfd;">${domainLabelHe[k] || k}</td>
            <td style="border:1px solid #e2e8f0; padding:6px 8px; font-weight:700; text-align:center;">${fmt(v)}</td>
          </tr>`).join("")}
      </table>
    </div>

    ${p.classSummary ? `
    <div data-section style="margin-bottom: 18px; background:#f0f7f2; border:1px solid #cfe3d6; border-radius:8px; padding:12px 14px;">
      <h2 style="font-size: 15px; font-weight: 700; margin: 0 0 6px 0; color:#276749;">תמונה כללית</h2>
      <p style="font-size: 13px; margin:0; text-align: justify;">${p.classSummary}</p>
    </div>` : ""}

    ${p.themedCategories && p.themedCategories.length ? `
    <div data-section style="margin-bottom: 18px;">
      <h2 style="font-size: 16px; font-weight: 800; margin: 0 0 10px 0;">קטגוריות עבודה</h2>
      ${p.themedCategories.map(c => `
        <div data-section style="border:1px solid #e2e8f0; border-radius:8px; padding:12px 14px; margin-bottom: 10px; background:#fff;">
          <p style="font-size: 14px; font-weight:800; margin:0 0 4px 0;">${c.title}${c.type ? ` <span style="font-size:10px; font-weight:600; color:#666;">(${c.type === "strength" ? "חוזקה" : c.type === "challenge" ? "אתגר" : "מעורב"})</span>` : ""}</p>
          <p style="font-size: 12.5px; margin:0 0 6px 0; text-align: justify;">${c.description}</p>
          ${c.students && c.students.length ? `<p style="font-size:11.5px; color:#4a9a7a; margin:0 0 4px 0;"><b>תלמידים רלוונטיים:</b> ${c.students.join(" · ")}</p>` : ""}
          ${c.practices && c.practices.length ? `
            <p style="font-size:12px; font-weight:700; margin:6px 0 2px 0;">פרקטיקות מומלצות:</p>
            <ul style="margin:0; padding-inline-start:18px; font-size:12px;">
              ${c.practices.map(pr => `<li style="margin-bottom:2px;">${pr}</li>`).join("")}
            </ul>` : ""}
        </div>`).join("")}
    </div>` : ""}

    ${p.groupTherapyFocus ? `
    <div data-section style="margin-bottom: 18px; background:#fffaf0; border:1px solid #f4d9a5; border-radius:8px; padding:12px 14px;">
      <h2 style="font-size: 15px; font-weight: 800; margin: 0 0 6px 0; color:#8a5b00;">מוקד הטיפול הקבוצתי השבועי</h2>
      <p style="font-size: 13px; font-weight:700; margin:0 0 4px 0;">${p.groupTherapyFocus.topic}</p>
      <p style="font-size: 12px; margin:0 0 6px 0; text-align:justify;">${p.groupTherapyFocus.rationale}</p>
      ${p.groupTherapyFocus.techniques?.length ? `<ul style="margin:0; padding-inline-start:18px; font-size:12px;">${p.groupTherapyFocus.techniques.map(t => `<li>${t}</li>`).join("")}</ul>` : ""}
    </div>` : ""}

    ${p.groupWorkGoals && p.groupWorkGoals.length ? `
    <div data-section style="margin-bottom: 18px;">
      <h2 style="font-size: 16px; font-weight: 800; margin: 0 0 10px 0;">מטרות עבודה קבוצתית</h2>
      ${p.groupWorkGoals.map((g, i) => `
        <div data-section style="border:1px solid #cbd5e0; border-radius:8px; padding:10px 14px; margin-bottom:8px;">
          <p style="font-size:13px; font-weight:800; margin:0 0 4px 0; color:#276749;">מטרה ${i + 1}${g.domain ? ` · ${g.domain}` : ""}</p>
          <p style="font-size:13px; margin:0 0 4px 0;">${g.goal}</p>
          ${g.indicator ? `<p style="font-size:11.5px; margin:0 0 2px 0;"><b>אינדיקטור התקדמות:</b> ${g.indicator}</p>` : ""}
          ${g.weeklyPractice ? `<p style="font-size:11.5px; margin:0 0 2px 0;"><b>פרקטיקה שבועית:</b> ${g.weeklyPractice}</p>` : ""}
          ${g.targetStudents && g.targetStudents.length ? `<p style="font-size:11.5px; margin:0; color:#4a9a7a;"><b>מיועד ל:</b> ${g.targetStudents.join(" · ")}</p>` : ""}
        </div>`).join("")}
    </div>` : ""}

    ${p.subGroups && p.subGroups.length ? `
    <div data-section style="margin-bottom: 18px;">
      <h2 style="font-size: 15px; font-weight: 700; margin: 0 0 8px 0;">תת-קבוצות</h2>
      ${p.subGroups.map(g => `
        <div data-section style="border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; margin-bottom:8px;">
          <p style="font-size:13px; font-weight:700; margin:0;">${g.label}</p>
          <p style="font-size:11.5px; color:#666; margin:2px 0 4px 0;">${g.students.join(" · ")}</p>
          <p style="font-size:12px; margin:0 0 2px 0;"><b>משותף:</b> ${g.sharedNeed}</p>
          <p style="font-size:12px; margin:0;"><b>מומלץ:</b> ${g.suggestedIntervention}</p>
        </div>`).join("")}
    </div>` : ""}

    ${(p.anchors && p.anchors.length) || (p.atRisk && p.atRisk.length) ? `
    <div data-section style="margin-bottom: 18px; display: flex; gap: 12px;">
      ${p.anchors && p.anchors.length ? `
        <div style="flex:1; border:1px solid #cfe3d6; border-radius:8px; padding:10px 12px; background:#f0f7f2;">
          <p style="font-size:13px; font-weight:700; margin:0 0 6px 0; color:#276749;">תלמידים עוגן</p>
          <ul style="margin:0; padding-inline-start:16px; font-size:11.5px;">
            ${p.anchors.map(a => `<li><b>${a.name}:</b> ${a.why}</li>`).join("")}
          </ul>
        </div>` : ""}
      ${p.atRisk && p.atRisk.length ? `
        <div style="flex:1; border:1px solid #f4d9a5; border-radius:8px; padding:10px 12px; background:#fffaf0;">
          <p style="font-size:13px; font-weight:700; margin:0 0 6px 0; color:#8a5b00;">בסיכון מוגבר</p>
          <ul style="margin:0; padding-inline-start:16px; font-size:11.5px;">
            ${p.atRisk.map(a => `<li><b>${a.name}:</b> ${a.why}</li>`).join("")}
          </ul>
        </div>` : ""}
    </div>` : ""}

    ${p.pedagogicalNote ? `
    <div data-section style="margin-bottom: 18px; background:#f8faff; border:1px solid #dbe4f0; border-radius:8px; padding:12px 14px;">
      <h2 style="font-size: 14px; font-weight: 700; margin: 0 0 4px 0;">הערה למחנכת</h2>
      <p style="font-size: 12.5px; margin:0; text-align:justify;">${p.pedagogicalNote}</p>
    </div>` : ""}

    <div data-section style="border-top: 1px solid #4a9a7a; padding-top: 10px; text-align: center; margin-top: 20px;">
      <p style="font-size: 11px; color: #4a9a7a; font-weight: 600; margin: 0;">מרום בית אקשטיין • תמונה כיתתית לעבודה קבוצתית</p>
      <p style="font-size: 10px; color: #999; margin: 4px 0 0 0;">מסמך חסוי — ${new Date().toLocaleDateString("he-IL")}</p>
    </div>
  </div>`;
}

export async function generateClassInsightsPDF(payload: ClassInsightsPDFPayload) {
  const html = buildClassInsightsHTML(payload);
  const safe = payload.classLabel.replace(/[^\p{L}\p{N}_-]+/gu, "_");
  await renderSectionsToPDF(html, `תמונה_כיתתית_${safe}.pdf`);
}

/**
 * Section-based PDF renderer: renders each top-level [data-section] as its own
 * bitmap and packs them onto A4 pages without splitting a section unless it is
 * taller than a full page. When a section is oversized, it is sliced only at
 * horizontal whitespace rows so no text line is cut mid-glyph. Empty trailing
 * pages are never produced.
 */
async function renderSectionsToPDF(html: string, filename: string) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "700px";
  container.style.background = "white";
  container.innerHTML = html;
  document.body.appendChild(container);

  await document.fonts.ready;

  try {
    // The HTML wraps everything in a single outer div. Grab its direct
    // [data-section] children — nested sections inside cards stay atomic.
    const wrapper = container.firstElementChild as HTMLElement;
    const sectionEls = wrapper
      ? (Array.from(wrapper.children).filter((el) =>
          (el as HTMLElement).hasAttribute("data-section"),
        ) as HTMLElement[])
      : [];

    // Render the whole container once, then slice per-section. This preserves
    // any layout that html2canvas struggles with when capturing single elements
    // (e.g. flex rows, negative offsets, contexts inherited from parents).
    const fullCanvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });
    const pxPerCssPx = fullCanvas.height / container.scrollHeight;

    // Measure each section relative to the container using offsetTop chain,
    // which is robust to fixed/absolute positioning of the container.
    const offsetFromContainer = (el: HTMLElement): number => {
      let y = 0;
      let cur: HTMLElement | null = el;
      while (cur && cur !== container) {
        y += cur.offsetTop;
        cur = cur.offsetParent as HTMLElement | null;
      }
      return y;
    };
    const sections = sectionEls.map((el) => {
      const top = offsetFromContainer(el);
      return {
        topPx: Math.max(0, Math.round(top * pxPerCssPx)),
        bottomPx: Math.round((top + el.offsetHeight) * pxPerCssPx),
      };
    });
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const marginMm = 8;
    const usableWmm = pdfWidth - marginMm * 2;
    const usableHmm = pdfHeight - marginMm * 2;
    const gapMm = 4;
    // Canvas-px per mm along the width axis.
    const pxPerMm = fullCanvas.width / usableWmm;

    let cursorMm = 0; // used vertical space on current page, in mm
    // jsPDF starts with a blank first page. We draw directly onto it and only
    // add a new page on overflow.
    const newPage = () => {
      pdf.addPage();
      cursorMm = 0;
    };

    const addImage = (
      dataUrl: string,
      widthMm: number,
      heightMm: number,
      yMm: number,
    ) => {
      pdf.addImage(dataUrl, "PNG", marginMm, yMm, widthMm, heightMm);
    };

    /** Find a whitespace break row scanning up from targetY. */
    const findWhitespaceRow = (
      canvas: HTMLCanvasElement,
      targetY: number,
      minY: number,
    ): number | null => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      const w = canvas.width;
      const searchLimit = Math.max(minY, targetY - Math.floor(canvas.height * 0.25));
      for (let y = Math.min(targetY, canvas.height - 1); y >= searchLimit; y -= 2) {
        const row = ctx.getImageData(0, y, w, 1).data;
        let whiteish = true;
        for (let i = 0; i < row.length; i += 4) {
          if (row[i] < 245 || row[i + 1] < 245 || row[i + 2] < 245) { whiteish = false; break; }
        }
        if (whiteish) return y;
      }
      return null;
    };

    const drawSlice = (canvas: HTMLCanvasElement, sliceStart: number, sliceEnd: number): string => {
      const sliceH = sliceEnd - sliceStart;
      const c = document.createElement("canvas");
      c.width = canvas.width;
      c.height = sliceH;
      const cx = c.getContext("2d")!;
      cx.fillStyle = "#ffffff";
      cx.fillRect(0, 0, c.width, c.height);
      cx.drawImage(canvas, 0, sliceStart, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      return c.toDataURL("image/png");
    };

    for (const sec of sections) {
      const sliceStartPx = sec.topPx;
      const sliceEndPx = sec.bottomPx;
      if (sliceEndPx <= sliceStartPx) continue;
      const secWmm = usableWmm;
      const secFullHmm = (sliceEndPx - sliceStartPx) / pxPerMm;
      // eslint-disable-next-line no-console
      console.log("[PDF]sec", sliceStartPx, sliceEndPx, "hmm", secFullHmm.toFixed(1), "cursor", cursorMm.toFixed(1), "page", pdf.getNumberOfPages());

      // Case A: fits on a page as a single image.
      if (secFullHmm <= usableHmm) {
        const gapNeeded = cursorMm > 0 ? gapMm : 0;
        if (cursorMm + gapNeeded + secFullHmm > usableHmm) newPage();
        const yMm = marginMm + cursorMm + (cursorMm > 0 ? gapMm : 0);
        const dataUrl = drawSlice(fullCanvas, sliceStartPx, sliceEndPx);
        addImage(dataUrl, secWmm, secFullHmm, yMm);
        cursorMm += (cursorMm > 0 ? gapMm : 0) + secFullHmm;
        continue;
      }

      // Case B: taller than a page — slice at whitespace rows.
      if (cursorMm > 0) newPage();
      const pxPerPage = usableHmm * pxPerMm;
      let sliceStart = sliceStartPx;
      while (sliceStart < sliceEndPx) {
        const targetEnd = Math.min(sliceStart + pxPerPage, sliceEndPx);
        let sliceEnd = targetEnd;
        if (targetEnd < sliceEndPx) {
          const ws = findWhitespaceRow(fullCanvas, Math.floor(targetEnd), sliceStart + Math.floor(pxPerPage * 0.4));
          if (ws && ws > sliceStart + 40) sliceEnd = ws;
        }
        if (sliceEnd <= sliceStart) sliceEnd = Math.min(sliceStart + Math.floor(pxPerPage), sliceEndPx);
        // eslint-disable-next-line no-console
        console.log("[PDF]slice", sliceStart, sliceEnd, "of", sliceEndPx, "page", pdf.getNumberOfPages());
        const dataUrl = drawSlice(fullCanvas, sliceStart, sliceEnd);
        const sliceHmm = (sliceEnd - sliceStart) / pxPerMm;
        addImage(dataUrl, secWmm, sliceHmm, marginMm);
        sliceStart = sliceEnd;
        if (sliceStart < sliceEndPx) newPage();
      }
      cursorMm = usableHmm; // force next section to a new page
    }

    // No trailing empty pages — we only call addPage between real content.
    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}
