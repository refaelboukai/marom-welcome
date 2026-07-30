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
  PieChart,
  HeartHandshake,
  Target,
  Sliders,
  Wand2,
  ListChecks,
  Activity,
  Redo2,
  Lock,
  Rows3,
  Keyboard,
  Layers,
  EyeOff as HideIcon,
} from "lucide-react";
import BoardAnalytics from "@/components/placement/BoardAnalytics";
import ChartStudio from "@/components/placement/ChartStudio";
import BestFitPanel from "@/components/placement/BestFitPanel";
import { autoBalance, classHealth, toOptStudent, OptClass, BalanceResult } from "@/lib/placement-optimizer";
import PairSuggestions, { RelationType } from "@/components/placement/PairSuggestions";
import ClassFocus from "@/components/placement/ClassFocus";
import StudentEditor from "@/components/placement/StudentEditor";
import ScenarioPanel from "@/components/placement/ScenarioPanel";

const UNASSIGNED = "__unassigned__";
const DEFAULT_CAPACITY = 9;

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
  const [future, setFuture] = useState<Record<string, string>[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [compact, setCompact] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const [search, setSearch] = useState("");
  const [showStats, setShowStats] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showPairs, setShowPairs] = useState(false);
  const [showFocus, setShowFocus] = useState(false);
  const [showStudio, setShowStudio] = useState(false);
  const [showBestFit, setShowBestFit] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);
  const [hideFiltered, setHideFiltered] = useState(false);
  const [showChanges, setShowChanges] = useState(false);
  const [capacities, setCapacities] = useState<Record<string, number>>({});
  const [balance, setBalance] = useState<BalanceResult | null>(null);
  const [balancing, setBalancing] = useState(false);

  const pushHistory = (snapshot: Record<string, string>) => {
    setHistory((h) => [...h.slice(-29), snapshot]);
    setFuture([]);
  };

  const togglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem("board_pinned", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const setRelation = async (aId: string, bId: string, type: RelationType) => {
    const apply = (s: IntakeSession, otherId: string): IntakeSession => {
      const rel = s.relationships || { avoid: [], prefer: [], notes: "" };
      const prefer = (rel.prefer || []).filter((x) => x !== otherId);
      const avoid = (rel.avoid || []).filter((x) => x !== otherId);
      if (type === "prefer") prefer.push(otherId);
      if (type === "avoid") avoid.push(otherId);
      return { ...s, relationships: { prefer, avoid, notes: rel.notes || "" } };
    };
    const updated: Record<string, IntakeSession> = {};
    for (const [id, otherId] of [[aId, bId], [bId, aId]] as const) {
      const s = sessions.find((x) => x.id === id);
      if (!s) continue;
      const next = apply(s, otherId);
      updated[id] = next;
      await updateSessionDB(id, { relationships: next.relationships } as any);
    }
    setSessions((prev) => prev.map((s) => updated[s.id] || s));
  };
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

  const optClasses = useMemo<OptClass[]>(
    () => order.map((k) => ({
      key: k,
      label: classGroups[k] || k,
      teacherGrades: teachers[k]?.grades || [],
      capacity: capacities[k] ?? DEFAULT_CAPACITY,
    })),
    [order, classGroups, teachers, capacities]
  );

  const health = useMemo(() => {
    const assigned = order.reduce((a, k) => a + (columns[k]?.length || 0), 0);
    const avgSize = order.length ? assigned / order.length : 0;
    const conducts = order
      .flatMap((k) => (columns[k] || []).map((s) => buildStudentProfile(s).conductMetrics?.average))
      .filter((v): v is number => typeof v === "number" && v > 0);
    const globalConduct = conducts.length ? conducts.reduce((a, b) => a + b, 0) / conducts.length : null;
    const out: Record<string, ReturnType<typeof classHealth>> = {};
    optClasses.forEach((c) => {
      out[c.key] = classHealth(c, (columns[c.key] || []).map(toOptStudent), avgSize, globalConduct);
    });
    return out;
  }, [optClasses, columns, order]);

  const boardScore = useMemo(() => {
    const vals = Object.values(health).map((h) => h.score);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }, [health]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("board_capacities");
      if (raw) setCapacities(JSON.parse(raw));
    } catch { /* ignore */ }
    try {
      const p = localStorage.getItem("board_pinned");
      if (p) setPinnedIds(JSON.parse(p));
    } catch { /* ignore */ }
  }, []);

  const setCapacity = (key: string, value: number) => {
    setCapacities((prev) => {
      const next = { ...prev };
      if (!value || value <= 0) delete next[key]; else next[key] = value;
      try { localStorage.setItem("board_capacities", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const runAutoBalance = (includeUnassigned: boolean) => {
    setBalancing(true);
    setTimeout(() => {
      const students = sessions.map(toOptStudent);
      const current: Record<string, string> = {};
      sessions.forEach((s) => { current[s.id] = assign[s.id] || ""; });
      const res = autoBalance(optClasses, students, current, { includeUnassigned, lockedIds: pinnedIds });
      setBalance(res);
      setBalancing(false);
    }, 30);
  };

  const applyBalance = () => {
    if (!balance) return;
    pushHistory(assign);
    setAssign((prev) => ({ ...prev, ...balance.assign }));
    setBalance(null);
  };

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
      const cap = capacities[toKey] ?? DEFAULT_CAPACITY;
      if (st.list.length + 1 > cap) {
        w.push(`הכיתה תחרוג מהתקן (${st.list.length + 1} מתוך ${cap} תלמידים).`);
      }
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
    pushHistory(assign);
    setAssign((prev) => ({ ...prev, [studentId]: toKey === UNASSIGNED ? "" : toKey }));
    setSelectedIds((prev) => prev.filter((x) => x !== studentId));
  };

  /** Move every selected student (or a single dragged one) into a class. */
  const requestMoveMany = (ids: string[], toKey: string) => {
    const targets = ids.filter((id) => (assign[id] || UNASSIGNED) !== toKey);
    if (targets.length === 0) return;
    if (targets.length === 1) { requestMove(targets[0], toKey); return; }
    const warnings = Array.from(
      new Set(targets.flatMap((id) => {
        const s = sessionsById[id];
        return s ? buildWarnings(s, toKey).map((w) => `${s.studentName}: ${w}`) : [];
      }))
    );
    const destLabel = toKey === UNASSIGNED ? "ללא שיוך" : classGroups[toKey] || toKey;
    if (warnings.length === 0) {
      pushHistory(assign);
      setAssign((prev) => {
        const next = { ...prev };
        targets.forEach((id) => { next[id] = toKey === UNASSIGNED ? "" : toKey; });
        return next;
      });
      setSelectedIds([]);
      return;
    }
    setPendingMove({ studentId: targets.join(","), studentName: `${targets.length} תלמידים`, toKey, destLabel, warnings });
  };

  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [...f, assign]);
      setAssign(prev);
      return h.slice(0, -1);
    });
  };

  const redo = () => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[f.length - 1];
      setHistory((h) => [...h, assign]);
      setAssign(next);
      return f.slice(0, -1);
    });
  };

  const revertAll = () => {
    pushHistory(assign);
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
      setFuture([]);
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

  // Keyboard shortcuts: Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z redo, Ctrl/Cmd+S save, "/" search, Esc clear.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); saveAll(); return; }
      if (e.key === "Escape") {
        setSelectedIds([]);
        if (typing) (el as HTMLInputElement).blur();
        return;
      }
      if (e.key === "/" && !typing) {
        e.preventDefault();
        document.getElementById("board-search")?.focus();
      }
      if (e.key === "?" && !typing) setShowShortcuts(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /** "What if" — health delta per class for the single selected student. */
  const whatIf = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    const s = sessionsById[selectedIds[0]];
    if (!s) return null;
    const assigned = order.reduce((a, k) => a + (columns[k]?.length || 0), 0);
    const avgSize = order.length ? assigned / order.length : 0;
    const conducts = order
      .flatMap((k) => (columns[k] || []).map((x) => buildStudentProfile(x).conductMetrics?.average))
      .filter((v): v is number => typeof v === "number" && v > 0);
    const globalConduct = conducts.length ? conducts.reduce((a, b) => a + b, 0) / conducts.length : null;
    const opt = toOptStudent(s);
    const out: Record<string, number> = {};
    optClasses.forEach((c) => {
      if ((assign[s.id] || "") === c.key) return;
      const list = (columns[c.key] || []).map(toOptStudent);
      out[c.key] = classHealth(c, [...list, opt], avgSize, globalConduct).score - classHealth(c, list, avgSize, globalConduct).score;
    });
    return { name: s.studentName, deltas: out };
  }, [selectedIds, sessionsById, columns, order, optClasses, assign]);

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

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows: any[][] = [["כיתה", "מחנכת", "שם התלמיד", "שכבה", "מגדר", "ממוצע התנהגות", "רגישות חושית"]];
    [...order, UNASSIGNED].forEach((k) => {
      const st = allStats[k];
      const label = k === UNASSIGNED ? "ללא שיוך" : classGroups[k] || k;
      st.list.forEach((s) => {
        const p = buildStudentProfile(s);
        const g = resolveGender(s);
        rows.push([
          label,
          k === UNASSIGNED ? "" : teachers[k]?.name || "",
          s.studentName,
          s.grade || "",
          g === "male" ? "זכר" : g === "female" ? "נקבה" : "לא ידוע",
          p.conductMetrics?.average ?? "",
          typeof p.sensorySensitivity === "number" ? p.sensorySensitivity : "",
        ]);
      });
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 18 }, { wch: 14 }, { wch: 20 }, { wch: 8 }, { wch: 10 }, { wch: 16 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, "שיבוצים");

    const sum: any[][] = [["כיתה", "מחנכת", "תלמידים", "בנים", "בנות", "ממוצע התנהגות", "עוגנים", "עומס"]];
    order.forEach((k) => {
      const st = allStats[k];
      sum.push([
        classGroups[k] || k,
        teachers[k]?.name || "",
        st.list.length,
        st.male,
        st.female,
        st.avgConduct ?? "",
        st.diversity.anchorCount,
        st.load.status === "ok" ? "תקין" : st.load.status === "high" ? "גבוה" : "מלא",
      ]);
    });
    const ws2 = XLSX.utils.aoa_to_sheet(sum);
    ws2["!cols"] = [{ wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 16 }, { wch: 10 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws2, "סיכום כיתות");
    XLSX.writeFile(wb, `שיבוצים-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const printBoard = () => window.print();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="bg-card/95 backdrop-blur border-b border-border px-5 py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1700px] mx-auto space-y-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/admin/placement")}
              className="p-2.5 rounded-xl border border-border hover:bg-muted transition-colors shrink-0">
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-heading font-bold leading-tight">לוח השיבוצים המאושרים</h1>
              <p className="text-sm text-muted-foreground">
                {order.length} כיתות · {sessions.length} תלמידים · {allStats[UNASSIGNED].list.length} ללא שיוך
              </p>
            </div>
            <div className="hidden lg:flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-xl bg-muted/60" title="ציון איזון כולל של הלוח">
              <Activity className={`w-4 h-4 ${boardScore >= 75 ? "text-success" : boardScore >= 55 ? "text-warning" : "text-destructive"}`} />
              <div>
                <p className="text-[10px] text-muted-foreground leading-none">ציון איזון הלוח</p>
                <p className="text-lg font-bold leading-tight">{boardScore}</p>
              </div>
            </div>
            <div className="hidden md:block">
              {savedFlash ? (
                <span className="text-sm text-success flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10">
                  <Check className="w-4 h-4" /> נשמר בהצלחה
                </span>
              ) : (dirtyIds.length > 0 || orderDirty) ? (
                <span className="text-sm text-warning flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/10">
                  <AlertTriangle className="w-4 h-4" /> {dirtyIds.length} שינויים שלא נשמרו
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="board-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש תלמיד…  (/)"
                className="text-sm border border-border rounded-xl py-2 pr-9 pl-3 bg-background w-52 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60">
              <button onClick={() => setShowStats((v) => !v)}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${showStats ? "bg-card shadow-sm" : "hover:bg-card/60"}`}>
                {showStats ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />} נתוני כיתה
              </button>
              <button onClick={() => setCompact((v) => !v)} title="צפיפות תצוגה"
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${compact ? "bg-card shadow-sm text-primary" : "hover:bg-card/60"}`}>
                <Rows3 className="w-4 h-4" /> {compact ? "מרווח" : "מצומצם"}
              </button>
              <button onClick={() => setShowFilters((v) => !v)}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${showFilters || filtersActive ? "bg-card shadow-sm text-primary" : "hover:bg-card/60"}`}>
                <Filter className="w-4 h-4" /> סינון
              </button>
              <button onClick={() => setShowBalance((v) => !v)}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${showBalance ? "bg-card shadow-sm text-primary" : "hover:bg-card/60"}`}>
                <BarChart3 className="w-4 h-4" /> מאזן כיתות
              </button>
              <button onClick={() => setShowAnalytics((v) => !v)}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${showAnalytics ? "bg-card shadow-sm text-primary" : "hover:bg-card/60"}`}>
                <PieChart className="w-4 h-4" /> ניתוח וגרפים
              </button>
              <button onClick={() => setShowPairs((v) => !v)}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${showPairs ? "bg-card shadow-sm text-primary" : "hover:bg-card/60"}`}>
                <HeartHandshake className="w-4 h-4" /> התאמות
              </button>
              <button onClick={() => setShowFocus((v) => !v)}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${showFocus ? "bg-card shadow-sm text-primary" : "hover:bg-card/60"}`}>
                <Target className="w-4 h-4" /> מוקדי התמקדות
              </button>
              <button onClick={() => setShowStudio((v) => !v)}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${showStudio ? "bg-card shadow-sm text-primary" : "hover:bg-card/60"}`}>
                <Sliders className="w-4 h-4" /> בונה ניתוחים
              </button>
              <button onClick={() => setShowBestFit((v) => !v)}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${showBestFit ? "bg-card shadow-sm text-primary" : "hover:bg-card/60"}`}>
                <Wand2 className="w-4 h-4" /> שיבוץ מיטבי
              </button>
              <button onClick={() => setShowScenarios((v) => !v)}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${showScenarios ? "bg-card shadow-sm text-primary" : "hover:bg-card/60"}`}>
                <Layers className="w-4 h-4" /> תרחישים
              </button>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60">
              <button onClick={copySummary} title="העתק סיכום" className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 hover:bg-card/80">
                <Copy className="w-4 h-4" /> העתק
              </button>
              <button onClick={exportExcel} title="ייצוא לאקסל" className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 hover:bg-card/80">
                <FileSpreadsheet className="w-4 h-4" /> אקסל
              </button>
              <button onClick={printBoard} title="הדפסה" className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 hover:bg-card/80">
                <Printer className="w-4 h-4" /> הדפסה
              </button>
            </div>

            <div className="flex-1" />

            <button onClick={() => runAutoBalance(false)} disabled={balancing || order.length < 2}
              className="px-3.5 py-2 rounded-xl text-sm border border-primary/40 text-primary hover:bg-primary/10 flex items-center gap-1.5 disabled:opacity-40">
              {balancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} איזון אוטומטי
            </button>
            <button onClick={() => setShowChanges((v) => !v)} disabled={dirtyIds.length === 0}
              className={`px-3.5 py-2 rounded-xl text-sm border flex items-center gap-1.5 disabled:opacity-40 ${showChanges ? "border-primary text-primary bg-primary/5" : "border-border hover:bg-muted"}`}>
              <ListChecks className="w-4 h-4" /> שינויים{dirtyIds.length ? ` (${dirtyIds.length})` : ""}
            </button>
            <button onClick={() => { setNewClassName(""); setNewClassOpen(true); }}
              className="px-3.5 py-2 rounded-xl text-sm border border-border hover:bg-muted flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> כיתה חדשה
            </button>
            <button onClick={undo} disabled={history.length === 0} title="בטל פעולה אחרונה"
              className="px-3.5 py-2 rounded-xl text-sm border border-border hover:bg-muted flex items-center gap-1.5 disabled:opacity-40">
              <Undo2 className="w-4 h-4" /> בטל
            </button>
            <button onClick={redo} disabled={future.length === 0} title="בצע מחדש (Ctrl+Shift+Z)"
              className="px-3.5 py-2 rounded-xl text-sm border border-border hover:bg-muted flex items-center gap-1.5 disabled:opacity-40">
              <Redo2 className="w-4 h-4" /> בצע מחדש
            </button>
            <button onClick={() => setShowShortcuts(true)} title="קיצורי מקלדת"
              className="px-3 py-2 rounded-xl text-sm border border-border hover:bg-muted flex items-center">
              <Keyboard className="w-4 h-4" />
            </button>
            <button onClick={revertAll} disabled={dirtyIds.length === 0 && !orderDirty}
              className="px-3.5 py-2 rounded-xl text-sm border border-border hover:bg-muted flex items-center gap-1.5 disabled:opacity-40">
              <RotateCcw className="w-4 h-4" /> אפס
            </button>
            <button onClick={saveAll} disabled={saving || (dirtyIds.length === 0 && !orderDirty)}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow-sm hover:opacity-90 flex items-center gap-1.5 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              שמור{dirtyIds.length > 0 ? ` (${dirtyIds.length})` : ""}
            </button>
          </div>
        </div>
        {showFilters && (
          <div className="max-w-[1700px] mx-auto mt-3 flex items-center gap-2 flex-wrap text-sm border-t border-border pt-3">
            <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}
              className="border border-border rounded-xl py-2 px-3 bg-background">
              <option value="">כל השכבות</option>
              {allGrades.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)}
              className="border border-border rounded-xl py-2 px-3 bg-background">
              <option value="">כל המגדרים</option>
              <option value="male">בנים</option>
              <option value="female">בנות</option>
              <option value="unknown">לא מוגדר</option>
            </select>
            <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl border border-border">
              <input type="checkbox" checked={filterFlagged} onChange={(e) => setFilterFlagged(e.target.checked)} />
              תלמידים עם סימון לתשומת לב
            </label>
            {filtersActive && (
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl border border-border">
                <input type="checkbox" checked={hideFiltered} onChange={(e) => setHideFiltered(e.target.checked)} />
                <HideIcon className="w-4 h-4" /> הסתר תלמידים שאינם בסינון
              </label>
            )}
            {filtersActive && (
              <button onClick={() => { setSearch(""); setFilterGrade(""); setFilterGender(""); setFilterFlagged(false); }}
                className="px-3 py-2 rounded-xl border border-border hover:bg-muted flex items-center gap-1.5">
                <X className="w-4 h-4" /> נקה סינון
              </button>
            )}
          </div>
        )}
      </div>

      <div className="max-w-[1700px] mx-auto p-6">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <p className="text-sm text-muted-foreground">
            גררו תלמיד לכיתה אחרת, או סמנו כמה תלמידים (לחיצה על כרטיס) ואז לחצו על הכיתה היעד. לחיצה כפולה על כרטיס פותחת עריכה והוספת מידע. סימון תלמיד יחיד מציג בכל כיתה את השפעת ההעברה על ציון האיזון.
          </p>
          {selectedIds.length > 0 && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary flex items-center gap-2">
              {selectedIds.length} תלמידים מסומנים
              <button onClick={() => setSelectedIds([])} className="hover:opacity-70"><X className="w-3.5 h-3.5" /></button>
            </span>
          )}
        </div>
        {showBalance && (
          <div className="mb-4 rounded-xl border border-border bg-card p-3 overflow-x-auto">
            <h2 className="text-sm font-heading font-bold mb-2 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-primary" /> מאזן בין הכיתות
            </h2>
            <table className="w-full text-xs text-right">
              <thead className="text-[11px] text-muted-foreground">
                <tr>
                  <th className="py-1 pl-2 font-medium">כיתה</th>
                  <th className="py-1 pl-2 font-medium">מחנכת</th>
                  <th className="py-1 pl-2 font-medium">תלמידים</th>
                  <th className="py-1 pl-2 font-medium">איזון מגדרי</th>
                  <th className="py-1 pl-2 font-medium">ממוצע התנהגות</th>
                  <th className="py-1 pl-2 font-medium">עוגנים</th>
                  <th className="py-1 pl-2 font-medium">עומס</th>
                </tr>
              </thead>
              <tbody>
                {order.map((k) => {
                  const st = allStats[k];
                  const total = Math.max(st.list.length, 1);
                  const avgSize = order.length
                    ? order.reduce((a, kk) => a + allStats[kk].list.length, 0) / order.length
                    : 0;
                  const off = st.list.length - avgSize;
                  return (
                    <tr key={k} className="border-t border-border">
                      <td className="py-1.5 pl-2 font-semibold">{classGroups[k] || k}</td>
                      <td className="py-1.5 pl-2 text-muted-foreground">{teachers[k]?.name || "—"}</td>
                      <td className="py-1.5 pl-2">
                        {st.list.length}
                        <span className={`mr-1 text-[10px] ${Math.abs(off) >= 2 ? "text-warning" : "text-muted-foreground"}`}>
                          ({off > 0 ? "+" : ""}{Math.round(off * 10) / 10})
                        </span>
                      </td>
                      <td className="py-1.5 pl-2">
                        <div className="flex h-2 w-24 rounded-full overflow-hidden bg-muted">
                          <div className="bg-sky-400" style={{ width: `${(st.male / total) * 100}%` }} />
                          <div className="bg-pink-400" style={{ width: `${(st.female / total) * 100}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{st.male}♂ / {st.female}♀</span>
                      </td>
                      <td className="py-1.5 pl-2">{st.avgConduct ?? "—"}</td>
                      <td className="py-1.5 pl-2">{st.diversity.anchorCount}</td>
                      <td className="py-1.5 pl-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          st.load.status === "ok" ? "bg-success/15 text-success" :
                          st.load.status === "high" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"
                        }`}>
                          {st.load.status === "ok" ? "תקין" : st.load.status === "high" ? "גבוה" : "מלא"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {showChanges && dirtyIds.length > 0 && (
          <div className="mb-5 rounded-2xl border border-warning/40 bg-warning/5 p-4">
            <h3 className="text-sm font-heading font-bold mb-2 flex items-center gap-1.5">
              <ListChecks className="w-4 h-4 text-warning" /> שינויים שטרם נשמרו ({dirtyIds.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {dirtyIds.map((id) => {
                const s = sessionsById[id];
                if (!s) return null;
                const from = baseline[id] ? classGroups[baseline[id]] || baseline[id] : "ללא שיוך";
                const to = assign[id] ? classGroups[assign[id]] || assign[id] : "ללא שיוך";
                return (
                  <div key={id} className="flex items-center gap-2 text-xs rounded-xl bg-card border border-border px-3 py-2">
                    <span className="font-semibold truncate">{s.studentName}</span>
                    <span className="text-muted-foreground truncate">{from} ← {to}</span>
                    <button onClick={() => applyMove(id, baseline[id] || UNASSIGNED)}
                      className="mr-auto p-1 rounded-lg hover:bg-muted text-muted-foreground" title="בטל שינוי זה">
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {showBestFit && (
          <BestFitPanel
            unassigned={columns[UNASSIGNED] || []}
            classes={optClasses}
            membersBySection={columns}
            onAssign={(sid, ck) => requestMove(sid, ck)}
          />
        )}
        {showScenarios && (
          <ScenarioPanel
            currentAssign={assign}
            currentScore={boardScore}
            classLabels={Object.fromEntries(order.map((k) => [k, classGroups[k] || k]))}
            namesById={Object.fromEntries(sessions.map((s) => [s.id, s.studentName]))}
            onLoad={(next) => {
              pushHistory(assign);
              setAssign((prev) => {
                const merged = { ...prev };
                sessions.forEach((s) => { merged[s.id] = next[s.id] ?? ""; });
                return merged;
              });
            }}
          />
        )}
        {showStudio && (
          <ChartStudio
            sections={order.map((k) => ({
              key: k,
              label: classGroups[k] || k,
              teacher: teachers[k]?.name,
              students: columns[k] || [],
            }))}
            unassigned={columns[UNASSIGNED] || []}
          />
        )}
        {showFocus && (
          <ClassFocus
            sections={order.map((k) => ({
              key: k,
              label: classGroups[k] || k,
              teacher: teachers[k]?.name,
              students: columns[k] || [],
            }))}
          />
        )}
        {showPairs && (
          <PairSuggestions
            sections={order.map((k) => ({ key: k, label: classGroups[k] || k, students: columns[k] || [] }))}
            unassigned={columns[UNASSIGNED] || []}
            onSetRelation={setRelation}
          />
        )}
        {showAnalytics && (
          <BoardAnalytics
            sections={order.map((k) => ({
              key: k,
              label: classGroups[k] || k,
              teacher: teachers[k]?.name,
              students: columns[k] || [],
            }))}
            unassigned={columns[UNASSIGNED] || []}
          />
        )}
        <div className="flex gap-4 overflow-x-auto pb-6 items-start">
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
                  if (draggingId) {
                    const ids = selectedIds.includes(draggingId) ? selectedIds : [draggingId];
                    requestMoveMany(ids, key);
                  }
                  setDraggingId(null);
                }}
                onClick={() => { if (selectedIds.length) requestMoveMany(selectedIds, key); }}
                className={`min-w-[300px] w-[300px] rounded-2xl border p-3.5 shadow-sm transition-all ${
                  dropTarget === key ? "border-primary ring-2 ring-primary/25 bg-primary/5" : "border-border bg-card"
                } ${isUn ? "bg-muted/40 border-dashed" : ""}`}
                data-over={!isUn && st.list.length > (capacities[key] ?? DEFAULT_CAPACITY) ? "1" : undefined}
              >
                <div className="flex items-center gap-1 mb-2">
                  {!isUn && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); moveColumn(key, 1); }}
                        disabled={idx === order.length - 1}
                        className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30" title="הזז שמאלה">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); moveColumn(key, -1); }}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30" title="הזז ימינה">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {renaming === key ? (
                    <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                      <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") commitRename(key); if (e.key === "Escape") setRenaming(null); }}
                        className="text-sm border border-border rounded-lg px-2 py-1.5 w-full bg-background" />
                      <button onClick={() => commitRename(key)} className="p-1.5 rounded-lg hover:bg-muted text-success"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setRenaming(null)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-base font-heading font-bold flex-1 truncate">{label}</h3>
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted">
                        <Users className="w-3.5 h-3.5" />{st.list.length}
                        {!isUn && (
                          <span className={st.list.length > (capacities[key] ?? DEFAULT_CAPACITY) ? "text-destructive font-bold" : "text-muted-foreground"}>
                            /{capacities[key] ?? DEFAULT_CAPACITY}
                          </span>
                        )}
                      </span>
                      {!isUn && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); setRenaming(key); setRenameValue(label); }}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" title="שנה שם"><Pencil className="w-4 h-4" /></button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteClass(key); }}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title="מחק כיתה"><Trash2 className="w-4 h-4" /></button>
                        </>
                      )}
                    </>
                  )}
                </div>

                {!isUn && teachers[key]?.name && (
                  <p className="text-xs text-muted-foreground mb-2 pb-2 border-b border-border">מחנכת: <span className="font-medium text-foreground">{teachers[key]?.name}</span></p>
                )}

                {!isUn && whatIf && whatIf.deltas[key] !== undefined && (
                  <div className={`mb-2 text-[11px] px-2 py-1 rounded-lg flex items-center gap-1.5 ${
                    whatIf.deltas[key] > 0 ? "bg-success/10 text-success" : whatIf.deltas[key] < 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                  }`}>
                    <Activity className="w-3.5 h-3.5" />
                    העברת {whatIf.name} לכאן: {whatIf.deltas[key] > 0 ? "+" : ""}{whatIf.deltas[key]} נק׳ איזון
                  </div>
                )}

                {!isUn && health[key] && (
                  <div className="mb-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-muted-foreground">ציון איזון</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${health[key].score}%`, background: health[key].score >= 75 ? "#10b981" : health[key].score >= 55 ? "#f59e0b" : "#ef4444" }} />
                      </div>
                      <span className="text-[11px] font-bold">{health[key].score}</span>
                      <input
                        type="number"
                        min={0}
                        value={capacities[key] ?? DEFAULT_CAPACITY}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setCapacity(key, Number(e.target.value))}
                        placeholder="תקן"
                        title="תקן מקסימלי לכיתה (ברירת מחדל 9)"
                        className="w-12 text-[10px] text-center rounded-md border border-border bg-background py-0.5"
                      />
                    </div>
                    {showStats && health[key].issues.length > 0 && (
                      <ul className="text-[10px] text-muted-foreground space-y-0.5">
                        {health[key].issues.slice(0, 3).map((iss, i) => <li key={i}>• {iss}</li>)}
                      </ul>
                    )}
                  </div>
                )}

                {showStats && !isUn && (
                  <div className="mb-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                      <span className="px-2 py-1 rounded-lg bg-sky-100 text-sky-700 font-medium">♂ {st.male}</span>
                      <span className="px-2 py-1 rounded-lg bg-pink-100 text-pink-700 font-medium">♀ {st.female}</span>
                      {Object.entries(st.grades).map(([g, n]) => (
                        <span key={g} className="px-2 py-1 rounded-lg bg-muted text-muted-foreground">{g}: {n}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                      {st.avgConduct != null && (
                        <span className="px-2 py-1 rounded-lg bg-muted">התנהגות {st.avgConduct}</span>
                      )}
                      <span className={`px-2 py-1 rounded-lg ${
                        st.load.status === "ok" ? "bg-success/15 text-success" :
                        st.load.status === "high" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"
                      }`}>
                        עומס {st.load.status === "ok" ? "תקין" : st.load.status === "high" ? "גבוה" : "מלא"}
                      </span>
                      {st.diversity.anchorCount === 0 && st.list.length > 0 && (
                        <span className="px-2 py-1 rounded-lg bg-warning/15 text-warning">ללא עוגן</span>
                      )}
                      {st.diversity.impulsiveTriadAlert && (
                        <span className="px-2 py-1 rounded-lg bg-destructive/15 text-destructive">ריכוז אימפולסיביות</span>
                      )}
                      {st.diversity.sensitiveOverload && (
                        <span className="px-2 py-1 rounded-lg bg-warning/15 text-warning">עומס חושי</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2 min-h-[80px]">
                  {st.list.filter((s) => !(hideFiltered && filtersActive && !matchesSearch(s))).map((s) => {
                    const dim = !matchesSearch(s);
                    const changed = (assign[s.id] || "") !== (baseline[s.id] || "");
                    return (
                      <div
                        key={s.id}
                        draggable
                        onDragStart={() => setDraggingId(s.id)}
                        onDragEnd={() => setDraggingId(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIds((prev) =>
                            prev.includes(s.id)
                              ? prev.filter((x) => x !== s.id)
                              : e.metaKey || e.ctrlKey || e.shiftKey || prev.length > 0
                                ? [...prev, s.id]
                                : [s.id]
                          );
                        }}
                        onDoubleClick={(e) => { e.stopPropagation(); setEditingId(s.id); }}
                        className={`rounded-xl border bg-background cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:-translate-y-px ${
                          compact ? "px-2.5 py-1.5" : "px-3 py-2.5"
                        } ${
                          selectedIds.includes(s.id) ? "border-primary ring-2 ring-primary/30" : "border-border"
                        } ${draggingId === s.id ? "opacity-40" : ""} ${dim ? "opacity-25" : ""} ${changed ? "bg-warning/5 border-warning/50" : ""} ${
                          pinnedIds.includes(s.id) ? "ring-1 ring-primary/25" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                          <GenderDot gender={resolveGender(s)} />
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/admin/student/${s.id}`); }}
                            className="text-sm font-semibold truncate flex-1 text-right hover:text-primary transition-colors"
                            title="פתח פרופיל"
                          >
                            {s.studentName}
                          </button>
                          {pinnedIds.includes(s.id) && <Lock className="w-3.5 h-3.5 text-primary shrink-0" />}
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingId(s.id); }}
                            className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-primary shrink-0"
                            title="עריכה והוספת מידע"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {s.grade && (
                            <span className="text-[11px] font-medium text-muted-foreground shrink-0 px-1.5 py-0.5 rounded-md bg-muted">{s.grade}</span>
                          )}
                        </div>
                        {showStats && !compact && (() => {
                          const p = buildStudentProfile(s);
                          const ca = p.conductMetrics?.average;
                          const sens = p.sensorySensitivity;
                          const anchor = !!(ca && ca >= 4 && (p.scores?.qualityOfLife || 0) >= 4);
                          const tags: { t: string; c: string }[] = [];
                          if (ca) tags.push({ t: `התנהגות ${ca}`, c: ca <= 2.5 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground" });
                          if (typeof sens === "number" && sens > 0 && sens <= 2.5) tags.push({ t: "רגיש חושית", c: "bg-warning/15 text-warning" });
                          if (p.riskFlags.length) tags.push({ t: `${p.riskFlags.length} דגלים`, c: "bg-destructive/10 text-destructive" });
                          if (anchor) tags.push({ t: "עוגן", c: "bg-success/15 text-success" });
                          if (!tags.length) return null;
                          return (
                            <div className="flex flex-wrap gap-1 mt-1.5 pr-6">
                              {tags.map((tg, i) => (
                                <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded-md ${tg.c}`}>{tg.t}</span>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                  {st.list.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-8 rounded-xl border border-dashed border-border">
                      גררו לכאן תלמידים
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Auto-balance preview */}
      <StudentEditor
        session={editingId ? sessionsById[editingId] || null : null}
        allSessions={sessions}
        pinned={!!editingId && pinnedIds.includes(editingId)}
        onTogglePin={() => editingId && togglePin(editingId)}
        onClose={() => setEditingId(null)}
        onSaved={(updated) => setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))}
      />

      <AlertDialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <AlertDialogContent dir="rtl" className="text-right max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Keyboard className="w-5 h-5 text-primary" /> קיצורי מקלדת</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <ul className="space-y-1.5 text-sm text-right">
                <li>· <strong>/</strong> — מעבר לשדה החיפוש</li>
                <li>· <strong>Ctrl/⌘ + Z</strong> — ביטול פעולה</li>
                <li>· <strong>Ctrl/⌘ + Shift + Z</strong> — ביצוע מחדש</li>
                <li>· <strong>Ctrl/⌘ + S</strong> — שמירת השיבוצים</li>
                <li>· <strong>Esc</strong> — ניקוי הסימון</li>
                <li>· <strong>לחיצה כפולה</strong> על כרטיס — עריכת מידע התלמיד</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>סגירה</AlertDialogCancel></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!balance} onOpenChange={(o) => { if (!o) setBalance(null); }}>
        <AlertDialogContent dir="rtl" className="text-right max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" /> הצעת איזון אוטומטי
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-right">
                <p className="text-xs">
                  המנוע בחן העברות והחלפות בין הכיתות כדי לשפר גודל, איזון מגדרי, פרופיל התנהגותי, עוגנים, עומס חושי וכימיה חברתית.
                </p>
                {balance && balance.moves.length === 0 ? (
                  <p className="text-sm text-success">הלוח כבר מאוזן — לא נמצאו העברות משפרות.</p>
                ) : (
                  <>
                    <p className="text-xs">
                      עלות איזון: <strong>{balance?.before}</strong> ← <strong className="text-success">{balance?.after}</strong> · {balance?.moves.length} העברות מוצעות
                    </p>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {balance?.moves.map((m) => (
                        <div key={m.id} className="flex items-center gap-2 text-xs rounded-lg border border-border px-2.5 py-1.5">
                          <span className="font-semibold">{m.name}</span>
                          <span className="text-muted-foreground">{m.from} ← {m.to}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={applyBalance} disabled={!balance || balance.moves.length === 0}>
              החל את ההצעה
            </AlertDialogAction>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <AlertDialogAction onClick={() => {
              if (pendingMove) {
                const ids = pendingMove.studentId.split(",");
                if (ids.length === 1) applyMove(ids[0], pendingMove.toKey);
                else {
                  setHistory((h) => [...h.slice(-19), assign]);
                  setAssign((prev) => {
                    const next = { ...prev };
                    ids.forEach((id) => { next[id] = pendingMove.toKey === UNASSIGNED ? "" : pendingMove.toKey; });
                    return next;
                  });
                  setSelectedIds([]);
                }
              }
              setPendingMove(null);
            }}>
              העבר בכל זאת
            </AlertDialogAction>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete class confirmation */}
      <AlertDialog open={newClassOpen} onOpenChange={setNewClassOpen}>
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader>
            <AlertDialogTitle>הוספת כיתה חדשה</AlertDialogTitle>
            <AlertDialogDescription>בחרו שם לכיתה. אפשר לשנות אותו בכל שלב.</AlertDialogDescription>
          </AlertDialogHeader>
          <input
            autoFocus
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && newClassName.trim()) addClass(); }}
            placeholder="לדוגמה: הכיתה של אורי"
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background"
          />
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={(e) => { e.preventDefault(); addClass(); }} disabled={!newClassName.trim()}>
              הוסף כיתה
            </AlertDialogAction>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
