import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getSessionsDB, getClassGroups, DEFAULT_CLASS_GROUPS, ClassGroupsMap, updateSessionDB } from "@/lib/supabase-storage";
import { IntakeSession } from "@/lib/types";
import { aggregateClass, buildStudentProfile, computeClassSnapshot } from "@/lib/class-aggregations";
import { ArrowRight, Loader2, Sparkles, CheckCircle, AlertTriangle, User, Target, GitCompare, Users, TrendingUp, TrendingDown, FileText, Upload, FileUp, X, Wand2, MessageCircle, Send } from "lucide-react";
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

interface BatchAssignment {
  studentId: string;
  studentName: string;
  classKey: string;
  confidence?: "high" | "medium" | "low";
  rationale?: string;
}
interface BatchQuestion { studentId?: string; studentName?: string; question: string; }
interface BatchResult {
  assignments: BatchAssignment[];
  overallRationale?: string;
  classSummaries?: Array<{ classKey: string; newStudents: string[]; note: string }>;
  openQuestions?: BatchQuestion[];
  flags?: string[];
  error?: string;
}
interface ChatMsg { role: "user" | "assistant"; content: string; }

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

  // Narrative summary state (per selected student)
  const [narrative, setNarrative] = useState("");
  const [narrativeSaved, setNarrativeSaved] = useState(false);
  const [narrativeSaving, setNarrativeSaving] = useState(false);
  const [narrativeUploading, setNarrativeUploading] = useState(false);
  const [narrativeError, setNarrativeError] = useState("");
  const narrativeFileRef = useRef<HTMLInputElement>(null);

  // Bulk narrative upload (one file → many students)
  const bulkFileRef = useRef<HTMLInputElement>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkResults, setBulkResults] = useState<Array<{ studentId: string; studentName: string; found: boolean; summary: string; selected: boolean }> | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkSavedCount, setBulkSavedCount] = useState(0);

  // Batch (all-at-once) placement + chat
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [batchError, setBatchError] = useState("");
  const [batchChat, setBatchChat] = useState<ChatMsg[]>([]);
  const [batchInput, setBatchInput] = useState("");
  const [batchConfirming, setBatchConfirming] = useState(false);
  const [batchOverrides, setBatchOverrides] = useState<Record<string, string>>({});

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
    setNarrative((session as any).narrativeSummary || "");
    setNarrativeSaved(false);
    setNarrativeError("");
    try {
      const studentProfile = buildStudentProfile(session);
      // Ensure the latest edits are included even if not saved yet
      (studentProfile as any).narrativeSummary = narrative || (session as any).narrativeSummary || "";
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

  const handleSaveNarrative = async () => {
    if (!selectedId) return;
    setNarrativeSaving(true);
    await updateSessionDB(selectedId, { narrativeSummary: narrative } as any);
    setSessions((prev) => prev.map((s) => s.id === selectedId ? ({ ...s, narrativeSummary: narrative } as any) : s));
    setNarrativeSaving(false);
    setNarrativeSaved(true);
    setTimeout(() => setNarrativeSaved(false), 2000);
  };

  const handleNarrativeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNarrativeError("");
    if (file.size > 15 * 1024 * 1024) {
      setNarrativeError("קובץ גדול מ-15MB");
      e.target.value = "";
      return;
    }
    setNarrativeUploading(true);
    try {
      if (file.type.startsWith("text/") || /\.txt$/i.test(file.name)) {
        const txt = await file.text();
        setNarrative((prev) => (prev ? prev + "\n\n" : "") + txt);
      } else {
        const base64: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(((reader.result as string) || "").split(",")[1] || "");
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const { data, error } = await supabase.functions.invoke("extract-document-text", {
          body: { filename: file.name, mimeType: file.type || "application/octet-stream", base64 },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        const extracted = (data as any)?.text || "";
        if (!extracted) throw new Error("לא ניתן לחלץ טקסט מהקובץ");
        setNarrative((prev) => (prev ? prev + "\n\n" : "") + extracted);
      }
      setNarrativeSaved(false);
    } catch (err: any) {
      setNarrativeError(err?.message || "שגיאה בטעינת הקובץ");
    } finally {
      setNarrativeUploading(false);
      if (narrativeFileRef.current) narrativeFileRef.current.value = "";
    }
  };

  const handleBulkFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkError("");
    setBulkResults(null);
    setBulkSavedCount(0);
    if (file.size > 20 * 1024 * 1024) {
      setBulkError("קובץ גדול מ-20MB");
      e.target.value = "";
      return;
    }
    setBulkLoading(true);
    try {
      // 1) Extract text from file
      let extracted = "";
      if (file.type.startsWith("text/") || /\.txt$/i.test(file.name) || /\.csv$/i.test(file.name)) {
        extracted = await file.text();
      } else {
        const base64: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(((reader.result as string) || "").split(",")[1] || "");
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const { data, error } = await supabase.functions.invoke("extract-document-text", {
          body: { filename: file.name, mimeType: file.type || "application/octet-stream", base64 },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        extracted = (data as any)?.text || "";
      }
      if (!extracted.trim()) throw new Error("לא ניתן לחלץ טקסט מהקובץ");

      // 2) Split by student
      const studentList = sessions
        .filter((s) => s.status !== "archived")
        .map((s) => ({ id: s.id, name: s.studentName }));
      const { data: splitData, error: splitErr } = await supabase.functions.invoke("split-narratives", {
        body: { text: extracted, students: studentList },
      });
      if (splitErr) throw splitErr;
      if ((splitData as any)?.error) throw new Error((splitData as any).error);
      const results = (((splitData as any)?.results) || []) as Array<{ studentId: string; studentName: string; found: boolean; summary: string }>;
      setBulkResults(results.map((r) => ({ ...r, selected: !!r.found && !!r.summary?.trim() })));
    } catch (err: any) {
      setBulkError(err?.message || "שגיאה בעיבוד הקובץ");
    } finally {
      setBulkLoading(false);
      if (bulkFileRef.current) bulkFileRef.current.value = "";
    }
  };

  const applyBulk = async () => {
    if (!bulkResults) return;
    setBulkSaving(true);
    let count = 0;
    for (const r of bulkResults) {
      if (!r.selected || !r.summary?.trim()) continue;
      try {
        await updateSessionDB(r.studentId, { narrativeSummary: r.summary } as any);
        count++;
      } catch (e) {
        console.error("bulk save error", r.studentId, e);
      }
    }
    const fresh = await getSessionsDB();
    setSessions(fresh);
    setBulkSavedCount(count);
    setBulkSaving(false);
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

  const buildClassesPayload = () => classAggregates.map((c) => ({
    key: c.key,
    label: c.label,
    teacher: teachers[c.key]?.name || undefined,
    teacherBio: teachers[c.key]?.bio || undefined,
    teacherNotes: teachers[c.key]?.notes || undefined,
    teacherGrades: teachers[c.key]?.grades || [],
    currentStudentCount: c.aggregate.studentCount,
    genderBreakdown: c.aggregate.genderBreakdown,
    gradeDistribution: c.aggregate.gradeDistribution,
    avgScores: c.aggregate.avgScores,
    studentsAtRiskCount: c.aggregate.studentsAtRisk.length,
    students: c.aggregate.studentProfiles.map((p) => ({
      name: p.name, grade: p.grade, gender: p.gender,
      scores: p.scores,
      topStrengths: p.topStrengths.slice(0, 3),
      topChallenges: p.topChallenges.slice(0, 3),
    })),
  }));

  const runBatch = async (extraChat: ChatMsg[] = batchChat) => {
    setBatchLoading(true);
    setBatchError("");
    try {
      const unassigned = sessions.filter((s) => s.status !== "archived" && !s.classGroup);
      if (unassigned.length === 0) throw new Error("אין תלמידים ללא שיוך");
      const studentsPayload = unassigned.map((s) => buildStudentProfile(s));
      const { data, error } = await supabase.functions.invoke("placement-batch", {
        body: { students: studentsPayload, classes: buildClassesPayload(), chatMessages: extraChat },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const res = data as BatchResult;
      setBatchResult(res);
      setBatchOverrides({});
      // Add assistant summary to chat
      const cleanRationale = (() => {
        const r = (res.overallRationale || "").trim();
        if (!r) return "";
        // Hide raw JSON / code fences from the chat message
        if (r.startsWith("{") || r.startsWith("[") || r.startsWith("```") || /"assignments"\s*:/.test(r)) return "";
        return r;
      })();
      const assistantMsg = [
        cleanRationale ? `**רציונל כולל:** ${cleanRationale}` : "",
        res.openQuestions && res.openQuestions.length > 0
          ? "\n\n**חסר לי מידע כדי לשבץ בביטחון:**\n" + res.openQuestions.map((q) => `• ${q.studentName ? q.studentName + " — " : ""}${q.question}`).join("\n")
          : "\n\nיש לי מספיק מידע להצעת השיבוץ. תוכל/י לאשר או לשנות פרטנית.",
      ].filter(Boolean).join("");
      setBatchChat((prev) => [...prev, { role: "assistant", content: assistantMsg }]);
    } catch (e: any) {
      setBatchError(e?.message || "שגיאה בהפקת השיבוץ");
    } finally {
      setBatchLoading(false);
    }
  };

  const openBatch = () => {
    navigate("/admin/placement/smart");
  };

  const sendBatchMessage = async () => {
    const text = batchInput.trim();
    if (!text) return;
    const nextChat: ChatMsg[] = [...batchChat, { role: "user", content: text }];
    setBatchChat(nextChat);
    setBatchInput("");
    await runBatch(nextChat);
  };

  const confirmBatch = async () => {
    if (!batchResult?.assignments) return;
    setBatchConfirming(true);
    try {
      for (const a of batchResult.assignments) {
        const classKey = batchOverrides[a.studentId] || a.classKey;
        if (!classKey) continue;
        try { await updateSessionDB(a.studentId, { classGroup: classKey } as any); } catch (e) { console.error(e); }
      }
      const fresh = await getSessionsDB();
      setSessions(fresh);
      setBatchOpen(false);
      setBatchResult(null);
      setBatchChat([]);
    } finally {
      setBatchConfirming(false);
    }
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
        {/* Smart batch placement CTA */}
        <div className="intake-card bg-gradient-to-l from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-primary" />
                שיבוץ חכם — כל התלמידים בבת אחת
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                המערכת תחלק את כל התלמידים הלא-משוייכים בין הכיתות, תסביר את הרציונל, ותשאל אותך שאלות אם חסר לה מידע.
              </p>
            </div>
            <button onClick={openBatch}
              className="btn-intake bg-primary text-primary-foreground text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> הפעל שיבוץ חכם
            </button>
          </div>
        </div>

        {/* Bulk narrative upload */}
        <div className="intake-card border-primary/20">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="font-heading font-bold text-sm flex items-center gap-2">
              <FileUp className="w-4 h-4 text-primary" />
              העלאת קובץ סיכומים לכל התלמידים
            </h3>
            {bulkResults && (
              <button onClick={() => { setBulkResults(null); setBulkSavedCount(0); setBulkError(""); }} className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1">
                <X className="w-3 h-3" /> נקה
              </button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mb-2">
            העלה קובץ אחד (PDF / Word / TXT) שמכיל תיאורים על תלמידים לפי שם. המערכת תזהה את כל התלמידים ותשמור לכל אחד את הסיכום שלו.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={bulkFileRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv"
              onChange={handleBulkFile}
              className="hidden"
            />
            <button
              onClick={() => bulkFileRef.current?.click()}
              disabled={bulkLoading || bulkSaving}
              className="btn-intake bg-primary text-primary-foreground text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {bulkLoading ? "מעבד קובץ..." : "בחירת קובץ"}
            </button>
            {bulkResults && (
              <span className="text-[11px] text-muted-foreground">
                זוהו {bulkResults.filter((r) => r.found && r.summary?.trim()).length} מתוך {bulkResults.length} תלמידים
              </span>
            )}
          </div>
          {bulkError && <div className="text-[11px] text-destructive mt-2">{bulkError}</div>}

          {bulkResults && (
            <div className="mt-3 space-y-2">
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {bulkResults.map((r, i) => (
                  <div key={r.studentId} className={`rounded-xl border p-2.5 ${r.found && r.summary?.trim() ? "border-success/30 bg-success/5" : "border-border bg-muted/20 opacity-70"}`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={r.selected}
                          disabled={!r.found || !r.summary?.trim()}
                          onChange={(e) => {
                            const v = e.target.checked;
                            setBulkResults((prev) => prev ? prev.map((x, j) => j === i ? { ...x, selected: v } : x) : prev);
                          }}
                          className="accent-primary"
                        />
                        <span className="text-sm font-medium">{r.studentName}</span>
                      </label>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.found && r.summary?.trim() ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                        {r.found && r.summary?.trim() ? "זוהה" : "לא נמצא"}
                      </span>
                    </div>
                    {r.summary?.trim() && (
                      <textarea
                        value={r.summary}
                        onChange={(e) => {
                          const v = e.target.value;
                          setBulkResults((prev) => prev ? prev.map((x, j) => j === i ? { ...x, summary: v } : x) : prev);
                        }}
                        rows={3}
                        dir="rtl"
                        className="w-full bg-background border border-input rounded-lg p-2 text-xs resize-y"
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <button
                  onClick={applyBulk}
                  disabled={bulkSaving || !bulkResults.some((r) => r.selected && r.summary?.trim())}
                  className="btn-intake bg-primary text-primary-foreground text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {bulkSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  שמור סיכומים לתלמידים המסומנים
                </button>
                {bulkSavedCount > 0 && (
                  <span className="text-[11px] text-success flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> נשמרו {bulkSavedCount} סיכומים
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

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
                <div className="flex flex-wrap gap-1 text-[10px] mb-1.5">
                  {(teachers[key]?.grades?.length ?? 0) > 0 ? (
                    teachers[key]!.grades!.map((g) => (
                      <span key={g} className="px-1.5 py-0.5 rounded bg-success/10 text-success font-bold">שכבה {g}</span>
                    ))
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">לא הוגדרה שכבה</span>
                  )}
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
          ) : (
            <>
              {/* Narrative Summary — feeds the placement engine */}
              <div className="intake-card border-primary/20">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    סיכום מילולי — {selected.studentName}
                  </h3>
                  <span className="text-[10px] text-muted-foreground">{narrative.length.toLocaleString()} תווים</span>
                </div>
                <p className="text-[11px] text-muted-foreground mb-2">
                  רקע איכותני, אבחונים, המלצות ותובנות. מוזן למנוע השיבוץ כמקור מידע ראשי לצד השאלונים.
                </p>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <input
                    ref={narrativeFileRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    onChange={handleNarrativeFile}
                    className="hidden"
                  />
                  <button
                    onClick={() => narrativeFileRef.current?.click()}
                    disabled={narrativeUploading}
                    className="btn-intake bg-primary/10 text-primary text-xs flex items-center gap-1.5 hover:bg-primary/20 border border-primary/20"
                  >
                    {narrativeUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {narrativeUploading ? "מחלץ טקסט..." : "העלאת קובץ (PDF/Word/TXT)"}
                  </button>
                  {narrative && (
                    <button
                      onClick={() => { setNarrative(""); setNarrativeSaved(false); }}
                      className="text-[11px] text-muted-foreground hover:text-destructive"
                    >
                      נקה
                    </button>
                  )}
                  <button
                    onClick={handleSaveNarrative}
                    disabled={narrativeSaving}
                    className="btn-intake bg-secondary text-secondary-foreground text-xs mr-auto flex items-center gap-1.5"
                  >
                    {narrativeSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    שמור
                  </button>
                  {narrativeSaved && <span className="text-[11px] text-success flex items-center gap-1"><CheckCircle className="w-3 h-3" /> נשמר</span>}
                </div>
                {narrativeError && <div className="text-[11px] text-destructive mb-2">{narrativeError}</div>}
                <textarea
                  className="w-full bg-background border border-input rounded-xl p-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={5}
                  value={narrative}
                  onChange={(e) => { setNarrative(e.target.value); setNarrativeSaved(false); }}
                  placeholder="הדבק/י טקסט או העלה/י קובץ עם רקע וסיכום מילולי על התלמיד/ה..."
                  dir="rtl"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  יש ללחוץ "שמור" לפני הפקת המלצה כדי שהמנוע ישתמש במידע המעודכן.
                </p>
              </div>

              {aiLoading ? (
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
            </>
          )}
        </div>
      </div>
      </div>

      {batchOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3" onClick={() => !batchLoading && !batchConfirming && setBatchOpen(false)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
              <h2 className="font-heading font-bold text-base flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-primary" /> שיבוץ חכם
              </h2>
              <button onClick={() => setBatchOpen(false)} disabled={batchLoading || batchConfirming} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-50">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!batchResult && !batchLoading && !batchError && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-3">
                    יש {sessions.filter((s) => s.status !== "archived" && !s.classGroup).length} תלמידים ללא שיוך.
                    <br />לחץ/י על "התחל" כדי לקבל הצעת חלוקה לכל הכיתות בבת אחת.
                  </p>
                  <button onClick={() => runBatch([])} className="btn-intake bg-primary text-primary-foreground text-sm inline-flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> התחל שיבוץ
                  </button>
                </div>
              )}

              {batchLoading && (
                <div className="text-center py-10">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-3" />
                  <p className="text-sm text-muted-foreground">מנתח פרופילים ומחלק בין הכיתות...</p>
                </div>
              )}

              {batchError && (
                <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 text-sm text-destructive">{batchError}</div>
              )}

              {batchResult && !batchLoading && (
                <>
                  {/* Class summaries */}
                  {batchResult.classSummaries && batchResult.classSummaries.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {batchResult.classSummaries.map((c) => (
                        <div key={c.classKey} className="rounded-xl border border-border p-2.5 bg-muted/10">
                          <p className="text-sm font-bold text-primary">{classGroups[c.classKey] || c.classKey}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">מצטרפים: {c.newStudents?.join(" · ") || "—"}</p>
                          {c.note && <p className="text-[11.5px] text-foreground/80 mt-1">{c.note}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Per-student assignments */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-muted-foreground">שיבוצים מוצעים</h3>
                    {batchResult.assignments.map((a) => (
                      <div key={a.studentId} className="rounded-xl border border-border p-2.5">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <p className="text-sm font-medium truncate">{a.studentName}</p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {a.confidence && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                a.confidence === "high" ? "bg-success/15 text-success" :
                                a.confidence === "medium" ? "bg-warning/15 text-warning" :
                                "bg-muted text-muted-foreground"
                              }`}>
                                {a.confidence === "high" ? "גבוה" : a.confidence === "medium" ? "בינוני" : "נמוך"}
                              </span>
                            )}
                            <select
                              value={batchOverrides[a.studentId] || a.classKey}
                              onChange={(e) => setBatchOverrides((prev) => ({ ...prev, [a.studentId]: e.target.value }))}
                              className="bg-card border border-input rounded-lg px-2 py-1 text-xs"
                            >
                              {Object.entries(classGroups).map(([k, l]) => (
                                <option key={k} value={k}>{l}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {a.rationale && <p className="text-[11.5px] text-foreground/75 leading-relaxed">{a.rationale}</p>}
                      </div>
                    ))}
                  </div>

                  {batchResult.flags && batchResult.flags.length > 0 && (
                    <div className="rounded-xl bg-warning/5 border border-warning/20 p-2.5">
                      <p className="text-xs font-bold text-warning flex items-center gap-1.5 mb-1"><AlertTriangle className="w-3.5 h-3.5" /> דגלי אזהרה</p>
                      <ul className="list-disc pr-5 space-y-0.5 text-[11.5px] text-foreground/85">
                        {batchResult.flags.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {/* Chat */}
              {batchChat.length > 0 && (
                <div className="rounded-xl border border-border bg-muted/10 p-3 space-y-2">
                  <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" /> שיחה עם המנוע</p>
                  {batchChat.map((m, i) => (
                    <div key={i} className={`text-[12px] whitespace-pre-wrap leading-relaxed rounded-lg p-2 ${m.role === "assistant" ? "bg-primary/5 border border-primary/10" : "bg-background border border-border"}`}>
                      <span className="text-[10px] font-bold text-muted-foreground block mb-0.5">{m.role === "assistant" ? "מנוע השיבוץ" : "אתה"}</span>
                      {m.content}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {batchResult && !batchLoading && (
              <div className="border-t border-border p-3 space-y-2">
                <div className="flex items-end gap-2">
                  <textarea
                    value={batchInput}
                    onChange={(e) => setBatchInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendBatchMessage(); }}
                    rows={2}
                    dir="rtl"
                    placeholder="ענה/י על שאלות המנוע או הוסף/י מידע — לדוגמה: 'נעם מתקשה בוויסות כשיש רעש', 'שיבוץ עדן לכיתה אחרת'..."
                    className="flex-1 bg-background border border-input rounded-xl p-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button onClick={sendBatchMessage} disabled={!batchInput.trim() || batchLoading}
                    className="btn-intake bg-secondary text-secondary-foreground text-xs flex items-center gap-1 disabled:opacity-50">
                    <Send className="w-3.5 h-3.5" /> שלח
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10.5px] text-muted-foreground">לאחר מענה — המנוע יעדכן את השיבוצים אוטומטית.</p>
                  <button onClick={confirmBatch} disabled={batchConfirming || batchLoading}
                    className="btn-intake bg-primary text-primary-foreground text-sm flex items-center gap-1.5 disabled:opacity-50">
                    {batchConfirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    אשר את כל השיבוצים
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlacementEngine;