import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSession, updateSession } from "@/lib/storage";
import { IntakeSession, SECTION_LABELS, OPEN_QUESTION_LABELS, GASGoal } from "@/lib/types";
import { calculateScores, generateRiskFlags, generateInsights, generateGASGoals, getScoreLabel, getScoreColor, getTopFocusAreas } from "@/lib/scoring";
import StatusBadge from "@/components/StatusBadge";
import { ArrowRight, AlertTriangle, Copy, CheckCircle, Lock, Unlock, FileText, Target, Lightbulb, TrendingUp, Users, Printer, MessageSquare, BarChart3, Shield } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";

const StudentProfile = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<IntakeSession | null>(null);
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [notesSaved, setNotesSaved] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) return;
    const s = getSession(sessionId);
    if (!s) {
      navigate("/admin");
      return;
    }
    setSession(s);
    setNotes(s.adminNotes || "");
  }, [sessionId, navigate]);

  if (!session) return null;

  const scores = calculateScores(session.studentResponses, session.parentResponses);
  const riskFlags = generateRiskFlags(scores);
  const insights = generateInsights(scores);
  const gasGoals = generateGASGoals(scores);
  const focusAreas = getTopFocusAreas(scores);

  const radarData = [
    { subject: "איכות חיים", student: scores.qualityOfLife.studentNormalized, parent: scores.qualityOfLife.parentNormalized },
    { subject: "מסוגלות עצמית", student: scores.selfEfficacy.studentNormalized, parent: scores.selfEfficacy.parentNormalized },
    { subject: "מיקוד שליטה", student: scores.locusOfControl.studentNormalized, parent: scores.locusOfControl.parentNormalized },
    { subject: "גמישות קוגניטיבית", student: scores.cognitiveFlexibility.studentNormalized, parent: scores.cognitiveFlexibility.parentNormalized },
  ].map((d) => ({
    ...d,
    student: d.student >= 0 ? d.student : 0,
    parent: d.parent >= 0 ? d.parent : 0,
  }));

  const hasStudentData = scores.qualityOfLife.studentNormalized >= 0;
  const hasParentData = scores.qualityOfLife.parentNormalized >= 0;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSaveNotes = () => {
    updateSession(session.id, { adminNotes: notes });
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  const handleCloseIntake = () => {
    updateSession(session.id, { status: "completed", closedAt: new Date().toISOString() });
    setSession((prev) => prev ? { ...prev, status: "completed", closedAt: new Date().toISOString() } : null);
  };

  const handleReopenIntake = () => {
    updateSession(session.id, { status: "under_review", closedAt: undefined });
    setSession((prev) => prev ? { ...prev, status: "under_review", closedAt: undefined } : null);
  };

  const handlePrint = () => {
    window.print();
  };

  const scoreCards = [
    { key: "qualityOfLife" as const, label: SECTION_LABELS.quality_of_life, icon: BarChart3 },
    { key: "selfEfficacy" as const, label: SECTION_LABELS.self_efficacy, icon: TrendingUp },
    { key: "locusOfControl" as const, label: SECTION_LABELS.locus_of_control, icon: Target },
    { key: "cognitiveFlexibility" as const, label: SECTION_LABELS.cognitive_flexibility, icon: Lightbulb },
  ];

  return (
    <div className="min-h-screen bg-background print:bg-white" ref={printRef}>
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-20 print:static">
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
          <button onClick={handlePrint} className="p-2 rounded-lg hover:bg-muted print:hidden" title="הדפסה">
            <Printer className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Status Timeline */}
        <div className="intake-card-soft">
          <h3 className="font-heading font-semibold mb-3 text-sm">מעקב תהליך</h3>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {(["not_started", "student_started", "student_completed", "parent_started", "parent_completed", "under_review", "completed"] as const).map((s, i) => {
              const isActive = s === session.status;
              const isPast = ["not_started", "student_started", "student_completed", "parent_started", "parent_completed", "under_review", "completed"].indexOf(session.status) >= i;
              return (
                <div key={s} className="flex items-center">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isPast ? "bg-primary" : "bg-muted"} ${isActive ? "ring-2 ring-primary/30 ring-offset-2" : ""}`} />
                  {i < 6 && <div className={`w-4 h-0.5 ${isPast ? "bg-primary" : "bg-muted"}`} />}
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span>נוצר: {new Date(session.createdAt).toLocaleDateString("he-IL")}</span>
            <span>עדכון: {new Date(session.updatedAt).toLocaleDateString("he-IL")}</span>
            {session.closedAt && <span>נסגר: {new Date(session.closedAt).toLocaleDateString("he-IL")}</span>}
          </div>
        </div>

        {/* Codes - print hidden */}
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

        {/* Radar Chart */}
        {(hasStudentData || hasParentData) && (
          <div className="intake-card">
            <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              פרופיל תלמיד
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                {hasStudentData && (
                  <Radar name="תלמיד" dataKey="student" stroke="hsl(165, 35%, 42%)" fill="hsl(165, 35%, 42%)" fillOpacity={0.2} />
                )}
                {hasParentData && (
                  <Radar name="הורה" dataKey="parent" stroke="hsl(200, 60%, 50%)" fill="hsl(200, 60%, 50%)" fillOpacity={0.15} />
                )}
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Score Cards */}
        <div className="grid grid-cols-2 gap-3">
          {scoreCards.map(({ key, label, icon: Icon }) => {
            const s = scores[key];
            return (
              <div key={key} className="intake-card-soft text-center">
                <Icon className="w-5 h-5 mx-auto mb-1 text-primary/60" />
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className={`text-2xl font-bold ${getScoreColor(s.normalized)}`}>
                  {s.normalized >= 0 ? s.normalized : "—"}
                </p>
                <p className="text-xs text-muted-foreground">{getScoreLabel(s.normalized)}</p>
                {s.studentNormalized >= 0 && s.parentNormalized >= 0 && (
                  <div className="mt-2 text-[10px] text-muted-foreground space-y-0.5">
                    <p>תלמיד: {s.studentNormalized} | הורה: {s.parentNormalized}</p>
                    <p className={Math.abs(s.studentNormalized - s.parentNormalized) > 25 ? "text-warning font-medium" : ""}>
                      פער: {Math.abs(s.studentNormalized - s.parentNormalized)}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Discrepancy Table */}
        {hasStudentData && hasParentData && (
          <div className="intake-card">
            <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-info" />
              השוואת תלמיד-הורה
            </h3>
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
                    const gap = s.studentNormalized >= 0 && s.parentNormalized >= 0
                      ? Math.abs(s.studentNormalized - s.parentNormalized) : -1;
                    return (
                      <tr key={key} className="border-b border-border/50">
                        <td className="py-2 px-2 font-medium text-xs">{label}</td>
                        <td className="py-2 px-2 text-center">{s.studentNormalized >= 0 ? s.studentNormalized : "—"}</td>
                        <td className="py-2 px-2 text-center">{s.parentNormalized >= 0 ? s.parentNormalized : "—"}</td>
                        <td className={`py-2 px-2 text-center font-bold ${gap > 25 ? "text-warning" : ""}`}>
                          {gap >= 0 ? gap : "—"}
                        </td>
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
            {/* Summary */}
            <div className="intake-card border-primary/20">
              <h3 className="font-heading font-semibold mb-2 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                תמונת מצב
              </h3>
              <p className="text-sm leading-relaxed">{insights.summary}</p>
            </div>

            {/* Strengths */}
            {insights.strengths.length > 0 && (
              <div className="intake-card border-success/20">
                <h3 className="font-heading font-semibold mb-2 flex items-center gap-2 text-success">
                  <TrendingUp className="w-5 h-5" />
                  חוזקות
                </h3>
                <ul className="space-y-1">
                  {insights.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-success mt-0.5">•</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Areas for support */}
            {insights.areasForSupport.length > 0 && (
              <div className="intake-card border-warning/20">
                <h3 className="font-heading font-semibold mb-2 flex items-center gap-2 text-warning">
                  <Target className="w-5 h-5" />
                  תחומים לקידום
                </h3>
                <ul className="space-y-1">
                  {insights.areasForSupport.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-warning mt-0.5">•</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Discrepancies */}
            {insights.discrepancies.length > 0 && (
              <div className="intake-card border-info/20">
                <h3 className="font-heading font-semibold mb-2 flex items-center gap-2 text-info">
                  <Users className="w-5 h-5" />
                  פערים בין דיווחים
                </h3>
                <ul className="space-y-1">
                  {insights.discrepancies.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-info mt-0.5">•</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {insights.recommendations.length > 0 && (
              <div className="intake-card border-primary/20">
                <h3 className="font-heading font-semibold mb-2 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  המלצות ראשוניות
                </h3>
                <ul className="space-y-1">
                  {insights.recommendations.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">{i + 1}.</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Interpretation */}
            <div className="intake-card">
              <h3 className="font-heading font-semibold mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5 text-muted-foreground" />
                פרשנות חינוכית-טיפולית
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{insights.interpretation}</p>
            </div>

            {/* Top Focus Areas */}
            {focusAreas.length > 0 && (
              <div className="intake-card-soft border-primary/30">
                <h3 className="font-heading font-semibold mb-2 text-sm">תחומי מיקוד מומלצים (Top 3)</h3>
                <div className="flex flex-wrap gap-2">
                  {focusAreas.map((area, i) => (
                    <span key={i} className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {i + 1}. {area}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Risk Flags */}
        {riskFlags.length > 0 && (
          <div className="intake-card border-warning/30">
            <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              דגלי זהירות
            </h3>
            <div className="space-y-2">
              {riskFlags.map((flag, i) => (
                <div key={i} className={`p-3 rounded-xl text-sm ${
                  flag.severity === "urgent" ? "bg-destructive/10 border border-destructive/20" :
                  flag.severity === "concern" ? "bg-warning/10 border border-warning/20" :
                  "bg-accent border border-accent"
                }`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      flag.severity === "urgent" ? "bg-destructive/20 text-destructive" :
                      flag.severity === "concern" ? "bg-warning/20 text-warning" :
                      "bg-info/20 text-info"
                    }`}>
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
            <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              יעדי GAS מוצעים
            </h3>
            <div className="space-y-4">
              {gasGoals.map((goal) => (
                <div key={goal.id} className="p-4 bg-muted/30 rounded-xl space-y-2">
                  <h4 className="font-semibold text-sm text-primary">{goal.area}</h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex gap-2">
                      <span className="font-medium text-muted-foreground w-20 flex-shrink-0">מצב נוכחי:</span>
                      <span>{goal.current}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium text-muted-foreground w-20 flex-shrink-0">יעד 0:</span>
                      <span>{goal.level0}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium text-success w-20 flex-shrink-0">יעד +1:</span>
                      <span>{goal.level1}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium text-success w-20 flex-shrink-0">יעד +2:</span>
                      <span>{goal.level2}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Open-ended Responses */}
        {Object.keys(session.studentOpenResponses).length > 0 && (
          <div className="intake-card">
            <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              תשובות פתוחות
            </h3>
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
            <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-info" />
              הערת הורה
            </h3>
            <div className="p-3 bg-muted/50 rounded-xl">
              <p className="text-sm">{session.parentOpenResponse}</p>
            </div>
          </div>
        )}

        {/* Admin Notes */}
        <div className="intake-card print:hidden">
          <h3 className="font-heading font-semibold mb-3">הערות צוות</h3>
          <textarea
            className="w-full bg-background border border-input rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            rows={4}
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }}
            placeholder="הוסף הערות..."
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleSaveNotes}
              className="btn-intake bg-secondary text-secondary-foreground text-sm"
            >
              שמור הערות
            </button>
            {notesSaved && (
              <span className="text-xs text-success flex items-center gap-1 animate-fade-in">
                <CheckCircle className="w-3 h-3" /> נשמר
              </span>
            )}
          </div>
        </div>

        {/* Close / Reopen */}
        <div className="flex gap-3 print:hidden">
          {session.status !== "completed" ? (
            <button
              onClick={handleCloseIntake}
              className="btn-intake bg-primary text-primary-foreground flex-1 flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              סגור תהליך קליטה
            </button>
          ) : (
            <button
              onClick={handleReopenIntake}
              className="btn-intake bg-secondary text-secondary-foreground flex-1 flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              פתח מחדש
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
