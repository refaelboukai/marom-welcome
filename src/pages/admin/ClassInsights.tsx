import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getSessionsDB, getClassGroups, DEFAULT_CLASS_GROUPS, ClassGroupsMap, getTeacherProfiles, TeacherProfilesMap } from "@/lib/supabase-storage";
import { IntakeSession, SECTION_LABELS, QOL_SUBDOMAIN_LABELS, LC_SUBDOMAIN_LABELS } from "@/lib/types";
import { aggregateClass, ClassAggregate, computeClassSnapshot } from "@/lib/class-aggregations";
import { generateClassInsightsPDF } from "@/lib/pdf-export";
import { ArrowRight, Loader2, Sparkles, Users, AlertTriangle, Target, RefreshCw, Star, Download, Layers, Flag } from "lucide-react";

interface InsightsResult {
  classSummary?: string;
  themedCategories?: {
    title: string;
    type?: "strength" | "challenge" | "mixed";
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
  atRisk?: { name: string; why: string; priority: string }[];
  pedagogicalNote?: string;
  error?: string;
}

const ClassInsights = () => {
  const { classKey = "" } = useParams();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<IntakeSession[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroupsMap>(DEFAULT_CLASS_GROUPS);
  const [teachers, setTeachers] = useState<TeacherProfilesMap>({});
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [insights, setInsights] = useState<InsightsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    Promise.all([getSessionsDB(), getClassGroups(), getTeacherProfiles()]).then(([s, g, t]) => {
      setSessions(s);
      setClassGroups(g);
      setTeachers(t);
      setLoading(false);
    });
  }, []);

  const classLabel = classGroups[classKey] || classKey;

  const aggregate: ClassAggregate | null = useMemo(() => {
    if (loading) return null;
    const classSessions = sessions.filter((s) => s.classGroup === classKey && s.status !== "archived");
    if (classSessions.length === 0) return null;
    return aggregateClass(classKey, classLabel, classSessions);
  }, [sessions, classKey, classLabel, loading]);

  const snapshot = useMemo(() => (aggregate ? computeClassSnapshot(aggregate) : null), [aggregate]);

  // Fingerprint of the class's questionnaire state — changes only when a student
  // completes/updates a questionnaire. Used to cache insights.
  const fingerprint = useMemo(() => {
    if (!aggregate) return null;
    const classSessions = sessions
      .filter((s) => s.classGroup === classKey && s.status !== "archived")
      .map((s) => `${s.id}:${s.status}:${(s as any).updatedAt || (s as any).completedAt || ""}`)
      .sort()
      .join("|");
    return `${aggregate.studentCount}:${aggregate.completedCount}:${classSessions}`;
  }, [aggregate, sessions, classKey]);

  const cacheKey = `class-insights:${classKey}`;

