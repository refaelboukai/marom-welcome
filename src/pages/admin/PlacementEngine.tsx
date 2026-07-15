import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getSessionsDB, getClassGroups, DEFAULT_CLASS_GROUPS, ClassGroupsMap, updateSessionDB } from "@/lib/supabase-storage";
import { IntakeSession } from "@/lib/types";
import { aggregateClass, buildStudentProfile, computeClassSnapshot } from "@/lib/class-aggregations";
import { ArrowRight, Loader2, Sparkles, CheckCircle, AlertTriangle, User, Target, GitCompare, Users, TrendingUp, TrendingDown } from "lucide-react";
import { getTeacherProfiles, TeacherProfilesMap } from "@/lib/supabase-storage";

interface Suggestion {
  recommendedClassKey?: string;
  confidence?: "high" | "medium" | "low";
  rationale?: string;
  teacherFit?: { teacherName?: string; strengths?: string[]; risks?: string[] };
  alternative?: { classKey: string; whyLess: string };
  flags?: string[];
  error?: string;
}

const PlacementEngine = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<IntakeSession[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroupsMap>(DEFAULT_CLASS_GROUPS);
  const [teachers, setTeachers] = useState<TeacherProfilesMap>({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [confirmed, setConfirmed] = useState<Record<string, string>>({});
  const [showAssigned, setShowAssigned] = useState(false);
  const [mode, setMode] = useState<"all" | "single" | "compare">("all");
  const [targetClass, setTargetClass] = useState<string>("");
  const [compareClasses, setCompareClasses] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([getSessionsDB(), getClassGroups(), getTeacherProfiles()]).then(([s, g, t]) => {
      setSessions(s);
      setClassGroups(g);
      setTeachers(t);
      setLoading(false);
    });
  }, []);

  const candidates = useMemo(() => sessions.filter((s) => s.status !== "archived" && (showAssigned || !s.classGroup)), [sessions, showAssigned]);

  const classAggregates = useMemo(() => {
    return Object.entries(classGroups).map(([key, label]) => {
      const classSessions = sessions.filter((s) => s.classGroup === key && s.status !== "archived");
      const aggregate = aggregateClass(key, label, classSessions);
      const snapshot = computeClassSnapshot(aggregate);
      return { key, label, aggregate, snapshot };
    });
  }, [sessions, classGroups]);

  const runSuggest = async (session: IntakeSession) => {
    setSelectedId(session.id);
    setSuggestion(null);
    setAiLoading(true);
    try {
      const studentProfile = buildStudentProfile(session);
      // Filter class list by mode
      let selected = classAggregates;
      if (mode === "single" && targetClass) {
        selected = classAggregates.filter((c) => c.key === targetClass);
      } else if (mode === "compare" && compareClasses.length === 2) {
        selected = classAggregates.filter((c) => compareClasses.includes(c.key));
      }
      const classesPayload = selected.map((c) => ({
        key: c.key,
        label: c.label,
        teacher: teachers[c.key]?.name || undefined,
        teacherBio: teachers[c.key]?.bio || undefined,
        teacherNotes: teachers[c.key]?.notes || undefined,
        studentCount: c.aggregate.studentCount,
        genderBreakdown: c.aggregate.genderBreakdown,
        gradeDistribution: c.aggregate.gradeDistribution,
        avgScores: c.aggregate.avgScores,
        studentsAtRiskCount: c.aggregate.studentsAtRisk.length,
        // brief per-student snapshots
        students: c.aggregate.studentProfiles.map((p) => ({
          name: p.name, grade: p.grade, gender: p.gender,
          scores: p.scores,
          topStrengths: p.topStrengths.slice(0, 3),
          topChallenges: p.topChallenges.slice(0, 3),
        })),
      }));
      const { data, error } = await supabase.functions.invoke("placement-suggest", {
        body: { student: studentProfile, classes: classesPayload, mode },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSuggestion(data);
    } catch (e: any) {
      setSuggestion({ error: e?.message || "שגיאה בהפקת ההמלצה" });
    } finally {
      setAiLoading(false);
    }
  };

  const canRun = mode === "all" || (mode === "single" && !!targetClass) || (mode === "compare" && compareClasses.length === 2);

  const toggleCompare = (key: string) => {
    setCompareClasses((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 2) return [prev[1], key];
      return [...prev, key];
    });
  };

  const confirmAssign = async () => {
    if (!selectedId || !suggestion?.recommendedClassKey) return;
    await updateSessionDB(selectedId, { classGroup: suggestion.recommendedClassKey } as any);
    setConfirmed((prev) => ({ ...prev, [selectedId]: suggestion.recommendedClassKey! }));
    const fresh = await getSessionsDB();
    setSessions(fresh);
    setSelectedId(null);
    setSuggestion(null);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const selected = sessions.find((s) => s.id === selectedId);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/admin")} className="p-2 rounded-lg hover:bg-muted"><ArrowRight className="w-5 h-5" /></button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-heading font-bold truncate flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> מנוע שיבוץ חכם</h1>
            <p className="text-xs text-muted-foreground">המלצה חכמה לשיבוץ תלמיד לכיתה — מבוססת פרופיל, גיל, מגדר והרכב הכיתה</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {/* Class snapshots — always visible */}
        <div className="intake-card">
          <h3 className="font-heading font-bold text-sm mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> תמונת מצב לכיתות</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {classAggregates.map(({ key, label, aggregate, snapshot }) => (
              <div key={key} className="rounded-xl border border-border p-3 bg-muted/10">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-bold">{label}</p>
                  <span className="text-[10px] text-muted-foreground">{aggregate.studentCount} תלמידים</span>
                </div>
                <div className="flex flex-wrap gap-1 text-[10px] mb-2">
                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">לכידות {snapshot.cohesion}%</span>
                  <span className="px-1.5 py-0.5 rounded bg-info/10 text-info">מגוון {snapshot.diversity}%</span>
                  <span className="px-1.5 py-0.5 rounded bg-muted text-foreground/70">{snapshot.genderBalance}</span>
                  {snapshot.riskPercent > 0 && <span className="px-1.5 py-0.5 rounded bg-warning/10 text-warning">{snapshot.riskPercent}% בסיכון</span>}
                </div>
                {snapshot.strengthsFocus[0] && (
                  <p className="text-[10.5px] text-success flex items-center gap-1"><TrendingUp className="w-3 h-3" /> חוזק: {snapshot.strengthsFocus[0].label} ({snapshot.strengthsFocus[0].avg.toFixed(1)})</p>
                )}
                {snapshot.needsFocus[0] && (
                  <p className="text-[10.5px] text-warning flex items-center gap-1"><TrendingDown className="w-3 h-3" /> חיזוק: {snapshot.needsFocus[0].label} ({snapshot.needsFocus[0].avg.toFixed(1)})</p>
                )}
              </div>
            ))}
          </div>
        </div>

      <div className="grid md:grid-cols-[320px_1fr] gap-4">
        {/* Students list */}
        <div className="intake-card p-3 h-fit">
          {/* Match mode selector */}
          <div className="mb-3 pb-3 border-b border-border">
            <p className="text-[11px] font-bold text-muted-foreground mb-1.5">מצב בדיקה</p>
            <div className="grid grid-cols-3 gap-1">
              <button onClick={() => setMode("all")}
                className={`text-[11px] rounded-lg px-2 py-1.5 flex flex-col items-center gap-0.5 transition-colors ${mode === "all" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"}`}>
                <Sparkles className="w-3.5 h-3.5" /> כל הכיתות
              </button>
              <button onClick={() => setMode("single")}
                className={`text-[11px] rounded-lg px-2 py-1.5 flex flex-col items-center gap-0.5 transition-colors ${mode === "single" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"}`}>
                <Target className="w-3.5 h-3.5" /> לכיתה מסוימת
              </button>
              <button onClick={() => setMode("compare")}
                className={`text-[11px] rounded-lg px-2 py-1.5 flex flex-col items-center gap-0.5 transition-colors ${mode === "compare" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"}`}>
                <GitCompare className="w-3.5 h-3.5" /> השוואת 2
              </button>
            </div>
            {mode === "single" && (
              <select value={targetClass} onChange={(e) => setTargetClass(e.target.value)}
                className="mt-2 w-full bg-card border border-input rounded-lg px-2 py-1.5 text-xs">
                <option value="">בחר כיתה...</option>
                {Object.entries(classGroups).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            )}
            {mode === "compare" && (
              <div className="mt-2 space-y-1">
                <p className="text-[10px] text-muted-foreground">בחר 2 כיתות ({compareClasses.length}/2)</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(classGroups).map(([k, l]) => (
                    <button key={k} onClick={() => toggleCompare(k)}
                      className={`text-[10px] px-2 py-1 rounded-full transition-colors ${compareClasses.includes(k) ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-heading font-bold">תלמידים</h3>
            <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
              <input type="checkbox" checked={showAssigned} onChange={(e) => setShowAssigned(e.target.checked)} className="accent-primary" />
              הצג גם משוייכים
            </label>
          </div>
          {candidates.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">אין תלמידים ללא שיוך</p>
          ) : (
            <div className="space-y-1 max-h-[70vh] overflow-y-auto">
              {candidates.map((s) => (
                <button key={s.id} onClick={() => canRun && runSuggest(s)} disabled={!canRun}
                  className={`w-full text-right rounded-xl px-3 py-2 transition-colors disabled:opacity-40 ${selectedId === s.id ? "bg-primary/10" : "hover:bg-muted/50"}`}>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.studentName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {s.grade ? `כיתה ${s.grade}` : "ללא כיתה"}
                        {s.classGroup ? ` · ${classGroups[s.classGroup] || s.classGroup}` : " · ללא שיוך"}
                      </p>
                    </div>
                    {confirmed[s.id] && <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Result */}
        <div className="space-y-3">
          {!selected ? (
            <div className="intake-card text-center py-16">
              <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">בחר תלמיד מהרשימה כדי לקבל המלצת שיבוץ</p>
            </div>
          ) : aiLoading ? (
            <div className="intake-card text-center py-16">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">מנתח פרופיל ומתאים לכיתה...</p>
            </div>
          ) : suggestion?.error ? (
            <div className="intake-card bg-destructive/5 border-destructive/20 text-destructive text-sm">{suggestion.error}</div>
          ) : suggestion ? (
            <>
              <div className="intake-card bg-primary/5 border-primary/20">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-xs text-muted-foreground">המלצה עבור {selected.studentName}</p>
                    <h2 className="text-2xl font-heading font-bold text-primary">
                      {classGroups[suggestion.recommendedClassKey || ""] || suggestion.recommendedClassKey || "—"}
                    </h2>
                  </div>
                  {suggestion.confidence && (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      suggestion.confidence === "high" ? "bg-success/15 text-success" :
                      suggestion.confidence === "medium" ? "bg-warning/15 text-warning" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      ביטחון: {suggestion.confidence === "high" ? "גבוה" : suggestion.confidence === "medium" ? "בינוני" : "נמוך"}
                    </span>
                  )}
                </div>
                {suggestion.rationale && <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">{suggestion.rationale}</p>}
                {suggestion.teacherFit && (suggestion.teacherFit.strengths?.length || suggestion.teacherFit.risks?.length) ? (
                  <div className="mt-3 pt-3 border-t border-primary/20 space-y-1.5">
                    <p className="text-[11px] font-bold text-muted-foreground">התאמה למחנכת {suggestion.teacherFit.teacherName || ""}</p>
                    {suggestion.teacherFit.strengths && suggestion.teacherFit.strengths.length > 0 && (
                      <div className="text-xs text-success">
                        <span className="font-bold">חוזקות חפיפה: </span>
                        {suggestion.teacherFit.strengths.join(" · ")}
                      </div>
                    )}
                    {suggestion.teacherFit.risks && suggestion.teacherFit.risks.length > 0 && (
                      <div className="text-xs text-warning">
                        <span className="font-bold">נקודות חיכוך אפשריות: </span>
                        {suggestion.teacherFit.risks.join(" · ")}
                      </div>
                    )}
                  </div>
                ) : null}
                <button onClick={confirmAssign}
                  disabled={!suggestion.recommendedClassKey}
                  className="btn-intake bg-primary text-primary-foreground text-sm mt-4 gap-1 disabled:opacity-50">
                  <CheckCircle className="w-4 h-4" /> אשר שיבוץ ל{classGroups[suggestion.recommendedClassKey || ""] || "כיתה זו"}
                </button>
              </div>

              {suggestion.alternative?.classKey && (
                <div className="intake-card">
                  <h3 className="text-sm font-heading font-bold mb-1">אלטרנטיבה: {classGroups[suggestion.alternative.classKey] || suggestion.alternative.classKey}</h3>
                  <p className="text-xs text-foreground/80 leading-relaxed">{suggestion.alternative.whyLess}</p>
                </div>
              )}

              {suggestion.flags && suggestion.flags.length > 0 && (
                <div className="intake-card bg-warning/5 border-warning/20">
                  <h3 className="text-sm font-heading font-bold mb-2 flex items-center gap-2 text-warning"><AlertTriangle className="w-4 h-4" /> דגלי תשומת לב</h3>
                  <ul className="list-disc pr-5 space-y-1 text-xs text-foreground/85">
                    {suggestion.flags.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
      </div>
    </div>
  );
};

export default PlacementEngine;