import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSessionDB, updateSessionDB, getAssessmentRounds, createAssessmentRound, AssessmentRound } from "@/lib/supabase-storage";
import { IntakeSession, SECTION_LABELS, OPEN_QUESTION_LABELS, QOL_SUBDOMAIN_LABELS, GASGoal } from "@/lib/types";
import { calculateScores, calculateQoLSubdomains, generateRiskFlags, generateInsights, generateGASGoals, getScoreLabel, getScoreColor, getTopFocusAreas } from "@/lib/scoring";
import { DOMAIN_DESCRIPTIONS, QOL_SUBDOMAIN_DESCRIPTIONS, getScoreInterpretation } from "@/lib/domain-descriptions";
import StatusBadge from "@/components/StatusBadge";
import { ArrowRight, AlertTriangle, Copy, CheckCircle, Lock, Unlock, FileText, Target, Lightbulb, TrendingUp, Users, Printer, MessageSquare, BarChart3, Shield, Loader2, RefreshCw, Download, PenLine, ScrollText, ClipboardList, Heart, Info } from "lucide-react";
import SupportPlans from "@/components/SupportPlans";
import AIRecommendations from "@/components/AIRecommendations";
import { generateStudentPDF, generatePersonalPlanPDF, PersonalPlanData } from "@/lib/pdf-export";
import { supabase } from "@/integrations/supabase/client";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from "recharts";

