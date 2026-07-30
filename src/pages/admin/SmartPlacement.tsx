import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  getSessionsDB,
  getClassGroups,
  getTeacherProfiles,
  updateSessionDB,
  deleteSessionDB,
  saveClassGroups,
  DEFAULT_CLASS_GROUPS,
  ClassGroupsMap,
  TeacherProfilesMap,
} from "@/lib/supabase-storage";
import { IntakeSession, PlacementFactor } from "@/lib/types";
import { aggregateClass, buildStudentProfile, computeClassDiversity, computeClassLoad } from "@/lib/class-aggregations";
import { getStudentGender, Gender } from "@/lib/gender-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowRight,
  Loader2,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  User,
  Users,
  Wand2,
  MessageCircle,
  Send,
  LayoutGrid,
  Table as TableIcon,
  GripVertical,
  HelpCircle,
  Trash2,
  Move,
  X,
  Save,
  RotateCcw,
  Plus,
  Pencil,
  Check,
} from "lucide-react";

interface BatchAssignment {
  studentId: string;
  studentName: string;
  classKey: string;
  confidence?: "high" | "medium" | "low";
  rationale?: string;
  factors?: PlacementFactor[];
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

const UNASSIGNED_KEY = "__unassigned__";
const DRAFT_KEY = "smart_placement_draft_v1";

interface DraftPayload {
  batchResult: BatchResult;
  overrides: Record<string, string>;
  batchChat: ChatMsg[];
  savedAt: string;
}

function resolveGender(s?: IntakeSession | null): Gender {
  if (!s) return "unknown";
  if (s.gender === "female") return "female";
  if (s.gender === "male") return "male";
  return getStudentGender(s.studentName);
}

const GenderBadge = ({ gender }: { gender: Gender }) => {
  if (gender === "female") {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-pink-100 text-pink-600 text-[11px] font-bold leading-none" title="נקבה">
        ♀
      </span>
    );
  }
  if (gender === "male") {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 text-sky-600 text-[11px] font-bold leading-none" title="זכר">
        ♂
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-muted-foreground" title="לא ידוע">
      <HelpCircle className="w-3 h-3" />
    </span>
  );
};

const confidenceStyle = (c?: string) =>
  c === "high" ? "bg-success/15 text-success" :
  c === "medium" ? "bg-warning/15 text-warning" :
  c === "low" ? "bg-muted text-muted-foreground" : "";

const confidenceLabel = (c?: string) =>
  c === "high" ? "גבוה" : c === "medium" ? "בינוני" : c === "low" ? "נמוך" : "";

