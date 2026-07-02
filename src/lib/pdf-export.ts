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

  const paragraphFor = (d: typeof withData[number]) => {
    const bits = DOMAIN_NARRATIVES[d.key];
    if (d.score >= 4) return bits.strengthPhrase;
    if (d.score < 3) return bits.growthPhrase;
    return bits.neutralPhrase;
  };

  const firstName = (session.studentName || "").split(" ")[0] || session.studentName;

  // Which domains were actually measured (has data)
  const measured = withData.map(d => DOMAIN_SHORT_LABEL[d.key as string]).filter(Boolean);
  const measuredList =
    measured.length <= 1 ? measured[0] || "" :
    measured.length === 2 ? `${measured[0]} ו${measured[1]}` :
    `${measured.slice(0, -1).join(", ")} ו${measured[measured.length - 1]}`;

  const strengthsList = strengths.map(d => DOMAIN_SHORT_LABEL[d.key as string]).filter(Boolean).join(", ");
  const growthList = growth.map(d => DOMAIN_SHORT_LABEL[d.key as string]).filter(Boolean).join(", ");

  let html = `
    <div style="font-family: 'Heebo', 'Rubik', 'Arial', sans-serif; direction: rtl; padding: 44px; max-width: 700px; margin: 0 auto; color: #1a1a2e; line-height: 1.85;">
      <div data-section style="text-align: center; margin-bottom: 28px; border-bottom: 3px solid #4a9a7a; padding-bottom: 20px;">
        <h1 style="font-size: 26px; font-weight: 800; color: #1a1a2e; margin: 0 0 6px 0;">מפה אישית לבניית תכנית משותפת</h1>
        <p style="font-size: 14px; color: #4a9a7a; font-weight: 600; margin: 0 0 10px 0;">מרום בית אקשטיין • דף עבודה של תלמיד/ה ומחנכת יחד</p>
        <p style="font-size: 18px; font-weight: 700; margin: 0;">${session.studentName}</p>
        <p style="font-size: 12px; color: #666; margin: 4px 0 0 0;">${session.grade || ""} &nbsp;•&nbsp; ${new Date().toLocaleDateString("he-IL")}</p>
      </div>

      <div data-section style="margin-bottom: 24px; background: #f0faf4; border-right: 4px solid #4a9a7a; border-radius: 8px; padding: 16px 20px;">
        <p style="font-size: 14px; margin: 0 0 8px 0; color: #1a1a2e;">
          ${firstName} יקר/ה, זה <strong>דף עבודה משותף</strong> — אין כאן מבחן, אין כאן שיפוט. מילאת שאלונים על עצמך, ומהתשובות שלך יצרנו יחד מפה קטנה
          שמסייעת לנו — לך, למחנכת, למדריכה ולתרפיסטית — <strong>לבנות תכנית תמיכה מותאמת</strong> לצעד הבא שלך.
        </p>
        <p style="font-size: 14px; margin: 0; color: #1a1a2e;">
          המפה נוגעת בכמה תחומים חשובים בחיים שלך: <strong>למידה, חברתי, רגשי, תפיסה עצמית וחוסן</strong> — וההחלטות תמיד יילקחו יחד איתך.
        </p>
      </div>

      <div data-section style="margin-bottom: 24px;">
        <h2 style="font-size: 17px; font-weight: 700; color: #4a9a7a; margin: 0 0 10px 0;">📖 מה בדקנו יחד בשאלונים</h2>
        <p style="font-size: 13px; color: #333; margin: 0 0 10px 0;">
          בשאלונים שמילאת נגענו בכמה תחומים — לכל אחד יש הסבר קצרצר:
        </p>
        ${withData.map(d => `
          <div style="margin-bottom: 8px; padding: 8px 12px; background: #fafcfd; border: 1px solid #e2e8f0; border-radius: 8px;">
            <strong style="font-size: 13px; color: #1a1a2e;">${DOMAIN_SHORT_LABEL[d.key as string] || d.label}</strong>
            <p style="font-size: 12px; color: #555; margin: 2px 0 0 0;">${DOMAIN_ONE_LINER[d.key as string] || ""}</p>
          </div>
        `).join("")}
        ${strengthsList || growthList ? `
          <p style="font-size: 13px; color: #1a1a2e; margin: 12px 0 0 0;">
            ${strengthsList ? `היו תחומים שבהם סימנת שאת/ה מרגיש/ה <strong>מוצלח/ת ובעל/ת כוח</strong> — כמו <strong>${strengthsList}</strong>.` : ""}
            ${growthList ? ` יש גם דברים שבחרת <strong>לסמן על עצמך שהיית רוצה לעבוד עליהם</strong> — כמו <strong>${growthList}</strong>.` : ""}
            עכשיו נגדיר יחד <strong>אילו מטרות אנחנו רוצים לבחור</strong> כדי לצעוד קדימה.
          </p>
        ` : ""}
      </div>`;

  if (strengths.length > 0) {
    html += `
      <div data-section style="margin-bottom: 22px;">
        <h2 style="font-size: 17px; font-weight: 700; color: #276749; margin: 0 0 10px 0;">✨ מה בולט אצלך לטובה</h2>
        ${strengths.map(d => `
          <div style="margin-bottom: 10px; background: #f0faf4; border: 1px solid #c6f6d5; border-radius: 10px; padding: 12px 16px;">
            <strong style="font-size: 14px; color: #276749;">${d.label}</strong>
            <p style="font-size: 13px; margin: 4px 0 0 0; color: #1a1a2e;">${paragraphFor(d)}</p>
          </div>
        `).join("")}
      </div>`;
  }

  if (growth.length > 0) {
    html += `
      <div data-section style="margin-bottom: 22px;">
        <h2 style="font-size: 17px; font-weight: 700; color: #2b6cb0; margin: 0 0 10px 0;">🌱 מה נצעד בו יחד</h2>
        ${growth.map(d => `
          <div style="margin-bottom: 10px; background: #f0f7ff; border: 1px solid #bee3f8; border-radius: 10px; padding: 12px 16px;">
            <strong style="font-size: 14px; color: #2b6cb0;">${d.label}</strong>
            <p style="font-size: 13px; margin: 4px 0 0 0; color: #1a1a2e;">${paragraphFor(d)}</p>
          </div>
        `).join("")}
      </div>`;
  }

  if (neutral.length > 0) {
    html += `
      <div data-section style="margin-bottom: 22px;">
        <h2 style="font-size: 17px; font-weight: 700; color: #4a9a7a; margin: 0 0 10px 0;">🌿 בסיס יציב שאפשר לשכלל</h2>
        ${neutral.map(d => `
          <div style="margin-bottom: 10px; background: #f8fdf9; border: 1px solid #d4edda; border-radius: 10px; padding: 12px 16px;">
            <strong style="font-size: 14px; color: #4a9a7a;">${d.label}</strong>
            <p style="font-size: 13px; margin: 4px 0 0 0; color: #1a1a2e;">${paragraphFor(d)}</p>
          </div>
        `).join("")}
      </div>`;
  }

  if (ai?.recommendations && ai.recommendations.length > 0) {
    html += `
      <div data-section style="margin-bottom: 22px; background: #fffaf0; border: 1px solid #feebc8; border-radius: 10px; padding: 16px 20px;">
        <h2 style="font-size: 16px; font-weight: 700; color: #975a16; margin: 0 0 10px 0;">💡 רעיונות ראשונים לצעדים קטנים</h2>
        ${ai.recommendations.slice(0, 5).map((r) => `
          <p style="font-size: 13px; margin: 6px 0; color: #1a1a2e;">• ${r}</p>
        `).join("")}
        <p style="font-size: 11px; color: #888; margin: 8px 0 0 0;">אלה הצעות פתיחה — נבחר יחד מה מתאים לך ומה נדחה לפעם אחרת.</p>
      </div>`;
  }

  // Reflection questions — always show, pull from focus areas + defaults
  const focusForQuestions = (growth.length > 0 ? growth : neutral).slice(0, 3);
  const reflections = focusForQuestions.map(d => DOMAIN_NARRATIVES[d.key].reflection);
  while (reflections.length < 4) {
    const filler = [
      "באילו תחומים היית רוצה שנתמקד יחד?",
      "מה חשוב לך שנדע עליך כשאנחנו בונים את התכנית?",
      "מי בסביבה שלך יכול לתמוך בך בצעד הזה?",
      "איך תדע/י שהצלחנו — מה יהיה סימן טוב?",
    ][reflections.length];
    if (!filler) break;
    reflections.push(filler);
  }

  // 5-axis mapping — connecting the picture to real life
  const axes: { emoji: string; title: string; intro: string; questions: string[] }[] = [
    {
      emoji: "📚",
      title: "למידה",
      intro: "איך הלמידה מרגישה לך — מה עוזר לך להתרכז, לזכור וללמוד בכיף.",
      questions: [
        "באיזה שיעור את/ה מרגיש/ה הכי 'זורם/ת'? מה עוזר לך שם?",
        "מה מפריע לך הכי הרבה בזמן למידה — רעש, עייפות, תחושת עומס?",
        "איזה כלי עזר קטן היית רוצה לנסות (הפסקה, תזכורת, פירוק משימה)?",
      ],
    },
    {
      emoji: "🤝",
      title: "חברתי",
      intro: "הקשרים שלך עם חברים, שייכות לכיתה, וההרגשה במעגלים החברתיים.",
      questions: [
        "מי החברים/המבוגרים שאיתם את/ה מרגיש/ה בנוח להיות עצמך?",
        "מה היית רוצה שיהיה שונה במפגשים החברתיים בבית הספר?",
        "מתי לאחרונה הרגשת שייכות טובה — מה קרה שם?",
      ],
    },
    {
      emoji: "💗",
      title: "רגשי",
      intro: "איך את/ה מזהה, מבין/ה ומווסת/ת רגשות — במיוחד ברגעים קשים.",
      questions: [
        "מה עוזר לך להירגע כשאת/ה מרגיש/ה מוצף/ת?",
        "לאיזה רגש היית רוצה להכיר טוב יותר — כעס, פחד, עצב, שמחה?",
        "מי הכתובת שלך כשקשה — ומה היית רוצה להוסיף לרשימה הזאת?",
      ],
    },
    {
      emoji: "🪞",
      title: "תפיסה עצמית",
      intro: "איך את/ה רואה את עצמך — הכוחות, הערך והאמון בעצמך.",
      questions: [
        "מה שלוש המילים שהיית רוצה שיתארו אותך?",
        "באיזה תחום היית רוצה להרגיש 'אני יכול/ה' יותר?",
        "מהי הצלחה קטנה מהתקופה האחרונה שאת/ה גאה בה?",
      ],
    },
    {
      emoji: "🛡️",
      title: "חוסן",
      intro: "היכולת שלך לקום אחרי אתגר, לבקש עזרה ולהמשיך הלאה.",
      questions: [
        "מה עזר לך פעם להתאושש ממצב לא פשוט?",
        "מי המבוגר/ת שהיית רוצה לדעת שאפשר לפנות אליו/ה?",
        "איזה משפט קטן היית רוצה להגיד לעצמך ברגעים קשים?",
      ],
    },
  ];

  html += `
    <div data-section style="margin-bottom: 22px;">
      <h2 style="font-size: 17px; font-weight: 700; color: #1a1a2e; margin: 0 0 6px 0;">🗺️ המפה שלנו — חמישה תחומים בחיים שלך</h2>
      <p style="font-size: 12px; color: #555; margin: 0 0 12px 0;">
        התכנית שאנחנו בונים יחד נוגעת בכל התחומים האלה. בכל תחום כמה שאלות מנחות שיעזרו לנו לדבר, לחלום ולבחור מטרות ריאליות.
      </p>
      ${axes.map(a => `
        <div style="margin-bottom: 12px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
          <div style="background: #f0faf4; padding: 8px 14px;">
            <strong style="font-size: 14px; color: #276749;">${a.emoji} ${a.title}</strong>
            <p style="font-size: 11px; color: #555; margin: 2px 0 0 0;">${a.intro}</p>
          </div>
          <div style="padding: 10px 16px;">
            ${a.questions.map((q, i) => `
              <p style="font-size: 12px; margin: 4px 0; color: #1a1a2e;"><strong style="color: #4a9a7a;">${i + 1}.</strong> ${q}</p>
            `).join("")}
            <div style="border-bottom: 1px solid #cbd5e0; height: 18px; margin-top: 6px;"></div>
            <div style="border-bottom: 1px solid #cbd5e0; height: 18px; margin-top: 6px;"></div>
          </div>
        </div>
      `).join("")}
    </div>`;

  html += `
    <div data-section style="margin-bottom: 22px; background: #faf5ff; border: 1px solid #e9d8fd; border-radius: 10px; padding: 18px 22px;">
      <h2 style="font-size: 17px; font-weight: 700; color: #6b46c1; margin: 0 0 12px 0;">🗣️ שאלות שנחשוב עליהן יחד</h2>
      <p style="font-size: 12px; color: #555; margin: 0 0 10px 0;">אין תשובות נכונות או לא נכונות — רק תשובות שמרגישות לך נכונות.</p>
      ${reflections.slice(0, 5).map((q, i) => `
        <p style="font-size: 13px; margin: 8px 0; color: #1a1a2e;"><strong style="color: #6b46c1;">${i + 1}.</strong> ${q}</p>
      `).join("")}
    </div>`;

  html += `
    <div data-section style="margin-bottom: 22px; background: #f7fafc; border: 1px dashed #cbd5e0; border-radius: 10px; padding: 18px 22px;">
      <h2 style="font-size: 16px; font-weight: 700; color: #1a1a2e; margin: 0 0 10px 0;">📝 המקום שלי לרשום</h2>
      <p style="font-size: 12px; color: #555; margin: 0 0 12px 0;">בחר/י 1–3 מטרות משותפות שהיית רוצה להתחיל בהן יחד עם המחנכת/המדריכה/התרפיסטית, ורשום/י את הצעדים הראשונים:</p>
      <div style="border-bottom: 1px solid #cbd5e0; height: 20px; margin-bottom: 10px;"></div>
      <div style="border-bottom: 1px solid #cbd5e0; height: 20px; margin-bottom: 10px;"></div>
      <div style="border-bottom: 1px solid #cbd5e0; height: 20px; margin-bottom: 10px;"></div>
      <div style="border-bottom: 1px solid #cbd5e0; height: 20px;"></div>
    </div>

    <div data-section style="border-top: 2px solid #4a9a7a; padding-top: 14px; margin-top: 24px; text-align: center;">
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
