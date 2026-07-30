import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  getSessionsDB,
  getClassGroups,
  getTeacherProfiles,
  updateSessionDB,
  saveClassGroups,
  DEFAULT_CLASS_GROUPS,
  ClassGroupsMap,
  TeacherProfilesMap,
} from "@/lib/supabase-storage";
import { IntakeSession } from "@/lib/types";
import { buildStudentProfile, computeClassDiversity, computeClassLoad } from "@/lib/class-aggregations";
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
  Users,
  LayoutGrid,
  GripVertical,
  HelpCircle,
  Trash2,
  Save,
  RotateCcw,
  Plus,
  Pencil,
  Check,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Undo2,
  Copy,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Printer,
  Filter,
  BarChart3,
  Shuffle,
} from "lucide-react";

const UNASSIGNED = "__unassigned__";

function resolveGender(s?: IntakeSession | null): Gender {
  if (!s) return "unknown";
  if (s.gender === "female") return "female";
  if (s.gender === "male") return "male";
  return getStudentGender(s.studentName);
}

const GenderDot = ({ gender }: { gender: Gender }) => {
  if (gender === "female")
    return <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-pink-100 text-pink-600 text-[11px] font-bold leading-none" title="נקבה">♀</span>;
  if (gender === "male")
    return <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 text-sky-600 text-[11px] font-bold leading-none" title="זכר">♂</span>;
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-muted-foreground" title="לא ידוע">
      <HelpCircle className="w-3 h-3" />
    </span>
  );
};

interface PendingMove {
  studentId: string;
  studentName: string;
  toKey: string;
  destLabel: string;
  warnings: string[];
}