  // Load cache once aggregate is ready; auto-run only if fingerprint changed.
  useEffect(() => {
    if (!aggregate || !fingerprint) return;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.fingerprint === fingerprint && parsed.insights) {
          setInsights(parsed.insights);
          return;
        }
      }
    } catch { /* ignore */ }
    if (!aiLoading && !error) runAi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aggregate, fingerprint]);

  const exportPDF = async () => {
    if (!aggregate) return;
    setPdfLoading(true);
    try {
      await generateClassInsightsPDF({
        classLabel,
        teacherName: teachers[classKey]?.name,
        studentCount: aggregate.studentCount,
        completedCount: aggregate.completedCount,
        genderBreakdown: aggregate.genderBreakdown,
        avgScores: aggregate.avgScores,
        atRiskCount: aggregate.studentsAtRisk.length,
        cohesion: snapshot?.cohesion,
        diversity: snapshot?.diversity,
        classSummary: insights?.classSummary,
        themedCategories: insights?.themedCategories,
        groupTherapyFocus: insights?.groupTherapyFocus,
        groupWorkGoals: insights?.groupWorkGoals,
        subGroups: insights?.subGroups,
        anchors: insights?.anchors,
        atRisk: insights?.atRisk,
        pedagogicalNote: insights?.pedagogicalNote,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setPdfLoading(false);
    }
  };

  const runAi = async () => {
    if (!aggregate) return;
    setAiLoading(true);
    setError(null);
    try {
      // trim the aggregate — keep only what the model needs
      const trimmed = {
        studentCount: aggregate.studentCount,
        completedCount: aggregate.completedCount,
        genderBreakdown: aggregate.genderBreakdown,
        gradeDistribution: aggregate.gradeDistribution,
        avgScores: aggregate.avgScores,
        avgQol: aggregate.avgQol,
        avgLearning: aggregate.avgLearning,
        commonStrengths: aggregate.commonStrengths,
        commonChallenges: aggregate.commonChallenges,
        studentsAtRisk: aggregate.studentsAtRisk,
        students: aggregate.studentProfiles.map((p) => ({
          name: p.name, grade: p.grade, gender: p.gender,
          scores: p.scores, qolSubdomains: p.qolSubdomains, learningSubdomains: p.learningSubdomains,
          topStrengths: p.topStrengths, topChallenges: p.topChallenges,
          riskFlags: p.riskFlags, openResponses: p.openResponses,
        })),
      };
      const { data, error: err } = await supabase.functions.invoke("class-insights", {
        body: { classLabel, aggregate: trimmed },
      });
      if (err) throw err;
      if (data?.error) throw new Error(data.error);
      setInsights(data);
      try {
        if (fingerprint) localStorage.setItem(cacheKey, JSON.stringify({ fingerprint, insights: data }));
      } catch { /* ignore */ }
    } catch (e: any) {
      setError(e?.message || "שגיאה בהפקת התובנות");
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/admin")} className="p-2 rounded-lg hover:bg-muted"><ArrowRight className="w-5 h-5" /></button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-heading font-bold truncate">תמונה כיתתית — {classLabel}</h1>
            <p className="text-xs text-muted-foreground">ניתוח מצטבר של תלמידי הכיתה</p>
          </div>
          <button onClick={runAi} disabled={!aggregate || aiLoading}
            className="btn-intake bg-primary text-primary-foreground text-sm px-3 py-2 gap-1 disabled:opacity-50">
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : insights ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {insights ? "רענן תובנות" : "הפק תובנות"}
          </button>
          <button onClick={exportPDF} disabled={!aggregate || pdfLoading}
            className="btn-intake bg-card border border-border text-sm px-3 py-2 gap-1 disabled:opacity-50">
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            הורד PDF
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {!aggregate ? (
          <div className="intake-card text-center py-12">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">אין תלמידים בכיתה זו להצגה</p>
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="intake-card-soft"><p className="text-2xl font-bold">{aggregate.studentCount}</p><p className="text-xs text-muted-foreground">תלמידים בכיתה</p></div>
              <div className="intake-card-soft"><p className="text-2xl font-bold text-success">{aggregate.completedCount}</p><p className="text-xs text-muted-foreground">מילאו שאלון</p></div>
              <div className="intake-card-soft">
                <p className="text-sm font-bold">בנים {aggregate.genderBreakdown.male} · בנות {aggregate.genderBreakdown.female}</p>
                {aggregate.genderBreakdown.unspecified > 0 && <p className="text-[10px] text-muted-foreground">לא צוין: {aggregate.genderBreakdown.unspecified}</p>}
                <p className="text-xs text-muted-foreground mt-1">פילוח מגדרי</p>
              </div>
              <div className="intake-card-soft">
                <p className="text-sm font-bold text-warning">{aggregate.studentsAtRisk.length}</p>
                <p className="text-xs text-muted-foreground">תלמידים עם דגלי תשומת לב</p>
              </div>
            </div>

            {/* Local snapshot chips */}
            {snapshot && (
              <div className="intake-card">
                <h3 className="font-heading font-bold mb-3 text-sm">תמונת מצב מהירה</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-[10px] text-muted-foreground">לכידות פרופיל</p>
                    <p className="text-lg font-bold text-primary">{snapshot.cohesion}%</p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-[10px] text-muted-foreground">מגוון בכיתה</p>
                    <p className="text-lg font-bold text-info">{snapshot.diversity}%</p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-[10px] text-muted-foreground">איזון מגדרי</p>
                    <p className="text-sm font-bold">{snapshot.genderBalance}</p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-[10px] text-muted-foreground">אחוז בסיכון</p>
                    <p className="text-lg font-bold text-warning">{snapshot.riskPercent}%</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-2 mt-3">
                  <div className="rounded-xl bg-success/5 border border-success/20 p-3">
                    <p className="text-[11px] font-bold text-success mb-1">חוזקות בולטות</p>
                    {snapshot.strengthsFocus.length ? snapshot.strengthsFocus.map(s => (
                      <p key={s.key} className="text-xs">{s.label} <span className="text-muted-foreground">— {s.avg.toFixed(2)}</span></p>
                    )) : <p className="text-xs text-muted-foreground">—</p>}
                  </div>
                  <div className="rounded-xl bg-warning/5 border border-warning/20 p-3">
                    <p className="text-[11px] font-bold text-warning mb-1">תחומים לחיזוק</p>
                    {snapshot.needsFocus.length ? snapshot.needsFocus.map(s => (
                      <p key={s.key} className="text-xs">{s.label} <span className="text-muted-foreground">— {s.avg.toFixed(2)}</span></p>
                    )) : <p className="text-xs text-muted-foreground">—</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Domain averages */}
            <div className="intake-card">
              <h3 className="font-heading font-bold mb-3 text-sm">ממוצעים כיתתיים — 5 תחומים (סולם 1-5)</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {Object.entries(aggregate.avgScores).map(([k, v]) => {
                  const label = SECTION_LABELS[k as keyof typeof SECTION_LABELS] || (
                    k === "qualityOfLife" ? "איכות חיים" :
                    k === "selfEfficacy" ? "מסוגלות עצמית" :
                    k === "locusOfControl" ? "מיקוד שליטה" :
                    k === "cognitiveFlexibility" ? "גמישות קוגניטיבית" :
                    "מאפייני למידה"
                  );
                  const color = v >= 4 ? "text-success" : v >= 3 ? "text-primary" : v >= 2 ? "text-warning" : "text-destructive";
                  return (
                    <div key={k} className="rounded-xl bg-muted/40 p-3 text-center">
                      <p className={`text-2xl font-bold ${color}`}>{v > 0 ? v.toFixed(2) : "—"}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Raw item lists removed intentionally — themes and categories replace them */}

            {/* AI Insights */}
            {error && <div className="intake-card bg-destructive/5 border-destructive/20 text-destructive text-sm">{error}</div>}
            {insights && (
              <div className="space-y-4">
                {insights.classSummary && (
                  <div className="intake-card bg-primary/5 border-primary/20">
                    <h3 className="font-heading font-bold mb-2 text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> תמונה כללית</h3>
                    <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">{insights.classSummary}</p>
                  </div>
                )}
                {insights.themedCategories && insights.themedCategories.length > 0 && (
                  <div className="intake-card">
                    <h3 className="font-heading font-bold mb-3 text-sm flex items-center gap-2"><Layers className="w-4 h-4 text-primary" /> קטגוריות עבודה</h3>
                    <div className="space-y-3">
                      {insights.themedCategories.map((c, i) => {
                        const tone = c.type === "strength" ? "border-success/30 bg-success/5"
                          : c.type === "challenge" ? "border-warning/30 bg-warning/5"
                          : "border-border bg-muted/20";
                        return (
                          <div key={i} className={`rounded-xl border p-3 ${tone}`}>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="text-sm font-bold">{c.title}</p>
                              {c.type && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-card border border-border text-muted-foreground">
                                  {c.type === "strength" ? "חוזקה" : c.type === "challenge" ? "אתגר" : "מעורב"}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-foreground/85 leading-relaxed mb-2">{c.description}</p>
                            {c.students && c.students.length > 0 && (
                              <p className="text-[11px] text-primary mb-2"><span className="font-bold">תלמידים: </span>{c.students.join(" · ")}</p>
                            )}
                            {c.practices && c.practices.length > 0 && (
                              <>
                                <p className="text-[11px] font-bold text-foreground/80 mb-1">פרקטיקות מומלצות:</p>
                                <ul className="list-disc pr-5 space-y-0.5 text-[11px] text-foreground/80">
                                  {c.practices.map((p, k) => <li key={k}>{p}</li>)}
                                </ul>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {insights.groupTherapyFocus && (
                  <div className="intake-card bg-success/5 border-success/20">
                    <h3 className="font-heading font-bold mb-2 text-sm flex items-center gap-2"><Target className="w-4 h-4 text-success" /> מוקד לטיפול הקבוצתי השבועי</h3>
                    <p className="text-sm font-bold text-foreground mb-1">{insights.groupTherapyFocus.topic}</p>
                    <p className="text-sm text-foreground/80 mb-2 leading-relaxed">{insights.groupTherapyFocus.rationale}</p>
                    {insights.groupTherapyFocus.techniques?.length > 0 && (
                      <ul className="list-disc pr-5 space-y-0.5 text-xs text-foreground/75">
                        {insights.groupTherapyFocus.techniques.map((t, i) => <li key={i}>{t}</li>)}
                      </ul>
                    )}
                  </div>
                )}
                {insights.groupWorkGoals && insights.groupWorkGoals.length > 0 && (
                  <div className="intake-card">
                    <h3 className="font-heading font-bold mb-3 text-sm flex items-center gap-2"><Flag className="w-4 h-4 text-primary" /> מטרות עבודה קבוצתית</h3>
                    <div className="space-y-2">
                      {insights.groupWorkGoals.map((g, i) => (
                        <div key={i} className="rounded-xl border border-border p-3">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-sm font-bold text-primary">מטרה {i + 1}</p>
                            {g.domain && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{g.domain}</span>}
                          </div>
                          <p className="text-sm text-foreground mb-1.5">{g.goal}</p>
                          {g.indicator && <p className="text-[11px] text-foreground/80"><span className="font-bold">אינדיקטור: </span>{g.indicator}</p>}
                          {g.weeklyPractice && <p className="text-[11px] text-foreground/80"><span className="font-bold">שבועי: </span>{g.weeklyPractice}</p>}
                          {g.targetStudents && g.targetStudents.length > 0 && (
                            <p className="text-[11px] text-primary mt-1"><span className="font-bold">מיועד ל: </span>{g.targetStudents.join(" · ")}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {insights.subGroups && insights.subGroups.length > 0 && (
                  <div className="intake-card">
                    <h3 className="font-heading font-bold mb-3 text-sm">תת-קבוצות בכיתה</h3>
                    <div className="space-y-2">
                      {insights.subGroups.map((g, i) => (
                        <div key={i} className="rounded-xl border border-border p-3">
                          <p className="text-sm font-bold">{g.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">{g.students.join(" · ")}</p>
                          <p className="text-xs text-foreground/80 mt-2"><span className="font-medium">משותף: </span>{g.sharedNeed}</p>
                          <p className="text-xs text-foreground/80 mt-1"><span className="font-medium">מומלץ: </span>{g.suggestedIntervention}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid md:grid-cols-2 gap-4">
                  {insights.anchors && insights.anchors.length > 0 && (
                    <div className="intake-card">
                      <h3 className="font-heading font-bold mb-2 text-sm text-success">תלמידים עוגן</h3>
                      <ul className="space-y-1.5 text-xs">
                        {insights.anchors.map((a, i) => (
                          <li key={i}><span className="font-bold">{a.name}: </span><span className="text-foreground/80">{a.why}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {insights.atRisk && insights.atRisk.length > 0 && (
                    <div className="intake-card">
                      <h3 className="font-heading font-bold mb-2 text-sm text-warning">בסיכון מוגבר</h3>
                      <ul className="space-y-1.5 text-xs">
                        {insights.atRisk.map((a, i) => (
                          <li key={i}><span className="font-bold">{a.name}: </span><span className="text-foreground/80">{a.why}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {insights.pedagogicalNote && (
                  <div className="intake-card bg-info/5 border-info/20">
                    <h3 className="font-heading font-bold mb-2 text-sm">הערה למחנכת</h3>
                    <p className="text-sm text-foreground/85 leading-relaxed">{insights.pedagogicalNote}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ClassInsights;