const SmartPlacement = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<IntakeSession[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroupsMap>(DEFAULT_CLASS_GROUPS);
  const [teachers, setTeachers] = useState<TeacherProfilesMap>({});
  const [loading, setLoading] = useState(true);

  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [batchError, setBatchError] = useState("");
  const [batchChat, setBatchChat] = useState<ChatMsg[]>([]);
  const [batchInput, setBatchInput] = useState("");
  const [batchConfirming, setBatchConfirming] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [view, setView] = useState<"board" | "table">("board");
  const [secondOpinionLoading, setSecondOpinionLoading] = useState(false);
  const [secondOpinion, setSecondOpinion] = useState<BatchResult | null>(null);
  const [secondOpinionError, setSecondOpinionError] = useState("");

  // Details modal for viewing an assignment's rationale
  const [detailsFor, setDetailsFor] = useState<BatchAssignment | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [draftJustSaved, setDraftJustSaved] = useState(false);

  // Drag state (HTML5 dnd + touch tap-to-move fallback)
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  // Move confirmation dialog
  const [pendingMove, setPendingMove] = useState<{
    studentId: string;
    toClass: string;
    studentName: string;
    destLabel: string;
    warnings: string[];
  } | null>(null);

  useEffect(() => {
    Promise.all([getSessionsDB(), getClassGroups(), getTeacherProfiles()]).then(([s, g, t]) => {
      setSessions(s);
      setClassGroups(g);
      setTeachers(t);
      setLoading(false);
      // Auto-load draft if present
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const draft = JSON.parse(raw) as DraftPayload;
          if (draft?.batchResult?.assignments) {
            setBatchResult(draft.batchResult);
            setOverrides(draft.overrides || {});
            setBatchChat(draft.batchChat || []);
            setDraftSavedAt(draft.savedAt || null);
          }
        }
      } catch (e) { console.error("draft load failed", e); }
    });
  }, []);

  const sessionsById = useMemo(() => {
    const map: Record<string, IntakeSession> = {};
    sessions.forEach((s) => { map[s.id] = s; });
    return map;
  }, [sessions]);

  const classAggregates = useMemo(() => {
    return Object.entries(classGroups).map(([key, label]) => {
      const cs = sessions.filter((s) => s.classGroup === key && s.status !== "archived");
      return { key, label, aggregate: aggregateClass(key, label, cs) };
    });
  }, [sessions, classGroups]);

  const buildClassesPayload = () => classAggregates.map((c) => ({
    key: c.key,
    label: c.label,
    teacher: teachers[c.key]?.name || undefined,
    teacherBio: teachers[c.key]?.bio || undefined,
    teacherNotes: teachers[c.key]?.notes || undefined,
    teacherGrades: teachers[c.key]?.grades || [],
    teacherMetrics: teachers[c.key]?.metrics || undefined,
    currentStudentCount: c.aggregate.studentCount,
    genderBreakdown: c.aggregate.genderBreakdown,
    gradeDistribution: c.aggregate.gradeDistribution,
    avgScores: c.aggregate.avgScores,
    studentsAtRiskCount: c.aggregate.studentsAtRisk.length,
    students: c.aggregate.studentProfiles.map((p) => ({
      id: p.id, name: p.name, grade: p.grade, gender: p.gender,
      scores: p.scores,
      topStrengths: p.topStrengths.slice(0, 3),
      topChallenges: p.topChallenges.slice(0, 3),
      relationships: p.relationships,
      sensorySensitivity: p.sensorySensitivity,
    })),
  }));

  const unassignedCount = sessions.filter((s) => s.status !== "archived" && !s.classGroup).length;

  // Class-level flags (anchors, sensory overload, impulsive triad, load)
  const classFlagsByKey = useMemo(() => {
    const out: Record<string, ReturnType<typeof computeClassDiversity> & { load: ReturnType<typeof computeClassLoad> }> = {};
    Object.keys(classGroups).forEach((key) => {
      const pendingIds = (batchResult?.assignments || [])
        .filter((a) => (overrides[a.studentId] ?? a.classKey) === key)
        .map((a) => a.studentId);
      const existingIds = sessions.filter((s) => s.classGroup === key && s.status !== "archived").map((s) => s.id);
      const allIds = Array.from(new Set([...existingIds, ...pendingIds]));
      const profiles = allIds.map((id) => sessionsById[id]).filter(Boolean).map((s) => buildStudentProfile(s!));
      const diversity = computeClassDiversity(profiles);
      const load = computeClassLoad(profiles, (teachers[key]?.metrics as any) || null);
      out[key] = { ...diversity, load };
    });
    return out;
  }, [classGroups, batchResult, overrides, sessions, sessionsById, teachers]);

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
      setOverrides({});
      const cleanRationale = (() => {
        const r = (res.overallRationale || "").trim();
        if (!r) return "";
        if (r.startsWith("{") || r.startsWith("[") || r.startsWith("```") || /"assignments"\s*:/.test(r)) return "";
        return r;
      })();
      const assistantMsg = [
        cleanRationale ? `**רציונל כולל:** ${cleanRationale}` : "",
        res.openQuestions && res.openQuestions.length > 0
          ? "\n\n**חסר לי מידע כדי לשבץ בביטחון:**\n" + res.openQuestions.map((q) => `• ${q.studentName ? q.studentName + " — " : ""}${q.question}`).join("\n")
          : "\n\nיש לי מספיק מידע להצעת השיבוץ. תוכל/י לגרור תלמיד לכיתה אחרת, או לאשר.",
      ].filter(Boolean).join("");
      setBatchChat((prev) => [...prev, { role: "assistant", content: assistantMsg }]);
    } catch (e: any) {
      setBatchError(e?.message || "שגיאה בהפקת השיבוץ");
    } finally {
      setBatchLoading(false);
    }
  };

  const sendBatchMessage = async () => {
    const text = batchInput.trim();
    if (!text) return;
    const nextChat: ChatMsg[] = [...batchChat, { role: "user", content: text }];
    setBatchChat(nextChat);
    setBatchInput("");
    await runBatch(nextChat);
  };

  const runSecondOpinion = async () => {
    setSecondOpinionLoading(true);
    setSecondOpinionError("");
    setSecondOpinion(null);
    try {
      const unassigned = sessions.filter((s) => s.status !== "archived" && !s.classGroup);
      if (unassigned.length === 0) throw new Error("אין תלמידים לשיבוץ נוסף");
      const studentsPayload = unassigned.map((s) => buildStudentProfile(s));
      const { data, error } = await supabase.functions.invoke("placement-batch", {
        body: { students: studentsPayload, classes: buildClassesPayload(), chatMessages: [], model: "openai/gpt-5-mini" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSecondOpinion(data as BatchResult);
    } catch (e: any) {
      setSecondOpinionError(e?.message || "שגיאה בהפקת דעה שנייה");
    } finally {
      setSecondOpinionLoading(false);
    }
  };

  const confirmBatch = async () => {
    if (!batchResult?.assignments) return;
    setBatchConfirming(true);
    try {
      for (const a of batchResult.assignments) {
        const classKey = overrides[a.studentId] || a.classKey;
        if (!classKey || classKey === UNASSIGNED_KEY) continue;
        try { await updateSessionDB(a.studentId, { classGroup: classKey } as any); } catch (e) { console.error(e); }
      }
      const fresh = await getSessionsDB();
      setSessions(fresh);
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      navigate("/admin/placement");
    } finally {
      setBatchConfirming(false);
    }
  };

  const saveDraft = () => {
    if (!batchResult) return;
    const savedAt = new Date().toISOString();
    const payload: DraftPayload = { batchResult, overrides, batchChat, savedAt };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      setDraftSavedAt(savedAt);
      setDraftJustSaved(true);
      setTimeout(() => setDraftJustSaved(false), 2000);
    } catch (e) {
      console.error(e);
      alert("שגיאה בשמירת הטיוטה");
    }
  };

  const clearDraftAndRestart = () => {
    if (!confirm("למחוק את הטיוטה השמורה ולהתחיל שיבוץ מחדש?")) return;
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setBatchResult(null);
    setOverrides({});
    setBatchChat([]);
    setDraftSavedAt(null);
  };

  const updateStudentGender = async (studentId: string, gender: "male" | "female") => {
    try {
      await updateSessionDB(studentId, { gender } as any);
      setSessions((prev) => prev.map((s) => s.id === studentId ? { ...s, gender } : s));
    } catch (e) {
      console.error(e);
      alert("שגיאה בעדכון המגדר");
    }
  };

  const updateStudentGrade = async (studentId: string, grade: string) => {
    try {
      await updateSessionDB(studentId, { grade } as any);
      setSessions((prev) => prev.map((s) => s.id === studentId ? { ...s, grade } : s));
    } catch (e) {
      console.error(e);
      alert("שגיאה בעדכון שכבת הגיל");
    }
  };

  const currentClassFor = (a: BatchAssignment) => overrides[a.studentId] ?? a.classKey;

  const computeMoveWarnings = (studentId: string, toClass: string): string[] => {
    const warnings: string[] = [];
    const session = sessionsById[studentId];
    if (!session) return warnings;
    const profile = buildStudentProfile(session);
    const fromClass = (batchResult?.assignments || []).find((a) => a.studentId === studentId);
    const fromKey = fromClass ? (overrides[studentId] ?? fromClass.classKey) : UNASSIGNED_KEY;
    if (fromKey === toClass) return warnings;

    // Grade mismatch
    if (toClass !== UNASSIGNED_KEY) {
      const teacher = teachers[toClass];
      const grades = teacher?.grades || [];
      if (grades.length > 0 && profile.grade && !grades.includes(profile.grade)) {
        warnings.push(`שכבת התלמיד/ה (${profile.grade}) אינה נכללת בשכבות של ${teacher?.name || "המחנכת"} (${grades.join(", ")}).`);
      }
    }

    // Gender balance after move
    if (toClass !== UNASSIGNED_KEY) {
      const destItems = (columns[toClass] || []).filter((a) => a.studentId !== studentId);
      let m = 0, f = 0;
      destItems.forEach((a) => {
        const g = resolveGender(sessionsById[a.studentId]);
        if (g === "male") m++; else if (g === "female") f++;
      });
      const studentG = resolveGender(session);
      if (studentG === "male") m++; else if (studentG === "female") f++;
      const total = m + f;
      if (total >= 4) {
        const ratio = m / total;
        if (ratio >= 0.75) warnings.push(`לאחר ההעברה יהיו ${m} בנים ו-${f} בנות בכיתה (${Math.round(ratio*100)}% בנים) — חוסר איזון מגדרי.`);
        else if (ratio <= 0.25) warnings.push(`לאחר ההעברה יהיו ${m} בנים ו-${f} בנות בכיתה (${Math.round((1-ratio)*100)}% בנות) — חוסר איזון מגדרי.`);
      }

      // Behavioral: student needs high authority/structure but teacher weak there
      const cm = profile.conductMetrics;
      const tm = teachers[toClass]?.metrics as any;
      if (cm && tm) {
        const authWeak = (cm.authority <= 2.5) || (cm.rules <= 2.5);
        if (authWeak && ((tm.authority ?? 5) < 3.5 || (tm.structure ?? 5) < 3.5)) {
          warnings.push(`התלמיד/ה מתקשה בקבלת סמכות/כללים (סמכות ${cm.authority}, כללים ${cm.rules}) — המחנכת חלשה יחסית בסמכות/מסגור.`);
        }
        const sensitive = (cm.temperament <= 2.5) || (cm.frustration <= 2.5) || (cm.impulsivity <= 2.5);
        if (sensitive && ((tm.warmth ?? 5) < 3.5 || (tm.patience ?? 5) < 3.5)) {
          warnings.push(`טמפרמנט רגיש/פגיע (טמפ' ${cm.temperament}, תסכול ${cm.frustration}) — המחנכת חלשה יחסית בחום/סבלנות.`);
        }
        if (cm.average <= 2.8) {
          // How many at-risk behavioral students already in dest?
          const destItemsRaw = (columns[toClass] || []).filter((a) => a.studentId !== studentId);
          let atRisk = 0;
          destItemsRaw.forEach((a) => {
            const s = sessionsById[a.studentId];
            if (!s) return;
            const p = buildStudentProfile(s);
            if (p.conductMetrics && p.conductMetrics.average <= 2.8) atRisk++;
          });
          if (atRisk >= 2) {
            warnings.push(`בכיתה כבר ${atRisk} תלמידים עם פרופיל התנהגותי מאתגר (ממוצע ≤2.8) — הוספה תיצור עומס.`);
          }
        }
      }
    }

    // Domain scores comparison to class average
    if (toClass !== UNASSIGNED_KEY) {
      const agg = classAggregates.find((c) => c.key === toClass)?.aggregate;
      if (agg && profile.riskFlags.length >= 2) {
        const existingAtRisk = agg.studentsAtRisk.length;
        if (existingAtRisk >= 3) {
          warnings.push(`התלמיד/ה עם ${profile.riskFlags.length} דגלי סיכון בשאלונים, והכיתה כבר כוללת ${existingAtRisk} תלמידים בסיכון.`);
        }
      }
    }

    // Relationship: avoid conflict (hard-flag)
    if (toClass !== UNASSIGNED_KEY) {
      const rel = profile.relationships;
      const destIds = Array.from(new Set([
        ...((columns[toClass] || []).map((a) => a.studentId)),
        ...sessions.filter((s) => s.classGroup === toClass).map((s) => s.id),
      ])).filter((id) => id !== studentId);
      const conflicts: string[] = [];
      if (rel?.avoid?.length) {
        for (const id of rel.avoid) {
          if (destIds.includes(id)) conflicts.push(sessionsById[id]?.studentName || id);
        }
      }
      for (const id of destIds) {
        const other = sessionsById[id];
        const otherRel = (other as any)?.relationships as { avoid?: string[] } | undefined;
        if (otherRel?.avoid?.includes(studentId)) {
          const nm = other?.studentName || id;
          if (!conflicts.includes(nm)) conflicts.push(nm);
        }
      }
      if (conflicts.length > 0) {
        warnings.push(`אילוץ 'להימנע יחד' — לא מומלץ לשבץ עם: ${conflicts.join(", ")}.`);
      }
    }

    // Sensory/load class flags
    if (toClass !== UNASSIGNED_KEY) {
      const cf = classFlagsByKey[toClass];
      if (cf?.sensitiveOverload && typeof profile.sensorySensitivity === "number" && profile.sensorySensitivity > 0 && profile.sensorySensitivity <= 2.5) {
        warnings.push(`בכיתה כבר ריכוז גבוה של תלמידים עם רגישות חושית — הוספת עוד עלולה להעמיס.`);
      }
      if (cf?.load?.status === "overload") {
        warnings.push(`הכיתה מסומנת כעמוסה (יחס עומס ${cf.load.ratio}) — עדיף לפזר.`);
      }
    }

    return warnings;
  };

  const moveStudent = (studentId: string, toClass: string) => {
    const warnings = computeMoveWarnings(studentId, toClass);
    if (warnings.length > 0) {
      const name = sessionsById[studentId]?.studentName || "התלמיד/ה";
      const destLabel = toClass === UNASSIGNED_KEY ? "ללא שיוך" : (classGroups[toClass] || toClass);
      setPendingMove({ studentId, toClass, studentName: name, destLabel, warnings });
      setDropTarget(null);
      return;
    }
    setOverrides((prev) => ({ ...prev, [studentId]: toClass }));
    setSelectedId(null);
    setDropTarget(null);
  };

  const confirmPendingMove = () => {
    if (!pendingMove) return;
    const { studentId, toClass } = pendingMove;
    setOverrides((prev) => ({ ...prev, [studentId]: toClass }));
    setPendingMove(null);
    setSelectedId(null);
    setDropTarget(null);
  };

  const cancelPendingMove = () => {
    setPendingMove(null);
    setSelectedId(null);
    setDropTarget(null);
  };

  const deleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`למחוק לצמיתות את ${studentName}? פעולה זו אינה הפיכה.`)) return;
    try {
      await deleteSessionDB(studentId);
      setSessions((prev) => prev.filter((s) => s.id !== studentId));
      setBatchResult((prev) =>
        prev ? { ...prev, assignments: prev.assignments.filter((a) => a.studentId !== studentId) } : prev
      );
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
      if (selectedId === studentId) setSelectedId(null);
    } catch (e) {
      console.error(e);
      alert("שגיאה במחיקת התלמיד");
    }
  };

  // ----- Class management (rename / add / delete) -----
  const renameClass = async (key: string, label: string) => {
    const clean = label.trim();
    if (!clean) return;
    const next = { ...classGroups, [key]: clean };
    setClassGroups(next);
    await saveClassGroups(next);
  };

  const addClass = async (label: string) => {
    const clean = label.trim();
    if (!clean) return;
    let key = `class_${Date.now().toString(36)}`;
    while (classGroups[key]) key = `${key}x`;
    const next = { ...classGroups, [key]: clean };
    setClassGroups(next);
    await saveClassGroups(next);
  };

  const removeClass = async (key: string) => {
    const label = classGroups[key] || key;
    const count = (columns[key] || []).length;
    if (!confirm(`למחוק את "${label}"?${count ? ` ${count} תלמידים יעברו ל"ללא שיוך".` : ""}`)) return;
    // Move its students back to unassigned
    setOverrides((prev) => {
      const next = { ...prev };
      (columns[key] || []).forEach((a) => { next[a.studentId] = UNASSIGNED_KEY; });
      return next;
    });
    const next = { ...classGroups };
    delete next[key];
    setClassGroups(next);
    await saveClassGroups(next);
  };

  // Group assignments by column
  const columns = useMemo(() => {
    const cols: Record<string, BatchAssignment[]> = { [UNASSIGNED_KEY]: [] };
    Object.keys(classGroups).forEach((k) => { cols[k] = []; });
    // Build label→key map so we can rescue AI outputs that returned a label instead of a key
    const labelToKey: Record<string, string> = {};
    Object.entries(classGroups).forEach(([k, label]) => { labelToKey[String(label).trim()] = k; });
    (batchResult?.assignments || []).forEach((a) => {
      let key = currentClassFor(a);
      if (!cols[key]) {
        const rescued = labelToKey[String(key || "").trim()];
        if (rescued && cols[rescued]) key = rescued;
      }
      if (cols[key]) cols[key].push(a);
      else cols[UNASSIGNED_KEY].push(a);
    });
    return cols;
  }, [batchResult, overrides, classGroups]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/admin/placement")} className="p-2 rounded-lg hover:bg-muted"><ArrowRight className="w-5 h-5" /></button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-heading font-bold truncate flex items-center gap-2"><Wand2 className="w-5 h-5 text-primary" /> שיבוץ חכם</h1>
            <p className="text-xs text-muted-foreground">גרור תלמידים בין כיתות · תצוגת לוח או טבלה · סימון מגדר</p>
          </div>
          {batchResult && (
            <div className="flex items-center bg-muted/40 rounded-lg p-0.5">
              <button onClick={() => setView("board")}
                className={`px-2.5 py-1.5 rounded-md text-xs flex items-center gap-1 transition-colors ${view === "board" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
                <LayoutGrid className="w-3.5 h-3.5" /> לוח
              </button>
              <button onClick={() => setView("table")}
                className={`px-2.5 py-1.5 rounded-md text-xs flex items-center gap-1 transition-colors ${view === "table" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
                <TableIcon className="w-3.5 h-3.5" /> טבלה
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-4 pb-40">
        {batchResult && draftSavedAt && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-[11.5px] text-foreground/80 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5 text-primary" />
              נטענה טיוטה שמורה מ-{new Date(draftSavedAt).toLocaleString("he-IL")}
            </span>
            <button onClick={clearDraftAndRestart} className="inline-flex items-center gap-1 text-primary hover:underline">
              <RotateCcw className="w-3 h-3" /> התחל מחדש
            </button>
          </div>
        )}

        {!batchResult && !batchLoading && !batchError && (
          <div className="intake-card text-center py-16">
            <Wand2 className="w-12 h-12 mx-auto text-primary/40 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">
              יש <span className="font-bold text-foreground">{unassignedCount}</span> תלמידים ללא שיוך.
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              המנוע יציע חלוקה מאוזנת, ותוכל/י להזיז תלמידים בגרירה או דרך הטבלה.
            </p>
            <button onClick={() => runBatch([])}
              disabled={unassignedCount === 0}
              className="btn-intake bg-primary text-primary-foreground text-sm inline-flex items-center gap-1.5 disabled:opacity-50">
              <Sparkles className="w-4 h-4" /> התחל שיבוץ
            </button>
          </div>
        )}

        {batchLoading && (
          <div className="intake-card text-center py-16">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">מנתח פרופילים ומחלק בין הכיתות...</p>
          </div>
        )}

        {batchError && (
          <div className="intake-card bg-destructive/5 border-destructive/20 text-sm text-destructive">{batchError}</div>
        )}

        {batchResult && !batchLoading && (
          <>
            {/* Class summaries */}
            {batchResult.classSummaries && batchResult.classSummaries.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {batchResult.classSummaries.map((c) => (
                  <div key={c.classKey} className="rounded-xl border border-border p-2.5 bg-muted/10">
                    <p className="text-sm font-bold text-primary">{classGroups[c.classKey] || c.classKey}</p>
                    {c.note && <p className="text-[11.5px] text-foreground/80 mt-1">{c.note}</p>}
                  </div>
                ))}
              </div>
            )}

            {view === "board" ? (
              <BoardView
                columns={columns}
                classGroups={classGroups}
                teachers={teachers}
                sessionsById={sessionsById}
                onMove={moveStudent}
                onDelete={deleteStudent}
                onOpenDetails={(a) => setDetailsFor(a)}
                draggingId={draggingId}
                setDraggingId={setDraggingId}
                dropTarget={dropTarget}
                setDropTarget={setDropTarget}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
                classFlagsByKey={classFlagsByKey}
                onRenameClass={renameClass}
                onAddClass={addClass}
                onDeleteClass={removeClass}
              />
            ) : (
              <TableView
                assignments={batchResult.assignments}
                classGroups={classGroups}
                sessionsById={sessionsById}
                overrides={overrides}
                setOverrides={setOverrides}
                onDelete={deleteStudent}
                onOpenDetails={(a) => setDetailsFor(a)}
              />
            )}

            {batchResult.flags && batchResult.flags.length > 0 && (
              <div className="rounded-xl bg-warning/5 border border-warning/20 p-3">
                <p className="text-xs font-bold text-warning flex items-center gap-1.5 mb-1"><AlertTriangle className="w-3.5 h-3.5" /> דגלי אזהרה</p>
                <ul className="list-disc pr-5 space-y-0.5 text-[11.5px] text-foreground/85">
                  {batchResult.flags.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}

            {/* Second opinion */}
            <div className="rounded-xl border border-border bg-muted/10 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> דעה שנייה — הצלבה של שני מודלים
                </p>
                <button onClick={runSecondOpinion} disabled={secondOpinionLoading}
                  className="btn-intake bg-secondary text-secondary-foreground text-[11px] flex items-center gap-1 disabled:opacity-50">
                  {secondOpinionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {secondOpinion ? "הפק שוב" : "הפק דעה שנייה"}
                </button>
              </div>
              {secondOpinionError && (
                <p className="text-[11px] text-destructive">{secondOpinionError}</p>
              )}
              {secondOpinion && (
                <div className="rounded-lg border border-border bg-card p-2">
                  {(() => {
                    const agree: string[] = [];
                    const disagree: Array<{ id: string; name: string; a: string; b: string }> = [];
                    for (const so of secondOpinion.assignments || []) {
                      const base = (batchResult.assignments || []).find((x) => x.studentId === so.studentId);
                      if (!base) continue;
                      const baseKey = overrides[so.studentId] ?? base.classKey;
                      if (baseKey === so.classKey) agree.push(so.studentName);
                      else disagree.push({
                        id: so.studentId,
                        name: so.studentName,
                        a: classGroups[baseKey] || baseKey,
                        b: classGroups[so.classKey] || so.classKey,
                      });
                    }
                    const total = (secondOpinion.assignments || []).length;
                    const pct = total > 0 ? Math.round((agree.length / total) * 100) : 0;
                    return (
                      <div className="space-y-1.5">
                        <p className="text-[11.5px] text-foreground/80">
                          התאמה בין המודלים: <span className="font-bold text-primary">{pct}%</span> ({agree.length}/{total}).
                        </p>
                        {disagree.length > 0 && (
                          <div>
                            <p className="text-[11px] font-bold text-warning mb-0.5">שיבוצים שדורשים תשומת לב:</p>
                            <ul className="text-[11px] text-foreground/85 space-y-0.5 list-disc pr-5">
                              {disagree.slice(0, 8).map((d) => (
                                <li key={d.id}>{d.name}: מודל ראשי → {d.a} · דעה שנייה → {d.b}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

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
          </>
        )}
      </div>

      {batchResult && !batchLoading && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-20">
          <div className="max-w-7xl mx-auto p-3 space-y-2">
            <div className="flex items-end gap-2">
              <textarea
                value={batchInput}
                onChange={(e) => setBatchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendBatchMessage(); }}
                rows={2}
                dir="rtl"
                placeholder="ענה/י על שאלות המנוע או הוסף/י מידע — לדוגמה: 'נעם מתקשה בוויסות כשיש רעש'..."
                className="flex-1 bg-background border border-input rounded-xl p-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button onClick={sendBatchMessage} disabled={!batchInput.trim() || batchLoading}
                className="btn-intake bg-secondary text-secondary-foreground text-xs flex items-center gap-1 disabled:opacity-50">
                <Send className="w-3.5 h-3.5" /> שלח
              </button>
              <button onClick={saveDraft} disabled={batchLoading}
                title="שמור טיוטה — נשמרת במכשיר זה ותיטען אוטומטית בכניסה הבאה"
                className={`btn-intake text-sm flex items-center gap-1.5 disabled:opacity-50 ${draftJustSaved ? "bg-success text-success-foreground" : "bg-muted text-foreground"}`}>
                {draftJustSaved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {draftJustSaved ? "נשמר" : "שמור טיוטה"}
              </button>
              <button onClick={confirmBatch} disabled={batchConfirming || batchLoading}
                className="btn-intake bg-primary text-primary-foreground text-sm flex items-center gap-1.5 disabled:opacity-50">
                {batchConfirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                אשר את כל השיבוצים
              </button>
            </div>
          </div>
        </div>
      )}

      {detailsFor && (
        <DetailsModal
          assignment={detailsFor}
          session={sessionsById[detailsFor.studentId]}
          currentClassKey={overrides[detailsFor.studentId] ?? detailsFor.classKey}
          classGroups={classGroups}
          teachers={teachers}
          onSetGender={updateStudentGender}
          onSetClass={(studentId, classKey) => moveStudent(studentId, classKey)}
          onSetGrade={updateStudentGrade}
          onClose={() => setDetailsFor(null)}
        />
      )}

      <AlertDialog open={!!pendingMove} onOpenChange={(o) => { if (!o) cancelPendingMove(); }}>
        <AlertDialogContent dir="rtl" className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-right">
              <div className="w-9 h-9 rounded-full bg-warning/15 text-warning flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span>אישור העברת תלמיד/ה</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right pt-1">
              {pendingMove && (
                <>
                  העברת <span className="font-semibold text-foreground">{pendingMove.studentName}</span>
                  {" → "}
                  <span className="font-semibold text-foreground">{pendingMove.destLabel}</span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {pendingMove && pendingMove.warnings.length > 0 && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-2">
              <p className="text-xs font-bold text-warning flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                שים/י לב
              </p>
              <ul className="space-y-1.5 text-sm text-foreground/85 leading-relaxed">
                {pendingMove.warnings.map((w, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-warning mt-0.5">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={cancelPendingMove}>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPendingMove}>אישור והעברה</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ----- Board view -----
const BoardView = ({
  columns, classGroups, teachers, sessionsById,
  onMove, onDelete, onOpenDetails, draggingId, setDraggingId, dropTarget, setDropTarget,
  selectedId, setSelectedId, classFlagsByKey,
}: {
  columns: Record<string, BatchAssignment[]>;
  classGroups: ClassGroupsMap;
  teachers: TeacherProfilesMap;
  sessionsById: Record<string, IntakeSession>;
  onMove: (studentId: string, toClass: string) => void;
  onDelete: (studentId: string, studentName: string) => void;
  onOpenDetails: (a: BatchAssignment) => void;
  draggingId: string | null;
  setDraggingId: (v: string | null) => void;
  dropTarget: string | null;
  setDropTarget: React.Dispatch<React.SetStateAction<string | null>>;
  selectedId: string | null;
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
  classFlagsByKey: Record<string, any>;
}) => {
  const classKeys = Object.keys(classGroups);
  const orderedCols: Array<{ key: string; label: string }> = [
    ...classKeys.map((k) => ({ key: k, label: classGroups[k] })),
    { key: UNASSIGNED_KEY, label: "ללא שיוך" },
  ];

  return (
    <>
      <p className="text-[11px] text-muted-foreground text-center">
        גרור/י כרטיס תלמיד לכיתה אחרת · במגע: הקש/י על כרטיס ואז על שם הכיתה
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {orderedCols.map(({ key, label }) => {
          const items = columns[key] || [];
          const isDropTarget = dropTarget === key;
          const isPending = !!selectedId;
          const genderCount = items.reduce((acc, a) => {
            const g = resolveGender(sessionsById[a.studentId]);
            if (g === "male") acc.m++; else if (g === "female") acc.f++; else acc.u++;
            return acc;
          }, { m: 0, f: 0, u: 0 });
          return (
            <div
              key={key}
              onDragOver={(e) => { e.preventDefault(); setDropTarget(key); }}
              onDragLeave={() => setDropTarget((prev) => prev === key ? null : prev)}
              onDrop={(e) => {
                e.preventDefault();
                if (draggingId) onMove(draggingId, key);
                setDraggingId(null);
                setDropTarget(null);
              }}
              onClick={() => {
                if (selectedId) onMove(selectedId, key);
              }}
              className={`rounded-2xl border p-3 min-h-[220px] transition-all ${
                isDropTarget ? "border-primary bg-primary/10 scale-[1.01]"
                : isPending ? "border-primary/40 bg-primary/5 cursor-pointer"
                : key === UNASSIGNED_KEY ? "border-dashed border-muted-foreground/30 bg-muted/20"
                : "border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="min-w-0">
                  <p className="font-heading font-bold text-sm truncate">{label}</p>
                  {key !== UNASSIGNED_KEY && teachers[key]?.name && (
                    <p className="text-[10px] text-muted-foreground truncate">מחנכת: {teachers[key]!.name}</p>
                  )}
                  {key !== UNASSIGNED_KEY && (teachers[key]?.grades?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {teachers[key]!.grades!.map((g) => (
                        <span key={g} className="text-[9px] px-1 py-0.5 rounded bg-success/10 text-success font-bold">שכבה {g}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0 flex items-center gap-1">
                  <Users className="w-3 h-3" />{items.length}
                </span>
              </div>
              {(genderCount.m + genderCount.f + genderCount.u) > 0 && (
                <div className="flex items-center gap-1.5 mb-2 text-[10px]">
                    {genderCount.m > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 font-bold">♂ {genderCount.m}</span>
                  )}
                  {genderCount.f > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-pink-100 text-pink-700 font-bold">♀ {genderCount.f}</span>
                  )}
                  {genderCount.u > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted text-muted-foreground"><HelpCircle className="w-2.5 h-2.5" />{genderCount.u}</span>
                  )}
                </div>
              )}
              {key !== UNASSIGNED_KEY && classFlagsByKey?.[key] && (
                <div className="flex flex-wrap gap-1 mb-2 text-[9.5px]">
                  {classFlagsByKey[key].anchorCount > 0 ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-success/10 text-success font-bold" title={`עוגנים: ${(classFlagsByKey[key].anchorNames || []).join(", ")}`}>
                      עוגנים {classFlagsByKey[key].anchorCount}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-warning/10 text-warning font-bold" title="אין תלמיד עוגן — שקול להעביר עוגן לכיתה זו">
                      חסר עוגן
                    </span>
                  )}
                  {classFlagsByKey[key].sensitiveOverload && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-bold" title="ריכוז גבוה של רגישות חושית">
                      עומס חושי
                    </span>
                  )}
                  {classFlagsByKey[key].impulsiveTriadAlert && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-warning/10 text-warning font-bold" title={`אימפולסיביות מוגברת: ${(classFlagsByKey[key].impulsiveNames || []).join(", ")}`}>
                      אימפולס×{(classFlagsByKey[key].impulsiveNames || []).length}
                    </span>
                  )}
                  {classFlagsByKey[key].load && (
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-bold ${
                        classFlagsByKey[key].load.status === "overload" ? "bg-destructive/10 text-destructive" :
                        classFlagsByKey[key].load.status === "high" ? "bg-warning/10 text-warning" :
                        "bg-muted text-muted-foreground"
                      }`}
                      title={`עומס ${classFlagsByKey[key].load.load} · יכולת ${classFlagsByKey[key].load.capacity} · יחס ${classFlagsByKey[key].load.ratio}`}
                    >
                      עומס {classFlagsByKey[key].load.status === "overload" ? "מלא" : classFlagsByKey[key].load.status === "high" ? "גבוה" : "תקין"}
                    </span>
                  )}
                </div>
              )}
              <div className="space-y-1.5">
                {items.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center py-6">ריק</p>
                ) : (
                  items.map((a) => {
                    const s = sessionsById[a.studentId];
                    const gender = resolveGender(s);
                    const isSelected = selectedId === a.studentId;
                    const isDragging = draggingId === a.studentId;
                    return (
                      <div
                        key={a.studentId}
                        draggable
                        onDragStart={(e) => {
                          setDraggingId(a.studentId);
                          e.dataTransfer.effectAllowed = "move";
                          try { e.dataTransfer.setData("text/plain", a.studentId); } catch {}
                        }}
                        onDragEnd={() => { setDraggingId(null); setDropTarget(null); }}
                        onClick={(e) => {
                          e.stopPropagation();
                          // If a move is in progress on this card, ignore card click
                          if (isSelected) { setSelectedId(null); return; }
                          onOpenDetails(a);
                        }}
                        className={`group rounded-xl border px-2.5 py-2 bg-card cursor-grab active:cursor-grabbing transition-all touch-manipulation select-none ${
                          isSelected ? "border-primary ring-2 ring-primary/30 shadow-sm" :
                          isDragging ? "opacity-40 border-primary" :
                          "border-border hover:border-primary/40 hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                          <GenderBadge gender={gender} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{a.studentName}</p>
                            {s?.grade && <p className="text-[10px] text-muted-foreground">כיתה {s.grade}</p>}
                          </div>
                          {a.confidence && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${confidenceStyle(a.confidence)}`}>
                              {confidenceLabel(a.confidence)}
                            </span>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete(a.studentId, a.studentName); }}
                            title="מחק תלמיד"
                            className="flex-shrink-0 p-1 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedId(isSelected ? null : a.studentId); }}
                            title={isSelected ? "בטל בחירה" : "העבר לכיתה אחרת"}
                            className={`flex-shrink-0 p-1 rounded-md transition-colors ${isSelected ? "text-primary bg-primary/10" : "text-muted-foreground/60 hover:text-primary hover:bg-primary/10"}`}
                          >
                            <Move className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {a.rationale && (
                          <p className="text-[10.5px] text-foreground/70 leading-snug mt-1 line-clamp-2">{a.rationale}</p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

// ----- Table view -----
const TableView = ({
  assignments, classGroups, sessionsById, overrides, setOverrides, onDelete, onOpenDetails,
}: {
  assignments: BatchAssignment[];
  classGroups: ClassGroupsMap;
  sessionsById: Record<string, IntakeSession>;
  overrides: Record<string, string>;
  setOverrides: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  onDelete: (studentId: string, studentName: string) => void;
  onOpenDetails: (a: BatchAssignment) => void;
}) => {
  return (
    <div className="intake-card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 text-xs text-muted-foreground">
              <th className="text-right px-3 py-2 font-bold">מגדר</th>
              <th className="text-right px-3 py-2 font-bold">שם התלמיד/ה</th>
              <th className="text-right px-3 py-2 font-bold">שכבה</th>
              <th className="text-right px-3 py-2 font-bold">כיתה משובצת</th>
              <th className="text-right px-3 py-2 font-bold">ביטחון</th>
              <th className="text-right px-3 py-2 font-bold">רציונל</th>
              <th className="text-right px-3 py-2 font-bold">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {assignments.map((a, i) => {
              const s = sessionsById[a.studentId];
              const gender = resolveGender(s);
              const current = overrides[a.studentId] ?? a.classKey;
              return (
                <tr
                  key={a.studentId}
                  className={`${i % 2 === 0 ? "bg-card" : "bg-muted/10"} cursor-pointer hover:bg-primary/5`}
                  onClick={() => onOpenDetails(a)}
                >
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}><GenderBadge gender={gender} /></td>
                  <td className="px-3 py-2 font-medium">{a.studentName}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{s?.grade || "—"}</td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={current}
                      onChange={(e) => setOverrides((prev) => ({ ...prev, [a.studentId]: e.target.value }))}
                      className="bg-card border border-input rounded-lg px-2 py-1 text-xs"
                    >
                      {Object.entries(classGroups).map(([k, l]) => (
                        <option key={k} value={k}>{l}</option>
                      ))}
                      <option value={UNASSIGNED_KEY}>ללא שיוך</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    {a.confidence && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${confidenceStyle(a.confidence)}`}>
                        {confidenceLabel(a.confidence)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[11.5px] text-foreground/75 leading-snug max-w-md">{a.rationale}</td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onDelete(a.studentId, a.studentName)}
                      title="מחק תלמיד"
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SmartPlacement;

// ----- Details modal -----
const DetailsModal = ({
  assignment, session, currentClassKey, classGroups, teachers, onSetGender, onSetClass, onSetGrade, onClose,
}: {
  assignment: BatchAssignment;
  session?: IntakeSession;
  currentClassKey: string;
  classGroups: ClassGroupsMap;
  teachers: TeacherProfilesMap;
  onSetGender: (studentId: string, gender: "male" | "female") => void | Promise<void>;
  onSetClass: (studentId: string, classKey: string) => void;
  onSetGrade: (studentId: string, grade: string) => void | Promise<void>;
  onClose: () => void;
}) => {
  const gender = resolveGender(session);
  const classLabel = currentClassKey === UNASSIGNED_KEY ? "ללא שיוך" : (classGroups[currentClassKey] || currentClassKey);
  const teacher = currentClassKey !== UNASSIGNED_KEY ? teachers[currentClassKey] : undefined;
  const GRADES = ["ז", "ח", "ט", "י", "יא", "יב"];
  const currentGrade = session?.grade || "";
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-start justify-between p-4 border-b border-border sticky top-0 bg-card">
          <div className="min-w-0 flex items-center gap-2">
            <GenderBadge gender={gender} />
            <div className="min-w-0">
              <h2 className="font-heading font-bold text-base truncate">{assignment.studentName}</h2>
              <p className="text-[11px] text-muted-foreground">
                {session?.grade ? `שכבה ${session.grade} · ` : ""}שובץ ל<span className="font-bold text-foreground">{classLabel}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted flex-shrink-0" title="סגור">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs font-bold text-muted-foreground mb-2">מגדר {gender === "unknown" && <span className="text-destructive font-normal">— חסר, יש לבחור</span>}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSetGender(assignment.studentId, "male")}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${gender === "male" ? "bg-sky-100 border-sky-300 text-sky-700" : "bg-card border-border hover:border-sky-300"}`}
              >♂ זכר</button>
              <button
                onClick={() => onSetGender(assignment.studentId, "female")}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${gender === "female" ? "bg-pink-100 border-pink-300 text-pink-700" : "bg-card border-border hover:border-pink-300"}`}
              >♀ נקבה</button>
            </div>
          </div>

          <div className="rounded-xl border border-border p-3">
            <p className="text-xs font-bold text-muted-foreground mb-2">שכבת גיל {!currentGrade && <span className="text-destructive font-normal">— חסר, יש לבחור</span>}</p>
            <div className="flex flex-wrap gap-1.5">
              {GRADES.map((g) => {
                const active = currentGrade === g;
                return (
                  <button
                    key={g}
                    onClick={() => onSetGrade(assignment.studentId, g)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${active ? "bg-success/10 border-success text-success" : "bg-card border-border hover:border-success/40"}`}
                  >
                    שכבה {g}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-border p-3">
            <p className="text-xs font-bold text-muted-foreground mb-2">שיוך כיתה</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(classGroups).map(([k, label]) => {
                const active = currentClassKey === k;
                const teacherName = teachers[k]?.name;
                return (
                  <button
                    key={k}
                    onClick={() => onSetClass(assignment.studentId, k)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${active ? "bg-primary/10 border-primary text-primary" : "bg-card border-border hover:border-primary/40"}`}
                    title={teacherName ? `מחנכת: ${teacherName}` : undefined}
                  >
                    {label}
                  </button>
                );
              })}
              <button
                onClick={() => onSetClass(assignment.studentId, UNASSIGNED_KEY)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${currentClassKey === UNASSIGNED_KEY ? "bg-muted border-muted-foreground/40 text-foreground" : "bg-card border-dashed border-muted-foreground/40 hover:border-muted-foreground/70 text-muted-foreground"}`}
              >
                ללא שיוך
              </button>
            </div>
            <p className="text-[10.5px] text-muted-foreground mt-2">השינוי נשמר בטיוטה. אישור סופי מתבצע דרך "אשר את כל השיבוצים".</p>
          </div>

          {assignment.confidence && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">רמת ביטחון:</span>
              <span className={`font-bold px-2 py-0.5 rounded-full ${confidenceStyle(assignment.confidence)}`}>
                {confidenceLabel(assignment.confidence)}
              </span>
            </div>
          )}

          <div>
            <p className="text-xs font-bold text-muted-foreground mb-1">רציונל השיבוץ</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
              {assignment.rationale?.trim() || "לא סופק רציונל מפורט לשיבוץ זה."}
            </p>
          </div>

          {assignment.factors && assignment.factors.length > 0 && (
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2">גורמי החלטה — פירוט משקלי השיבוץ</p>
              <div className="space-y-2">
                {assignment.factors.map((f, i) => (
                  <div key={i} className="rounded-lg border border-border bg-muted/10 p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">{f.name}</span>
                      <span className="text-[11px] font-bold text-primary">{Math.round(f.weight)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, f.weight))}%` }} />
                    </div>
                    {f.note && <p className="text-[11px] text-foreground/70 mt-1 leading-snug">{f.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {teacher?.name && (
            <div className="rounded-xl bg-muted/30 border border-border p-3">
              <p className="text-xs font-bold text-primary mb-1">מחנכת הכיתה</p>
              <p className="text-sm font-medium">{teacher.name}</p>
            </div>
          )}

          {session?.narrativeSummary && (
            <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
              <p className="text-xs font-bold text-primary mb-1">סיכום מילולי על התלמיד/ה</p>
              <p className="text-[12.5px] text-foreground/85 leading-relaxed whitespace-pre-wrap">{session.narrativeSummary}</p>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border sticky bottom-0 bg-card">
          <button onClick={onClose} className="btn-intake bg-primary text-primary-foreground text-sm w-full">
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};