const ClassBoard = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<IntakeSession[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroupsMap>(DEFAULT_CLASS_GROUPS);
  const [order, setOrder] = useState<string[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfilesMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // local placement state: studentId -> classKey ("" = unassigned)
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [baseline, setBaseline] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Record<string, string>[]>([]);

  const [search, setSearch] = useState("");
  const [showStats, setShowStats] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [confirmDeleteClass, setConfirmDeleteClass] = useState<string | null>(null);
  const [filterGrade, setFilterGrade] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterFlagged, setFilterFlagged] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [newClassOpen, setNewClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");

  useEffect(() => {
    Promise.all([getSessionsDB(), getClassGroups(), getTeacherProfiles()]).then(([s, g, t]) => {
      const active = s.filter((x) => x.status !== "archived");
      setSessions(active);
      setClassGroups(g);
      setOrder(Object.keys(g));
      setTeachers(t);
      const map: Record<string, string> = {};
      active.forEach((x) => { map[x.id] = x.classGroup || ""; });
      setAssign(map);
      setBaseline(map);
      setLoading(false);
    });
  }, []);

  const sessionsById = useMemo(() => {
    const m: Record<string, IntakeSession> = {};
    sessions.forEach((s) => { m[s.id] = s; });
    return m;
  }, [sessions]);

  const columns = useMemo(() => {
    const cols: Record<string, IntakeSession[]> = { [UNASSIGNED]: [] };
    order.forEach((k) => { cols[k] = []; });
    sessions.forEach((s) => {
      const k = assign[s.id] || UNASSIGNED;
      if (!cols[k]) cols[k] = [];
      cols[k].push(s);
    });
    Object.values(cols).forEach((list) =>
      list.sort((a, b) => (a.grade || "").localeCompare(b.grade || "", "he") || a.studentName.localeCompare(b.studentName, "he"))
    );
    return cols;
  }, [sessions, assign, order]);

  const statsFor = (key: string) => {
    const list = columns[key] || [];
    const profiles = list.map((s) => buildStudentProfile(s));
    const diversity = computeClassDiversity(profiles);
    const load = computeClassLoad(profiles, (teachers[key]?.metrics as any) || null);
    let male = 0, female = 0, unknown = 0;
    const grades: Record<string, number> = {};
    list.forEach((s) => {
      const g = resolveGender(s);
      if (g === "male") male++; else if (g === "female") female++; else unknown++;
      if (s.grade) grades[s.grade] = (grades[s.grade] || 0) + 1;
    });
    const cas = profiles.map((p) => p.conductMetrics?.average).filter((v): v is number => typeof v === "number" && v > 0);
    const avgConduct = cas.length ? Math.round((cas.reduce((a, b) => a + b, 0) / cas.length) * 10) / 10 : null;
    return { list, diversity, load, male, female, unknown, grades, avgConduct };
  };

  const allStats = useMemo(() => {
    const out: Record<string, ReturnType<typeof statsFor>> = {};
    [...order, UNASSIGNED].forEach((k) => { out[k] = statsFor(k); });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, order, teachers]);

  const dirtyIds = useMemo(
    () => Object.keys(assign).filter((id) => (assign[id] || "") !== (baseline[id] || "")),
    [assign, baseline]
  );
  const orderDirty = useMemo(
    () => JSON.stringify(order) !== JSON.stringify(Object.keys(classGroups)),
    [order, classGroups]
  );

  const buildWarnings = (student: IntakeSession, toKey: string): string[] => {
    if (toKey === UNASSIGNED) return [];
    const w: string[] = [];
    const st = allStats[toKey];
    const teacherGrades = teachers[toKey]?.grades || [];
    if (student.grade && teacherGrades.length > 0 && !teacherGrades.includes(student.grade)) {
      w.push(`שכבת התלמיד (${student.grade}) אינה בשכבות שמלמדת המחנכת (${teacherGrades.join(", ")}).`);
    }
    if (st) {
      const g = resolveGender(student);
      const total = st.list.length + 1;
      const males = st.male + (g === "male" ? 1 : 0);
      const females = st.female + (g === "female" ? 1 : 0);
      if (total >= 4 && (males / total >= 0.75 || females / total >= 0.75)) {
        w.push(`הכיתה תגיע לחוסר איזון מגדרי (${males} בנים / ${females} בנות).`);
      }
      if (st.load.status !== "ok") w.push("הכיתה כבר בעומס טיפולי גבוה ביחס ליכולת המחנכת.");
      if (st.diversity.impulsiveTriadAlert) w.push("בכיתה יש כבר ריכוז תלמידים עם קושי בוויסות אימפולסיביות.");
    }
    // peer chemistry
    const rel = (student as any).relationships as { avoid?: string[] } | undefined;
    const avoid = rel?.avoid || [];
    const conflict = (columns[toKey] || []).filter((s) => avoid.includes(s.id));
    const reverse = (columns[toKey] || []).filter((s) => (((s as any).relationships?.avoid) || []).includes(student.id));
    const names = Array.from(new Set([...conflict, ...reverse].map((s) => s.studentName)));
    if (names.length) w.push(`התנגשות כימיה חברתית עם: ${names.join(", ")}.`);
    const prof = buildStudentProfile(student);
    if (typeof prof.sensorySensitivity === "number" && prof.sensorySensitivity > 0 && prof.sensorySensitivity <= 2.5 && st?.diversity.sensitiveOverload) {
      w.push("תלמיד רגיש חושית מצטרף לכיתה עם ריכוז גבוה של רגישים.");
    }
    return w;
  };

  const requestMove = (studentId: string, toKey: string) => {
    const student = sessionsById[studentId];
    if (!student) return;
    const from = assign[studentId] || UNASSIGNED;
    if (from === toKey) return;
    const warnings = buildWarnings(student, toKey);
    const destLabel = toKey === UNASSIGNED ? "ללא שיוך" : classGroups[toKey] || toKey;
    if (warnings.length === 0) {
      applyMove(studentId, toKey);
      return;
    }
    setPendingMove({ studentId, studentName: student.studentName, toKey, destLabel, warnings });
  };

  const applyMove = (studentId: string, toKey: string) => {
    setHistory((h) => [...h.slice(-19), assign]);
    setAssign((prev) => ({ ...prev, [studentId]: toKey === UNASSIGNED ? "" : toKey }));
    setSelectedId(null);
  };

  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setAssign(prev);
      return h.slice(0, -1);
    });
  };

  const revertAll = () => {
    setHistory((h) => [...h, assign]);
    setAssign(baseline);
    setOrder(Object.keys(classGroups));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const id of dirtyIds) {
        try { await updateSessionDB(id, { classGroup: assign[id] || "" } as any); } catch (e) { console.error(e); }
      }
      if (orderDirty || true) {
        const ordered: ClassGroupsMap = {};
        order.forEach((k) => { if (classGroups[k]) ordered[k] = classGroups[k]; });
        await saveClassGroups(ordered);
        setClassGroups(ordered);
      }
      const fresh = (await getSessionsDB()).filter((s) => s.status !== "archived");
      setSessions(fresh);
      const map: Record<string, string> = {};
      fresh.forEach((s) => { map[s.id] = s.classGroup || ""; });
      setAssign(map);
      setBaseline(map);
      setHistory([]);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2200);
    } finally {
      setSaving(false);
    }
  };

  // ---- class management ----
  const commitRename = async (key: string) => {
    const clean = renameValue.trim();
    setRenaming(null);
    if (!clean || clean === classGroups[key]) return;
    const next = { ...classGroups, [key]: clean };
    setClassGroups(next);
    await saveClassGroups(next);
  };

  const addClass = async () => {
    const clean = newClassName.trim();
    setNewClassOpen(false);
    setNewClassName("");
    if (!clean) return;
    let key = `class_${Date.now().toString(36)}`;
    while (classGroups[key]) key = `${key}x`;
    const next = { ...classGroups, [key]: clean };
    setClassGroups(next);
    setOrder((o) => [...o, key]);
    await saveClassGroups(next);
  };

  const deleteClass = async (key: string) => {
    setConfirmDeleteClass(null);
    const affected = (columns[key] || []).map((s) => s.id);
    setHistory((h) => [...h, assign]);
    setAssign((prev) => {
      const next = { ...prev };
      affected.forEach((id) => { next[id] = ""; });
      return next;
    });
    const nextGroups = { ...classGroups };
    delete nextGroups[key];
    setClassGroups(nextGroups);
    setOrder((o) => o.filter((k) => k !== key));
    await saveClassGroups(nextGroups);
  };

  const moveColumn = (key: string, dir: -1 | 1) => {
    setOrder((o) => {
      const i = o.indexOf(key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= o.length) return o;
      const next = [...o];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const isFlagged = (s: IntakeSession) => {
    const p = buildStudentProfile(s);
    const avg = p.conductMetrics?.average;
    const sens = p.sensorySensitivity;
    return (typeof avg === "number" && avg > 0 && avg <= 2.5) ||
      (typeof sens === "number" && sens > 0 && sens <= 2.5);
  };

  const matchesSearch = (s: IntakeSession) => {
    const q = search.trim();
    if (q && !s.studentName.includes(q) && !(s.grade || "").includes(q)) return false;
    if (filterGrade && (s.grade || "") !== filterGrade) return false;
    if (filterGender && resolveGender(s) !== filterGender) return false;
    if (filterFlagged && !isFlagged(s)) return false;
    return true;
  };

  const allGrades = useMemo(
    () => Array.from(new Set(sessions.map((s) => s.grade).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "he")),
    [sessions]
  );
  const filtersActive = !!(search.trim() || filterGrade || filterGender || filterFlagged);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const columnKeys = [...order, UNASSIGNED];

  const copySummary = () => {
    const lines: string[] = ["סיכום שיבוצים:"];
    order.forEach((k) => {
      const st = allStats[k];
      lines.push(`\n${classGroups[k]} (${st.list.length}) — ${teachers[k]?.name || "ללא מחנכת"}`);
      st.list.forEach((s) => lines.push(`• ${s.studentName}${s.grade ? ` (${s.grade})` : ""}`));
    });
    const un = allStats[UNASSIGNED];
    if (un.list.length) {
      lines.push(`\nללא שיוך (${un.list.length})`);
      un.list.forEach((s) => lines.push(`• ${s.studentName}`));
    }
    navigator.clipboard?.writeText(lines.join("\n"));
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto flex items-center gap-3 flex-wrap">
          <button onClick={() => navigate("/admin/placement")} className="p-2 rounded-lg hover:bg-muted">
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-heading font-bold truncate flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-primary" /> לוח השיבוצים המאושרים
            </h1>
            <p className="text-xs text-muted-foreground">
              עריכה מלאה: העברת תלמידים, שינוי שמות כיתות, סידור מחדש של הכיתות והוספה/מחיקה
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש תלמיד…"
                className="text-xs border border-border rounded-lg py-1.5 pr-7 pl-2 bg-background w-36"
              />
            </div>
            <button onClick={() => setShowStats((v) => !v)} className="btn-intake bg-muted text-xs flex items-center gap-1">
              {showStats ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} נתוני כיתה
            </button>
            <button onClick={copySummary} className="btn-intake bg-muted text-xs flex items-center gap-1">
              <Copy className="w-3.5 h-3.5" /> העתק סיכום
            </button>
            <button onClick={addClass} className="btn-intake bg-muted text-xs flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> כיתה חדשה
            </button>
            <button onClick={undo} disabled={history.length === 0}
              className="btn-intake bg-muted text-xs flex items-center gap-1 disabled:opacity-40">
              <Undo2 className="w-3.5 h-3.5" /> בטל
            </button>
            <button onClick={revertAll} disabled={dirtyIds.length === 0 && !orderDirty}
              className="btn-intake bg-muted text-xs flex items-center gap-1 disabled:opacity-40">
              <RotateCcw className="w-3.5 h-3.5" /> אפס שינויים
            </button>
            <button onClick={saveAll} disabled={saving || (dirtyIds.length === 0 && !orderDirty)}
              className="btn-intake bg-primary text-primary-foreground text-xs flex items-center gap-1 disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              שמור{dirtyIds.length > 0 ? ` (${dirtyIds.length})` : ""}
            </button>
          </div>
        </div>
        {(dirtyIds.length > 0 || orderDirty || savedFlash) && (
          <div className="max-w-[1400px] mx-auto mt-2 text-[11px]">
            {savedFlash ? (
              <span className="text-success flex items-center gap-1"><Check className="w-3.5 h-3.5" /> נשמר בהצלחה</span>
            ) : (
              <span className="text-warning flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> יש שינויים שלא נשמרו
              </span>
            )}
          </div>
        )}
      </div>

      <div className="max-w-[1400px] mx-auto p-4">
        <p className="text-[11px] text-muted-foreground mb-3">
          גררו תלמיד לכיתה אחרת, או הקישו על כרטיס ואז על הכיתה היעד. סידור הכיתות משמאל לימין נשמר עם השמירה.
        </p>
        <div className="flex gap-3 overflow-x-auto pb-4 items-start">
          {columnKeys.map((key, idx) => {
            const isUn = key === UNASSIGNED;
            const st = allStats[key];
            const label = isUn ? "ללא שיוך" : classGroups[key] || key;
            return (
              <div
                key={key}
                onDragOver={(e) => { e.preventDefault(); setDropTarget(key); }}
                onDragLeave={() => setDropTarget((t) => (t === key ? null : t))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDropTarget(null);
                  if (draggingId) requestMove(draggingId, key);
                  setDraggingId(null);
                }}
                onClick={() => { if (selectedId) requestMove(selectedId, key); }}
                className={`min-w-[250px] w-[250px] rounded-xl border p-2.5 transition-colors ${
                  dropTarget === key ? "border-primary bg-primary/5" : "border-border bg-card"
                } ${isUn ? "bg-muted/40" : ""}`}
              >
                <div className="flex items-center gap-1 mb-1">
                  {!isUn && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); moveColumn(key, 1); }}
                        disabled={idx === order.length - 1}
                        className="p-1 rounded hover:bg-muted disabled:opacity-30" title="הזז שמאלה">
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); moveColumn(key, -1); }}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-muted disabled:opacity-30" title="הזז ימינה">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {renaming === key ? (
                    <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                      <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") commitRename(key); if (e.key === "Escape") setRenaming(null); }}
                        className="text-xs border border-border rounded px-1.5 py-1 w-full bg-background" />
                      <button onClick={() => commitRename(key)} className="p-1 rounded hover:bg-muted text-success"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setRenaming(null)} className="p-1 rounded hover:bg-muted"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-sm font-heading font-bold flex-1 truncate">{label}</h3>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                        <Users className="w-3 h-3" />{st.list.length}
                      </span>
                      {!isUn && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); setRenaming(key); setRenameValue(label); }}
                            className="p-1 rounded hover:bg-muted" title="שנה שם"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteClass(key); }}
                            className="p-1 rounded hover:bg-destructive/10 text-destructive" title="מחק כיתה"><Trash2 className="w-3.5 h-3.5" /></button>
                        </>
                      )}
                    </>
                  )}
                </div>

                {!isUn && teachers[key]?.name && (
                  <p className="text-[11px] text-muted-foreground mb-1.5">מחנכת: {teachers[key]?.name}</p>
                )}

                {showStats && !isUn && (
                  <div className="mb-2 space-y-1">
                    <div className="flex items-center gap-1 flex-wrap text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">♂ {st.male}</span>
                      <span className="px-1.5 py-0.5 rounded bg-pink-100 text-pink-700">♀ {st.female}</span>
                      {Object.entries(st.grades).map(([g, n]) => (
                        <span key={g} className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{g}: {n}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap text-[10px]">
                      {st.avgConduct != null && (
                        <span className="px-1.5 py-0.5 rounded bg-muted">התנהגות ממוצע {st.avgConduct}</span>
                      )}
                      <span className={`px-1.5 py-0.5 rounded ${
                        st.load.status === "ok" ? "bg-success/15 text-success" :
                        st.load.status === "high" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"
                      }`}>
                        עומס {st.load.status === "ok" ? "תקין" : st.load.status === "high" ? "גבוה" : "מלא"}
                      </span>
                      {st.diversity.anchorCount === 0 && st.list.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-warning/15 text-warning">ללא עוגן</span>
                      )}
                      {st.diversity.impulsiveTriadAlert && (
                        <span className="px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">ריכוז אימפולסיביות</span>
                      )}
                      {st.diversity.sensitiveOverload && (
                        <span className="px-1.5 py-0.5 rounded bg-warning/15 text-warning">עומס חושי</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 min-h-[60px]">
                  {st.list.map((s) => {
                    const dim = !matchesSearch(s);
                    const changed = (assign[s.id] || "") !== (baseline[s.id] || "");
                    return (
                      <div
                        key={s.id}
                        draggable
                        onDragStart={() => setDraggingId(s.id)}
                        onDragEnd={() => setDraggingId(null)}
                        onClick={(e) => { e.stopPropagation(); setSelectedId((p) => (p === s.id ? null : s.id)); }}
                        className={`rounded-lg border px-2 py-1.5 bg-background cursor-grab active:cursor-grabbing transition-all ${
                          selectedId === s.id ? "border-primary ring-1 ring-primary" : "border-border"
                        } ${draggingId === s.id ? "opacity-40" : ""} ${dim ? "opacity-30" : ""} ${changed ? "bg-warning/5 border-warning/40" : ""}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <GenderDot gender={resolveGender(s)} />
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/admin/student/${s.id}`); }}
                            className="text-xs font-semibold truncate flex-1 text-right hover:text-primary"
                            title="פתח פרופיל"
                          >
                            {s.studentName}
                          </button>
                          {s.grade && <span className="text-[10px] text-muted-foreground shrink-0">{s.grade}</span>}
                        </div>
                      </div>
                    );
                  })}
                  {st.list.length === 0 && (
                    <p className="text-[11px] text-muted-foreground text-center py-4">אין תלמידים</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Move confirmation */}
      <AlertDialog open={!!pendingMove} onOpenChange={(o) => { if (!o) setPendingMove(null); }}>
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" /> שימו לב לפני ההעברה
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-right">
                <p>
                  העברת <strong>{pendingMove?.studentName}</strong> אל <strong>{pendingMove?.destLabel}</strong>:
                </p>
                <ul className="list-disc pr-5 space-y-1 text-xs">
                  {pendingMove?.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={() => { if (pendingMove) applyMove(pendingMove.studentId, pendingMove.toKey); setPendingMove(null); }}>
              העבר בכל זאת
            </AlertDialogAction>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete class confirmation */}
      <AlertDialog open={!!confirmDeleteClass} onOpenChange={(o) => { if (!o) setConfirmDeleteClass(null); }}>
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת כיתה</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDeleteClass && `הכיתה "${classGroups[confirmDeleteClass]}" תימחק, ו-${(columns[confirmDeleteClass] || []).length} תלמידים יעברו ל"ללא שיוך". יש ללחוץ "שמור" כדי לעדכן את התלמידים.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={() => confirmDeleteClass && deleteClass(confirmDeleteClass)}>מחק</AlertDialogAction>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClassBoard;
