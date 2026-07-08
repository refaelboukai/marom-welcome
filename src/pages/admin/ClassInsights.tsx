import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getSessionsDB, getClassGroups, DEFAULT_CLASS_GROUPS, ClassGroupsMap } from "@/lib/supabase-storage";
import { IntakeSession, SECTION_LABELS, QOL_SUBDOMAIN_LABELS, LC_SUBDOMAIN_LABELS } from "@/lib/types";
import { aggregateClass, ClassAggregate } from "@/lib/class-aggregations";
import { ArrowRight, Loader2, Sparkles, Users, AlertTriangle, Target, RefreshCw, Star } from "lucide-react";

interface InsightsResult {
  classSummary?: string;
  commonThemes?: string[];
  groupTherapyFocus?: { topic: string; rationale: string; techniques: string[] };
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
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [insights, setInsights] = useState<InsightsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getSessionsDB(), getClassGroups()]).then(([s, g]) => {
      setSessions(s);
      setClassGroups(g);
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

            {/* Common items heatmap-like list */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="intake-card">
                <h3 className="font-heading font-bold mb-3 text-sm flex items-center gap-2"><Star className="w-4 h-4 text-success" /> חוזקות משותפות</h3>
                {aggregate.commonStrengths.length === 0 ? <p className="text-xs text-muted-foreground">אין נתונים</p> : (
                  <ul className="space-y-1.5">
                    {aggregate.commonStrengths.map((it) => (
                      <li key={it.itemId} className="flex items-start gap-2 text-xs">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-success/15 text-success font-bold min-w-[2rem] text-center">{it.count}</span>
                        <span className="flex-1 text-foreground/80">{it.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="intake-card">
                <h3 className="font-heading font-bold mb-3 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warning" /> אתגרים משותפים</h3>
                {aggregate.commonChallenges.length === 0 ? <p className="text-xs text-muted-foreground">אין נתונים</p> : (
                  <ul className="space-y-1.5">
                    {aggregate.commonChallenges.map((it) => (
                      <li key={it.itemId} className="flex items-start gap-2 text-xs">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-warning/15 text-warning font-bold min-w-[2rem] text-center">{it.count}</span>
                        <span className="flex-1 text-foreground/80">{it.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

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
                {insights.commonThemes && insights.commonThemes.length > 0 && (
                  <div className="intake-card">
                    <h3 className="font-heading font-bold mb-2 text-sm">נושאים שמעסיקים את הכיתה</h3>
                    <ul className="list-disc pr-5 space-y-1 text-sm text-foreground/85">
                      {insights.commonThemes.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
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