const StudentProfile = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<IntakeSession | null>(null);
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [notesSaved, setNotesSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [consentSignature, setConsentSignature] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<PersonalPlanData["aiRecommendations"] | null>(null);
  const [supportPlansData, setSupportPlansData] = useState<PersonalPlanData["supportPlans"]>([]);
  const [rounds, setRounds] = useState<AssessmentRound[]>([]);
  const [showNewRound, setShowNewRound] = useState(false);
  const [newRoundLabel, setNewRoundLabel] = useState("");
  const [newRoundParticipants, setNewRoundParticipants] = useState<string>("both");
  const printRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    if (!sessionId) return;
    const s = await getSessionDB(sessionId);
    if (!s) { navigate("/admin"); return; }
    setSession(s);
    setNotes(s.adminNotes || "");

    const { data: raw } = await (supabase as any).from("intake_sessions").select("consent_signature").eq("id", sessionId).maybeSingle();
    if (raw) {
      setConsentSignature(raw.consent_signature);
    }
    setLoading(false);
  }, [sessionId, navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const scores = calculateScores(session.studentResponses, session.parentResponses);
  const qolSubdomains = calculateQoLSubdomains(session.studentResponses, session.parentResponses);
  const riskFlags = generateRiskFlags(scores);
  const insights = generateInsights(scores);
  const gasGoals = generateGASGoals(scores);
  const focusAreas = getTopFocusAreas(scores);

  const hasReassessment = session.reassessmentStudentResponses && Object.keys(session.reassessmentStudentResponses).length > 0;
  const reassessmentScores = hasReassessment
    ? calculateScores(session.reassessmentStudentResponses!, session.reassessmentParentResponses || {})
    : null;
  const reassessmentQoLSubdomains = hasReassessment
    ? calculateQoLSubdomains(session.reassessmentStudentResponses!, session.reassessmentParentResponses || {})
    : null;

  const radarData = [
    { subject: "איכות חיים", student: scores.qualityOfLife.studentNormalized, parent: scores.qualityOfLife.parentNormalized },
    { subject: "מסוגלות עצמית", student: scores.selfEfficacy.studentNormalized, parent: scores.selfEfficacy.parentNormalized },
    { subject: "מיקוד שליטה", student: scores.locusOfControl.studentNormalized, parent: scores.locusOfControl.parentNormalized },
    { subject: "גמישות קוגניטיבית", student: scores.cognitiveFlexibility.studentNormalized, parent: scores.cognitiveFlexibility.parentNormalized },
  ].map((d) => ({ ...d, student: d.student >= 0 ? d.student : 0, parent: d.parent >= 0 ? d.parent : 0 }));

  const hasStudentData = scores.qualityOfLife.studentNormalized >= 0;
  const hasParentData = scores.qualityOfLife.parentNormalized >= 0;

  const timelineData = reassessmentScores ? [
    { label: SECTION_LABELS.quality_of_life, קליטה: scores.qualityOfLife.studentNormalized >= 0 ? scores.qualityOfLife.studentNormalized : 0, סיכום: reassessmentScores.qualityOfLife.studentNormalized >= 0 ? reassessmentScores.qualityOfLife.studentNormalized : 0 },
    { label: SECTION_LABELS.self_efficacy, קליטה: scores.selfEfficacy.studentNormalized >= 0 ? scores.selfEfficacy.studentNormalized : 0, סיכום: reassessmentScores.selfEfficacy.studentNormalized >= 0 ? reassessmentScores.selfEfficacy.studentNormalized : 0 },
    { label: SECTION_LABELS.locus_of_control, קליטה: scores.locusOfControl.studentNormalized >= 0 ? scores.locusOfControl.studentNormalized : 0, סיכום: reassessmentScores.locusOfControl.studentNormalized >= 0 ? reassessmentScores.locusOfControl.studentNormalized : 0 },
    { label: SECTION_LABELS.cognitive_flexibility, קליטה: scores.cognitiveFlexibility.studentNormalized >= 0 ? scores.cognitiveFlexibility.studentNormalized : 0, סיכום: reassessmentScores.cognitiveFlexibility.studentNormalized >= 0 ? reassessmentScores.cognitiveFlexibility.studentNormalized : 0 },
  ] : null;

  const handleExportPersonalPlan = async () => {
    await generatePersonalPlanPDF(session, {
      aiRecommendations: aiResult || undefined,
      supportPlans: supportPlansData,
    });
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSaveNotes = async () => {
    await updateSessionDB(session.id, { adminNotes: notes });
    setSession((prev) => prev ? { ...prev, adminNotes: notes } : null);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  const handleCloseIntake = async () => {
    await updateSessionDB(session.id, { status: "completed", closedAt: new Date().toISOString() });
    setSession((prev) => prev ? { ...prev, status: "completed", closedAt: new Date().toISOString() } : null);
  };

  const handleReopenIntake = async () => {
    await updateSessionDB(session.id, { status: "under_review", closedAt: undefined });
    setSession((prev) => prev ? { ...prev, status: "under_review", closedAt: undefined } : null);
  };

  const handleOpenReassessment = async () => {
    await updateSessionDB(session.id, {
      reassessmentStatus: "open",
      reassessmentStudentResponses: {},
      reassessmentParentResponses: {},
    });
    setSession((prev) => prev ? {
      ...prev,
      reassessmentStatus: "open",
      reassessmentStudentResponses: {},
      reassessmentParentResponses: {},
    } : null);
    alert("סיכום שנתי נפתח — התלמיד וההורה יכולים כעת למלא שאלונים מחדש עם אותם קודים");
  };

  const handlePrint = () => { window.print(); };

  const scoreCards = [
    { key: "qualityOfLife" as const, label: SECTION_LABELS.quality_of_life, icon: BarChart3 },
    { key: "selfEfficacy" as const, label: SECTION_LABELS.self_efficacy, icon: TrendingUp },
    { key: "locusOfControl" as const, label: SECTION_LABELS.locus_of_control, icon: Target },
    { key: "cognitiveFlexibility" as const, label: SECTION_LABELS.cognitive_flexibility, icon: Lightbulb },
  ];

  const comparisonData = reassessmentScores ? scoreCards.map(({ key, label }) => ({
    name: label,
    קליטה: scores[key].studentNormalized >= 0 ? scores[key].studentNormalized : 0,
    סיכום: reassessmentScores[key].studentNormalized >= 0 ? reassessmentScores[key].studentNormalized : 0,
  })) : null;

  const reassessmentStatusLabel = (() => {
    switch (session.reassessmentStatus) {
      case "open": return "פתוח — ממתין למילוי";
      case "student_completed": return "התלמיד מילא — ממתין להורה";
      case "parent_completed": return "ההורה מילא — ממתין לתלמיד";
      case "completed": return "הושלם";
      default: return null;
    }
  })();

  return (
    <div className="min-h-screen bg-background print:bg-white" ref={printRef}>
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-20 print:static shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/admin")} className="p-2 rounded-lg hover:bg-muted print:hidden">
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-heading font-bold">{session.studentName}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={session.status} />
              {session.grade && <span className="text-xs text-muted-foreground">כיתה {session.grade}</span>}
              {session.studentIdNumber && <span className="text-xs text-muted-foreground">ת.ז. {session.studentIdNumber}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 print:hidden">
            <button onClick={() => navigate(`/staff/${session.id}`)} className="p-2 rounded-lg hover:bg-muted" title="שאלון צוות">
              <ClipboardList className="w-5 h-5 text-warning" />
            </button>
            <button onClick={() => generateStudentPDF(session, "parent")} className="p-2 rounded-lg hover:bg-muted" title="PDF להורים">
              <Download className="w-5 h-5 text-info" />
            </button>
            <button onClick={() => generateStudentPDF(session, "staff")} className="p-2 rounded-lg hover:bg-muted" title="PDF לצוות">
              <FileText className="w-5 h-5 text-primary" />
            </button>
            <button onClick={handlePrint} className="p-2 rounded-lg hover:bg-muted" title="הדפסה">
              <Printer className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/15 rounded-2xl">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">פרופיל תלמיד — תכנית אישית</p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              דף זה מציג את תוצאות ההערכה בארבעה מדדים מרכזיים. כל ציון מלווה בפרשנות מילולית המסבירה את המשמעות ואת ההמלצות הנגזרות.
              סולם הציונים: 1–5 (1 = נמוך, 5 = גבוה).
            </p>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="intake-card-soft">
          <h3 className="font-heading font-semibold mb-3 text-sm">מעקב תהליך</h3>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {(["not_started", "student_started", "student_completed", "parent_started", "parent_completed", "under_review", "completed"] as const).map((s, i) => {
              const isPast = ["not_started", "student_started", "student_completed", "parent_started", "parent_completed", "under_review", "completed"].indexOf(session.status) >= i;
              const isActive = s === session.status;
              return (
                <div key={s} className="flex items-center">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isPast ? "bg-primary" : "bg-muted"} ${isActive ? "ring-2 ring-primary/30 ring-offset-2" : ""}`} />
                  {i < 6 && <div className={`w-4 h-0.5 ${isPast ? "bg-primary" : "bg-muted"}`} />}
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
            <span>נוצר: {new Date(session.createdAt).toLocaleDateString("he-IL")}</span>
            <span>עדכון: {new Date(session.updatedAt).toLocaleDateString("he-IL")}</span>
            {session.closedAt && <span>נסגר: {new Date(session.closedAt).toLocaleDateString("he-IL")}</span>}
          </div>
          {reassessmentStatusLabel && (
            <div className="mt-2 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">סיכום שנתי: {reassessmentStatusLabel}</span>
              {session.reassessmentDate && (
                <span className="text-xs text-muted-foreground">({new Date(session.reassessmentDate).toLocaleDateString("he-IL")})</span>
              )}
            </div>
          )}
        </div>

        {/* Consent Signature */}
        {consentSignature && (
          <div className="intake-card-soft print:break-inside-avoid">
            <h3 className="font-heading font-semibold mb-2 flex items-center gap-2 text-sm">
              <PenLine className="w-4 h-4 text-primary" />
              חתימת הסכמה לכללי בית הספר
            </h3>
            <div className="bg-card border border-border rounded-xl p-2 inline-block">
              <img src={consentSignature} alt="חתימת תלמיד" className="h-16" />
            </div>
          </div>
        )}

        {/* Codes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:hidden">
          <div className="intake-card-soft flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">קוד תלמיד</p>
              <p className="font-mono font-bold text-sm" dir="ltr">{session.studentCode}</p>
            </div>
            <button onClick={() => handleCopy(session.studentCode, "student")} className="p-2 rounded-lg hover:bg-muted">
              {copied === "student" ? <CheckCircle className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>
          <div className="intake-card-soft flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">קוד הורה</p>
              <p className="font-mono font-bold text-sm" dir="ltr">{session.parentCode}</p>
            </div>
            <button onClick={() => handleCopy(session.parentCode, "parent")} className="p-2 rounded-lg hover:bg-muted">
              {copied === "parent" ? <CheckCircle className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>
        </div>

        {/* Completion Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="intake-card-soft text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">השלמת תלמיד</p>
            <p className="text-xl font-bold">{Object.keys(session.studentResponses).length}/52</p>
            <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(Object.keys(session.studentResponses).length / 52) * 100}%` }} />
            </div>
          </div>
          <div className="intake-card-soft text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-info" />
            <p className="text-xs text-muted-foreground">השלמת הורה</p>
            <p className="text-xl font-bold">{Object.keys(session.parentResponses).length}/52</p>
            <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-info rounded-full transition-all" style={{ width: `${(Object.keys(session.parentResponses).length / 52) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Staff completion */}
        {Object.keys(session.staffResponses).length > 0 && (
          <div className="intake-card-soft text-center">
            <ClipboardList className="w-5 h-5 mx-auto mb-1 text-warning" />
            <p className="text-xs text-muted-foreground">הערכת צוות</p>
            <p className="text-xl font-bold">{Object.keys(session.staffResponses).length}/52</p>
            <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-warning rounded-full transition-all" style={{ width: `${(Object.keys(session.staffResponses).length / 52) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Radar Chart */}
        {(hasStudentData || hasParentData) && (
          <div className="intake-card">
            <h3 className="font-heading font-semibold mb-2 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              פרופיל תלמיד — תחומים ראשיים
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              הגרף מציג את הציונים בארבעת המדדים המרכזיים. ככל שהנקודה קרובה יותר לקצה — הציון גבוה יותר (סולם 1–5).
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                {hasStudentData && <Radar name="תלמיד" dataKey="student" stroke="hsl(165, 35%, 42%)" fill="hsl(165, 35%, 42%)" fillOpacity={0.2} />}
                {hasParentData && <Radar name="הורה" dataKey="parent" stroke="hsl(200, 60%, 50%)" fill="hsl(200, 60%, 50%)" fillOpacity={0.15} />}
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Main Score Cards WITH verbal descriptions */}
        <div className="space-y-4">
          <h3 className="font-heading font-semibold text-base flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            ציוני המדדים — עם פרשנות מילולית
          </h3>
          {scoreCards.map(({ key, label, icon: Icon }) => {
            const s = scores[key];
            const desc = DOMAIN_DESCRIPTIONS[key];
            return (
              <div key={key} className="intake-card border-primary/10">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h4 className="font-heading font-semibold text-sm">{label}</h4>
                      <span className={`text-2xl font-bold ${getScoreColor(s.normalized)}`}>
                        {s.normalized >= 0 ? s.normalized.toFixed(2) : "—"}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        s.normalized >= 4 ? "bg-success/15 text-success" :
                        s.normalized >= 3 ? "bg-primary/10 text-primary" :
                        s.normalized >= 2 ? "bg-warning/15 text-warning" :
                        s.normalized >= 0 ? "bg-destructive/15 text-destructive" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {getScoreLabel(s.normalized)}
                      </span>
                    </div>
                    {/* Verbal description */}
                    <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                      {desc?.description}
                    </p>
                    {/* Score interpretation */}
                    <p className="text-xs font-medium mt-1.5 leading-relaxed" style={{ color: s.normalized >= 4 ? 'hsl(var(--success))' : s.normalized >= 3 ? 'hsl(var(--primary))' : s.normalized >= 2 ? 'hsl(var(--warning))' : s.normalized >= 0 ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))' }}>
                      {getScoreInterpretation(s.normalized, key)}
                    </p>
                    {/* Student vs Parent */}
                    {s.studentNormalized >= 0 && s.parentNormalized >= 0 && (
                      <div className="flex gap-4 mt-2 text-[11px] text-muted-foreground">
                        <span>תלמיד: <strong>{s.studentNormalized.toFixed(2)}</strong></span>
                        <span>הורה: <strong>{s.parentNormalized.toFixed(2)}</strong></span>
                        <span className={Math.abs(s.studentNormalized - s.parentNormalized) > 1.0 ? "text-warning font-semibold" : ""}>
                          פער: {Math.abs(s.studentNormalized - s.parentNormalized).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* QoL Subdomain Breakdown */}
        {hasStudentData && (
          <div className="intake-card border-primary/20">
            <h3 className="font-heading font-semibold mb-2 flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              פירוט מדדי איכות חיים
            </h3>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              מדד איכות החיים מורכב משמונה תחומים. כל תחום נבדק בנפרד כדי לאפשר הבנה מעמיקה של תפקוד התלמיד.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {Object.entries(qolSubdomains).map(([key, score]) => (
                <div key={key} className="p-3 bg-muted/30 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold">{QOL_SUBDOMAIN_LABELS[key]}</p>
                    <span className={`text-lg font-bold ${getScoreColor(score.normalized)}`}>
                      {score.normalized >= 0 ? score.normalized.toFixed(2) : "—"}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {QOL_SUBDOMAIN_DESCRIPTIONS[key]}
                  </p>
                  <p className="text-[10px] mt-1 font-medium" style={{ color: score.normalized >= 4 ? 'hsl(var(--success))' : score.normalized >= 3 ? 'hsl(var(--primary))' : score.normalized >= 2 ? 'hsl(var(--warning))' : score.normalized >= 0 ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))' }}>
                    {getScoreLabel(score.normalized)}
                  </p>
                  {score.normalized >= 0 && (
                    <p className="text-[10px] mt-1 text-muted-foreground italic leading-relaxed">
                      {getScoreInterpretation(score.normalized, key)}
                    </p>
                  )}
                  {score.studentNormalized >= 0 && score.parentNormalized >= 0 && (
                    <p className="text-[9px] text-muted-foreground mt-1">
                      ת: {score.studentNormalized.toFixed(1)} | ה: {score.parentNormalized.toFixed(1)}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {/* Low QoL subdomain alerts */}
            {Object.entries(qolSubdomains).filter(([, s]) => s.normalized >= 0 && s.normalized < 2.5).length > 0 && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-xl mt-2">
                <p className="text-xs font-medium text-warning mb-1">⚠ תחומי איכות חיים הדורשים תשומת לב:</p>
                {Object.entries(qolSubdomains)
                  .filter(([, s]) => s.normalized >= 0 && s.normalized < 2.5)
                  .map(([key, s]) => (
                    <p key={key} className="text-xs text-muted-foreground">• {QOL_SUBDOMAIN_LABELS[key]} ({s.normalized.toFixed(2)}) — {QOL_SUBDOMAIN_DESCRIPTIONS[key]}</p>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Reassessment QoL Subdomain Comparison */}
        {reassessmentQoLSubdomains && (
          <div className="intake-card border-info/20">
            <h3 className="font-heading font-semibold mb-2 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-info" />
              השוואת מדדי איכות חיים — קליטה ← סיכום שנתי
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              הטבלה משווה את הציונים מתחילת השנה לסוף השנה. שינוי חיובי מעיד על שיפור.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="text-right py-2 px-2">תחום</th>
                    <th className="text-center py-2 px-2">קליטה</th>
                    <th className="text-center py-2 px-2">סיכום</th>
                    <th className="text-center py-2 px-2">שינוי</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(qolSubdomains).map(([key, score]) => {
                    const reassessScore = reassessmentQoLSubdomains[key];
                    if (!reassessScore || score.normalized < 0 || reassessScore.normalized < 0) return null;
                    const diff = reassessScore.normalized - score.normalized;
                    return (
                      <tr key={key} className="border-b border-border/50">
                        <td className="py-2 px-2 font-medium text-xs">{QOL_SUBDOMAIN_LABELS[key]}</td>
                        <td className="py-2 px-2 text-center text-xs">{score.normalized.toFixed(2)}</td>
                        <td className="py-2 px-2 text-center text-xs">{reassessScore.normalized.toFixed(2)}</td>
                        <td className={`py-2 px-2 text-center text-xs font-bold ${diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                          {diff > 0 ? "+" : ""}{diff.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reassessment Comparison - Main Domains */}
        {comparisonData && (
          <div className="intake-card border-primary/20">
            <h3 className="font-heading font-semibold mb-2 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              השוואת קליטה ← סיכום שנתי
            </h3>
            {session.reassessmentDate && (
              <p className="text-xs text-muted-foreground mb-3">תאריך סיכום: {new Date(session.reassessmentDate).toLocaleDateString("he-IL")}</p>
            )}
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={comparisonData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="קליטה" fill="hsl(200, 60%, 50%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="סיכום" fill="hsl(165, 35%, 42%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[hsl(200,60%,50%)]" /> קליטה</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[hsl(165,35%,42%)]" /> סיכום שנתי</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {scoreCards.map(({ key, label }) => {
                const initial = scores[key].studentNormalized;
                const final = reassessmentScores![key].studentNormalized;
                if (initial < 0 || final < 0) return null;
                const diff = final - initial;
                return (
                  <div key={key} className="p-2 bg-muted/30 rounded-lg text-center">
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className={`text-sm font-bold ${diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {diff > 0 ? "+" : ""}{diff.toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Progress Timeline */}
        {timelineData && (
          <div className="intake-card border-info/20">
            <h3 className="font-heading font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-info" />
              ציר התקדמות — קליטה ← סיכום שנתי
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              הגרף מציג את ההתקדמות בין שתי נקודות המדידה לאורך השנה.
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="קליטה" stroke="hsl(200, 60%, 50%)" strokeWidth={2} dot={{ r: 5 }} />
                <Line type="monotone" dataKey="סיכום" stroke="hsl(165, 35%, 42%)" strokeWidth={2} dot={{ r: 5 }} />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Discrepancy Table */}
        {hasStudentData && hasParentData && (
          <div className="intake-card">
            <h3 className="font-heading font-semibold mb-2 flex items-center gap-2">
              <Users className="w-5 h-5 text-info" />
              השוואת תלמיד-הורה
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              פער גדול בין תפיסת התלמיד להורה (מעל 1.0) מומלץ לבירור בשיח משותף.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="text-right py-2 px-2">תחום</th>
                    <th className="text-center py-2 px-2">תלמיד</th>
                    <th className="text-center py-2 px-2">הורה</th>
                    <th className="text-center py-2 px-2">פער</th>
                  </tr>
                </thead>
                <tbody>
                  {scoreCards.map(({ key, label }) => {
                    const s = scores[key];
                    const gap = s.studentNormalized >= 0 && s.parentNormalized >= 0 ? Math.abs(s.studentNormalized - s.parentNormalized) : -1;
                    return (
                      <tr key={key} className="border-b border-border/50">
                        <td className="py-2 px-2 font-medium text-xs">{label}</td>
                        <td className="py-2 px-2 text-center">{s.studentNormalized >= 0 ? s.studentNormalized.toFixed(2) : "—"}</td>
                        <td className="py-2 px-2 text-center">{s.parentNormalized >= 0 ? s.parentNormalized.toFixed(2) : "—"}</td>
                        <td className={`py-2 px-2 text-center font-bold ${gap > 1.0 ? "text-warning" : ""}`}>{gap >= 0 ? gap.toFixed(2) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Insights */}
        {hasStudentData && (
          <div className="space-y-4">
            <div className="intake-card border-primary/20">
              <h3 className="font-heading font-semibold mb-2 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" />תמונת מצב</h3>
              <p className="text-sm leading-relaxed">{insights.summary}</p>
            </div>
            {insights.strengths.length > 0 && (
              <div className="intake-card border-success/20">
                <h3 className="font-heading font-semibold mb-2 flex items-center gap-2 text-success"><TrendingUp className="w-5 h-5" />חוזקות</h3>
                <p className="text-xs text-muted-foreground mb-2">תחומים שבהם התלמיד מפגין ציונים גבוהים ויכולות שניתן לבנות עליהן.</p>
                <ul className="space-y-1">{insights.strengths.map((s, i) => (<li key={i} className="text-sm text-muted-foreground flex items-start gap-2"><span className="text-success mt-0.5">•</span>{s}</li>))}</ul>
              </div>
            )}
            {insights.areasForSupport.length > 0 && (
              <div className="intake-card border-warning/20">
                <h3 className="font-heading font-semibold mb-2 flex items-center gap-2 text-warning"><Target className="w-5 h-5" />תחומים לקידום</h3>
                <p className="text-xs text-muted-foreground mb-2">תחומים שבהם מומלץ לבנות תכנית ליווי ותמיכה מותאמת.</p>
                <ul className="space-y-1">{insights.areasForSupport.map((s, i) => (<li key={i} className="text-sm text-muted-foreground flex items-start gap-2"><span className="text-warning mt-0.5">•</span>{s}</li>))}</ul>
              </div>
            )}
            {insights.discrepancies.length > 0 && (
              <div className="intake-card border-info/20">
                <h3 className="font-heading font-semibold mb-2 flex items-center gap-2 text-info"><Users className="w-5 h-5" />פערים בין דיווחים</h3>
                <p className="text-xs text-muted-foreground mb-2">פערים בין תפיסת התלמיד לתפיסת ההורה. מומלץ לבחון בשיח משותף.</p>
                <ul className="space-y-1">{insights.discrepancies.map((s, i) => (<li key={i} className="text-sm text-muted-foreground flex items-start gap-2"><span className="text-info mt-0.5">•</span>{s}</li>))}</ul>
              </div>
            )}
            {insights.recommendations.length > 0 && (
              <div className="intake-card border-primary/20">
                <h3 className="font-heading font-semibold mb-2 flex items-center gap-2"><Lightbulb className="w-5 h-5 text-primary" />המלצות ראשוניות</h3>
                <ul className="space-y-1">{insights.recommendations.map((s, i) => (<li key={i} className="text-sm text-muted-foreground flex items-start gap-2"><span className="text-primary mt-0.5">{i + 1}.</span>{s}</li>))}</ul>
              </div>
            )}
            <div className="intake-card">
              <h3 className="font-heading font-semibold mb-2 flex items-center gap-2"><Shield className="w-5 h-5 text-muted-foreground" />פרשנות חינוכית-טיפולית</h3>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{insights.interpretation}</p>
            </div>
            {focusAreas.length > 0 && (
              <div className="intake-card-soft border-primary/30">
                <h3 className="font-heading font-semibold mb-2 text-sm">תחומי מיקוד מומלצים (Top 3)</h3>
                <p className="text-xs text-muted-foreground mb-2">תחומים בעלי הציון הנמוך ביותר — יש להם עדיפות בתכנית האישית.</p>
                <div className="flex flex-wrap gap-2">
                  {focusAreas.map((area, i) => (
                    <span key={i} className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary">{i + 1}. {area}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Risk Flags */}
        {riskFlags.length > 0 && (
          <div className="intake-card border-warning/30">
            <h3 className="font-heading font-semibold mb-2 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-warning" />דגלי זהירות</h3>
            <p className="text-xs text-muted-foreground mb-3">
              דגלים אלה מזהים דפוסים או ציונים הדורשים תשומת לב. מומלץ לשוחח עם התלמיד וההורים.
            </p>
            <div className="space-y-2">
              {riskFlags.map((flag, i) => (
                <div key={i} className={`p-3 rounded-xl text-sm ${flag.severity === "urgent" ? "bg-destructive/10 border border-destructive/20" : flag.severity === "concern" ? "bg-warning/10 border border-warning/20" : "bg-accent border border-accent"}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${flag.severity === "urgent" ? "bg-destructive/20 text-destructive" : flag.severity === "concern" ? "bg-warning/20 text-warning" : "bg-info/20 text-info"}`}>
                      {flag.severity === "urgent" ? "דורש תשומת לב" : flag.severity === "concern" ? "מומלץ בירור" : "לתשומת לב"}
                    </span>
                    <span className="text-xs font-medium">{flag.domain}</span>
                  </div>
                  <p className="text-muted-foreground text-xs">{flag.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GAS Goals */}
        {gasGoals.length > 0 && (
          <div className="intake-card">
            <h3 className="font-heading font-semibold mb-2 flex items-center gap-2"><Target className="w-5 h-5 text-primary" />יעדי GAS מוצעים</h3>
            <p className="text-xs text-muted-foreground mb-3">
              יעדים מבוססי GAS (Goal Attainment Scaling) — סולם מדורג להערכת התקדמות. כל יעד מציג את המצב הנוכחי ושלוש רמות התקדמות צפויות.
            </p>
            <div className="space-y-4">
              {gasGoals.map((goal) => (
                <div key={goal.id} className="p-4 bg-muted/30 rounded-xl space-y-2">
                  <h4 className="font-semibold text-sm text-primary">{goal.area}</h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex gap-2"><span className="font-medium text-muted-foreground w-20 flex-shrink-0">מצב נוכחי:</span><span>{goal.current}</span></div>
                    <div className="flex gap-2"><span className="font-medium text-muted-foreground w-20 flex-shrink-0">יעד 0:</span><span>{goal.level0}</span></div>
                    <div className="flex gap-2"><span className="font-medium text-success w-20 flex-shrink-0">יעד +1:</span><span>{goal.level1}</span></div>
                    <div className="flex gap-2"><span className="font-medium text-success w-20 flex-shrink-0">יעד +2:</span><span>{goal.level2}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Support Plans */}
        <SupportPlans sessionId={session.id} />

        {/* AI Recommendations */}
        {hasStudentData && (
          <AIRecommendations
            student={{
              name: session.studentName,
              scores,
              openResponses: session.studentOpenResponses,
              staffOpenResponses: session.staffOpenResponses,
            }}
            onResult={(r) => setAiResult(r)}
          />
        )}

        {/* Staff Open Responses */}
        {Object.values(session.staffOpenResponses).some(v => v) && (
          <div className="intake-card border-warning/20">
            <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-warning" />
              הערכת צוות חינוכי
            </h3>
            <div className="space-y-3">
              {Object.entries(session.staffOpenResponses).map(([key, val]) => (
                val ? (
                  <div key={key} className="p-3 bg-warning/5 rounded-xl">
                    <p className="text-xs text-warning font-medium mb-1">
                      {key === "staff_behavioral" ? "תפקוד התנהגותי" :
                       key === "staff_social" ? "תפקוד חברתי" :
                       key === "staff_academic" ? "תפקוד לימודי" :
                       key === "staff_emotional" ? "תפקוד רגשי" :
                       key === "staff_recommendations" ? "המלצות הצוות" : key}
                    </p>
                    <p className="text-sm">{val}</p>
                  </div>
                ) : null
              ))}
            </div>
          </div>
        )}

        {/* Open-ended Responses */}
        {Object.keys(session.studentOpenResponses).length > 0 && (
          <div className="intake-card">
            <h3 className="font-heading font-semibold mb-3 flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />תשובות פתוחות</h3>
            <div className="space-y-3">
              {Object.entries(session.studentOpenResponses).map(([key, val]) => (
                val ? (
                  <div key={key} className="p-3 bg-muted/50 rounded-xl">
                    <p className="text-xs text-muted-foreground font-medium mb-1">{OPEN_QUESTION_LABELS[key] || key}</p>
                    <p className="text-sm">{val}</p>
                  </div>
                ) : null
              ))}
            </div>
          </div>
        )}

        {/* Parent Comment */}
        {session.parentOpenResponse && (
          <div className="intake-card">
            <h3 className="font-heading font-semibold mb-3 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-info" />הערת הורה</h3>
            <div className="p-3 bg-muted/50 rounded-xl"><p className="text-sm">{session.parentOpenResponse}</p></div>
          </div>
        )}

        {/* PDF Export Buttons */}
        <div className="grid grid-cols-3 gap-3 print:hidden">
          <button onClick={() => generateStudentPDF(session, "parent")}
            className="btn-intake bg-info/10 text-info text-sm flex items-center justify-center gap-2 hover:bg-info/20 transition-colors">
            <Download className="w-4 h-4" /> PDF להורים
          </button>
          <button onClick={() => generateStudentPDF(session, "staff")}
            className="btn-intake bg-primary/10 text-primary text-sm flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors">
            <FileText className="w-4 h-4" /> PDF לצוות
          </button>
          <button onClick={handleExportPersonalPlan}
            className="btn-intake bg-success/10 text-success text-sm flex items-center justify-center gap-2 hover:bg-success/20 transition-colors">
            <ScrollText className="w-4 h-4" /> תכנית אישית
          </button>
        </div>

        {/* Admin Notes */}
        <div className="intake-card print:hidden">
          <h3 className="font-heading font-semibold mb-2">הערות צוות</h3>
          <p className="text-xs text-muted-foreground mb-3">הערות פנימיות — מופיעות בדוח הצוות ובתכנית האישית.</p>
          <textarea
            className="w-full bg-background border border-input rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            rows={4} value={notes}
            onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }}
            placeholder="הוסף הערות..."
          />
          <div className="flex items-center gap-2 mt-2">
            <button onClick={handleSaveNotes} className="btn-intake bg-secondary text-secondary-foreground text-sm">שמור הערות</button>
            {notesSaved && <span className="text-xs text-success flex items-center gap-1 animate-fade-in"><CheckCircle className="w-3 h-3" /> נשמר</span>}
          </div>
        </div>

        {/* Close / Reopen / Reassessment / Staff */}
        <div className="flex flex-col gap-3 print:hidden">
          <div className="flex gap-3">
            {session.status !== "completed" ? (
              <button onClick={handleCloseIntake} className="btn-intake bg-primary text-primary-foreground flex-1 flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" /> סגור תהליך קליטה
              </button>
            ) : (
              <button onClick={handleReopenIntake} className="btn-intake bg-secondary text-secondary-foreground flex-1 flex items-center justify-center gap-2">
                <Unlock className="w-4 h-4" /> פתח מחדש
              </button>
            )}
          </div>
          <button onClick={() => navigate(`/staff/${session.id}`)}
            className="btn-intake bg-warning/10 text-warning flex items-center justify-center gap-2 border border-warning/20 hover:bg-warning/20 transition-colors">
            <ClipboardList className="w-4 h-4" /> מלא שאלון צוות עבור {session.studentName}
          </button>
          {(session.status === "completed" || session.status === "under_review") && (
            <button onClick={handleOpenReassessment}
              className="btn-intake bg-accent text-accent-foreground flex items-center justify-center gap-2 border border-primary/20 hover:bg-accent/80 transition-colors">
              <RefreshCw className="w-4 h-4" /> פתח סיכום שנתי — תלמיד + הורה
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
