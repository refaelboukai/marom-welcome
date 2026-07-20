import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  getSessionsDB,
  getClassGroups,
  getTeacherProfiles,
  updateSessionDB,
  deleteSessionDB,
  DEFAULT_CLASS_GROUPS,
  ClassGroupsMap,
  TeacherProfilesMap,
} from "@/lib/supabase-storage";
import { IntakeSession } from "@/lib/types";
import { aggregateClass, buildStudentProfile } from "@/lib/class-aggregations";
import { getStudentGender, Gender } from "@/lib/gender-utils";
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
} from "lucide-react";

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

const UNASSIGNED_KEY = "__unassigned__";

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

  // Drag state (HTML5 dnd + touch tap-to-move fallback)
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getSessionsDB(), getClassGroups(), getTeacherProfiles()]).then(([s, g, t]) => {
      setSessions(s);
      setClassGroups(g);
      setTeachers(t);
      setLoading(false);
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

  const unassignedCount = sessions.filter((s) => s.status !== "archived" && !s.classGroup).length;

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
      navigate("/admin/placement");
    } finally {
      setBatchConfirming(false);
    }
  };

  const currentClassFor = (a: BatchAssignment) => overrides[a.studentId] ?? a.classKey;

  const moveStudent = (studentId: string, toClass: string) => {
    setOverrides((prev) => ({ ...prev, [studentId]: toClass }));
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

  // Group assignments by column
  const columns = useMemo(() => {
    const cols: Record<string, BatchAssignment[]> = { [UNASSIGNED_KEY]: [] };
    Object.keys(classGroups).forEach((k) => { cols[k] = []; });
    (batchResult?.assignments || []).forEach((a) => {
      const key = currentClassFor(a);
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
                draggingId={draggingId}
                setDraggingId={setDraggingId}
                dropTarget={dropTarget}
                setDropTarget={setDropTarget}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
              />
            ) : (
              <TableView
                assignments={batchResult.assignments}
                classGroups={classGroups}
                sessionsById={sessionsById}
                overrides={overrides}
                setOverrides={setOverrides}
                onDelete={deleteStudent}
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
              <button onClick={confirmBatch} disabled={batchConfirming || batchLoading}
                className="btn-intake bg-primary text-primary-foreground text-sm flex items-center gap-1.5 disabled:opacity-50">
                {batchConfirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                אשר את כל השיבוצים
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ----- Board view -----
const BoardView = ({
  columns, classGroups, teachers, sessionsById,
  onMove, onDelete, draggingId, setDraggingId, dropTarget, setDropTarget,
  selectedId, setSelectedId,
}: {
  columns: Record<string, BatchAssignment[]>;
  classGroups: ClassGroupsMap;
  teachers: TeacherProfilesMap;
  sessionsById: Record<string, IntakeSession>;
  onMove: (studentId: string, toClass: string) => void;
  onDelete: (studentId: string, studentName: string) => void;
  draggingId: string | null;
  setDraggingId: (v: string | null) => void;
  dropTarget: string | null;
  setDropTarget: React.Dispatch<React.SetStateAction<string | null>>;
  selectedId: string | null;
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
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
                          setSelectedId(isSelected ? null : a.studentId);
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
  assignments, classGroups, sessionsById, overrides, setOverrides, onDelete,
}: {
  assignments: BatchAssignment[];
  classGroups: ClassGroupsMap;
  sessionsById: Record<string, IntakeSession>;
  overrides: Record<string, string>;
  setOverrides: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  onDelete: (studentId: string, studentName: string) => void;
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
                <tr key={a.studentId} className={i % 2 === 0 ? "bg-card" : "bg-muted/10"}>
                  <td className="px-3 py-2"><GenderBadge gender={gender} /></td>
                  <td className="px-3 py-2 font-medium">{a.studentName}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{s?.grade || "—"}</td>
                  <td className="px-3 py-2">
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
                  <td className="px-3 py-2">
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