import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IntakeSession } from "@/lib/types";
import {
  buildCompletionRows,
  completionSummary,
  matchesFilter,
  TRACK_FILTER_LABELS,
  TrackFilter,
  FillState,
  CompletionRow,
} from "@/lib/completion";
import { copyText } from "@/lib/clipboard";
import { normalizePhone } from "@/lib/whatsapp";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Send,
  MessageCircle,
  ClipboardList,
  Users,
  Clock,
  Copy,
  Download,
  BellRing,
} from "lucide-react";

interface Props {
  sessions: IntakeSession[];
  classGroups: Record<string, string>;
  onSendReminder: (phone: string | undefined, code: string, name: string) => void;
}

const StateIcon = ({ state, percent }: { state: FillState; percent: number }) => {
  const common = "w-4 h-4 inline-block";
  if (state === "done") return <CheckCircle2 className={`${common} text-success`} aria-label={`הושלם ${percent}%`} />;
  if (state === "partial") return <AlertTriangle className={`${common} text-warning`} aria-label={`בתהליך ${percent}%`} />;
  return <XCircle className={`${common} text-destructive`} aria-label="טרם החל" />;
};

const StateCell = ({ state, percent }: { state: FillState; percent: number }) => (
  <div className="flex flex-col items-center gap-0.5">
    <StateIcon state={state} percent={percent} />
    <span className={`text-[10px] font-medium ${state === "done" ? "text-success" : state === "partial" ? "text-warning" : "text-muted-foreground"}`}>
      {percent}%
    </span>
  </div>
);

const CompletionTracker = ({ sessions, classGroups, onSendReminder }: Props) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<TrackFilter>("all");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [copied, setCopied] = useState(false);
  const [queueIndex, setQueueIndex] = useState(0);

  const rows = useMemo(
    () => buildCompletionRows(sessions.filter((s) => s.status !== "archived")),
    [sessions]
  );
  const summary = useMemo(() => completionSummary(rows), [rows]);

  const filtered = useMemo(() => {
    return rows
      .filter((r) => matchesFilter(r, filter))
      .filter((r) => (classFilter === "all" ? true : classFilter === "none" ? !r.session.classGroup : r.session.classGroup === classFilter))
      .filter((r) => (search ? r.session.studentName.toLowerCase().includes(search.toLowerCase()) : true))
      .sort((a, b) => {
        const score = (r: CompletionRow) => (r.allDone ? 2 : r.student.state === "none" && r.parent.state === "none" ? 0 : 1);
        return score(a) - score(b) || a.session.studentName.localeCompare(b.session.studentName, "he");
      });
  }, [rows, filter, search, classFilter]);

  // Reminder queue: everyone in the current view who still misses student/parent input and has a phone
  const queue = useMemo(() => {
    const items: { name: string; phone?: string; code: string; who: string }[] = [];
    filtered.forEach((r) => {
      if (r.student.state !== "done" && normalizePhone(r.session.studentPhone || ""))
        items.push({ name: r.session.studentName, phone: r.session.studentPhone, code: r.session.studentCode, who: "תלמיד" });
      if (r.parent.state !== "done" && normalizePhone(r.session.parentPhone || ""))
        items.push({ name: `הורה של ${r.session.studentName}`, phone: r.session.parentPhone, code: r.session.parentCode, who: "הורה" });
    });
    return items;
  }, [filtered]);

  const sendNextInQueue = () => {
    const item = queue[queueIndex];
    if (!item) return;
    onSendReminder(item.phone, item.code, item.name);
    setQueueIndex((i) => Math.min(i + 1, queue.length));
  };

  const copyMissingList = () => {
    const text = filtered
      .filter((r) => !r.allDone)
      .map((r) => `${r.session.studentName}${r.session.grade ? ` (${r.session.grade})` : ""} — ${r.missingLabel}`)
      .join("\n");
    copyText(text || "אין חסרים ברשימה הנוכחית");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const exportCsv = () => {
    const header = ["שם", "כיתה", "שיוך", "תלמיד %", "הורה %", "צוות %", "חסר", "ימים מעדכון אחרון"];
    const lines = filtered.map((r) => [
      r.session.studentName,
      r.session.grade || "",
      classGroups[r.session.classGroup || ""] || "ללא שיוך",
      r.student.percent,
      r.parent.percent,
      r.staff.percent,
      r.missingLabel,
      r.daysSinceUpdate,
    ].join(","));
    const blob = new Blob(["\uFEFF" + [header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "מעקב_מילוי_שאלונים.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const overallPercent = summary.total ? Math.round((summary.complete / summary.total) * 100) : 0;

  const cards: { label: string; value: number; icon: typeof Users; cls: string; f: TrackFilter }[] = [
    { label: "השלימו הכול", value: summary.complete, icon: CheckCircle2, cls: "text-success bg-success/10", f: "complete" },
    { label: "התחילו ולא סיימו", value: summary.inProgress, icon: AlertTriangle, cls: "text-warning bg-warning/10", f: "in_progress" },
    { label: "טרם החלו כלל", value: summary.notStarted, icon: XCircle, cls: "text-destructive bg-destructive/10", f: "not_started" },
    { label: "חסרה הערכת צוות", value: summary.missingStaff, icon: ClipboardList, cls: "text-info bg-info/10", f: "missing_staff" },
    { label: "רק התלמיד השלים", value: summary.studentOnly, icon: Users, cls: "text-primary bg-primary/10", f: "student_only" },
    { label: "רק ההורה השלים", value: summary.parentOnly, icon: MessageCircle, cls: "text-primary bg-primary/10", f: "parent_only" },
    { label: "ללא פעילות 7+ ימים", value: summary.stale, icon: Clock, cls: "text-muted-foreground bg-muted", f: "stale" },
  ];

  return (
    <div className="space-y-4">
      {/* Overall progress */}
      <div className="intake-card-soft">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-heading font-bold">מעקב מילוי שאלונים</h2>
          <span className="text-xs text-muted-foreground">{summary.complete} מתוך {summary.total} הושלמו במלואם ({overallPercent}%)</span>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-success rounded-full transition-all" style={{ width: `${overallPercent}%` }} />
        </div>
        <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> הושלם</span>
          <span className="inline-flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-warning" /> התחיל ולא סיים</span>
          <span className="inline-flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-destructive" /> טרם החל</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
        {cards.map((c) => {
          const Icon = c.icon;
          const active = filter === c.f;
          return (
            <button key={c.f} onClick={() => setFilter(active ? "all" : c.f)}
              className={`intake-card-soft text-right transition-all ${active ? "ring-2 ring-primary" : "hover:shadow-md"}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 ${c.cls}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold leading-none">{c.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{c.label}</p>
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש תלמיד..."
            className="w-full bg-card border border-input rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
          className="bg-card border border-input rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">כל הכיתות</option>
          {Object.entries(classGroups).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          <option value="none">ללא שיוך</option>
        </select>
        <select value={filter} onChange={(e) => setFilter(e.target.value as TrackFilter)}
          className="bg-card border border-input rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          {(Object.keys(TRACK_FILTER_LABELS) as TrackFilter[]).map((k) => (
            <option key={k} value={k}>{TRACK_FILTER_LABELS[k]}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={sendNextInQueue} disabled={queueIndex >= queue.length}
          className={`btn-intake text-xs px-3 py-2 gap-1 ${queueIndex >= queue.length ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-success/10 text-success hover:bg-success/20"}`}>
          <BellRing className="w-3.5 h-3.5" />
          {queueIndex >= queue.length
            ? "אין תזכורות בתור"
            : `שליחת תזכורת לבא בתור — ${queue[queueIndex].who}: ${queue[queueIndex].name} (${queue.length - queueIndex} נותרו)`}
        </button>
        {queueIndex > 0 && (
          <button onClick={() => setQueueIndex(0)} className="btn-intake bg-muted text-foreground text-xs px-3 py-2">איפוס התור</button>
        )}
        <button onClick={copyMissingList} className="btn-intake bg-muted text-foreground text-xs px-3 py-2 gap-1 hover:bg-muted/70">
          {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />} העתקת רשימת החסרים
        </button>
        <button onClick={exportCsv} className="btn-intake bg-info/10 text-info text-xs px-3 py-2 gap-1 hover:bg-info/20">
          <Download className="w-3.5 h-3.5" /> ייצוא מעקב (CSV)
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="intake-card text-center py-10 text-muted-foreground text-sm">אין תלמידים התואמים לסינון</div>
      ) : (
        <>
          <div className="hidden md:block intake-card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground text-xs">
                  <th className="text-right px-4 py-3 font-medium">שם</th>
                  <th className="text-right px-4 py-3 font-medium">כיתה</th>
                  <th className="text-center px-3 py-3 font-medium">תלמיד</th>
                  <th className="text-center px-3 py-3 font-medium">הורה</th>
                  <th className="text-center px-3 py-3 font-medium">צוות חינוכי</th>
                  <th className="text-right px-4 py-3 font-medium">מה חסר</th>
                  <th className="text-center px-3 py-3 font-medium">עדכון אחרון</th>
                  <th className="text-right px-4 py-3 font-medium">תזכורות</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.session.id} className={`border-t border-border transition-colors ${r.allDone ? "bg-success/5" : "hover:bg-muted/30"}`}>
                    <td className="px-4 py-3 font-medium cursor-pointer hover:text-primary" onClick={() => navigate(`/admin/student/${r.session.id}`)}>
                      {r.session.studentName}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {r.session.grade || "—"}{r.session.classGroup && classGroups[r.session.classGroup] ? ` · ${classGroups[r.session.classGroup]}` : ""}
                    </td>
                    <td className="px-3 py-3"><StateCell state={r.student.state} percent={r.student.percent} /></td>
                    <td className="px-3 py-3"><StateCell state={r.parent.state} percent={r.parent.percent} /></td>
                    <td className="px-3 py-3"><StateCell state={r.staff.state} percent={r.staff.percent} /></td>
                    <td className={`px-4 py-3 text-xs ${r.allDone ? "text-success font-medium" : "text-muted-foreground"}`}>{r.missingLabel}</td>
                    <td className="px-3 py-3 text-center text-xs text-muted-foreground">
                      {r.daysSinceUpdate === 0 ? "היום" : `לפני ${r.daysSinceUpdate} ימים`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => onSendReminder(r.session.studentPhone, r.session.studentCode, r.session.studentName)}
                          disabled={r.student.state === "done"}
                          className="p-1.5 rounded-lg hover:bg-success/10 disabled:opacity-30" title="תזכורת לתלמיד">
                          <Send className="w-3.5 h-3.5 text-success" />
                        </button>
                        <button onClick={() => onSendReminder(r.session.parentPhone, r.session.parentCode, `הורה של ${r.session.studentName}`)}
                          disabled={r.parent.state === "done"}
                          className="p-1.5 rounded-lg hover:bg-success/10 disabled:opacity-30" title="תזכורת להורה">
                          <MessageCircle className="w-3.5 h-3.5 text-success" />
                        </button>
                        <button onClick={() => navigate(`/staff/${r.session.id}`)}
                          className="p-1.5 rounded-lg hover:bg-muted" title="מילוי שאלון צוות">
                          <ClipboardList className="w-3.5 h-3.5 text-warning" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-2">
            {filtered.map((r) => (
              <div key={r.session.id} className={`intake-card-soft ${r.allDone ? "bg-success/5" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <button onClick={() => navigate(`/admin/student/${r.session.id}`)} className="font-semibold text-sm text-right">
                    {r.session.studentName}
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="text-center"><StateIcon state={r.student.state} percent={r.student.percent} /><p className="text-[9px] text-muted-foreground">תלמיד</p></div>
                    <div className="text-center"><StateIcon state={r.parent.state} percent={r.parent.percent} /><p className="text-[9px] text-muted-foreground">הורה</p></div>
                    <div className="text-center"><StateIcon state={r.staff.state} percent={r.staff.percent} /><p className="text-[9px] text-muted-foreground">צוות</p></div>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{r.missingLabel}</p>
                <div className="flex gap-2 mt-2 pt-2 border-t border-border/30">
                  <button onClick={() => onSendReminder(r.session.studentPhone, r.session.studentCode, r.session.studentName)}
                    className="p-1.5 rounded-lg bg-success/10"><Send className="w-3.5 h-3.5 text-success" /></button>
                  <button onClick={() => onSendReminder(r.session.parentPhone, r.session.parentCode, `הורה של ${r.session.studentName}`)}
                    className="p-1.5 rounded-lg bg-success/10"><MessageCircle className="w-3.5 h-3.5 text-success" /></button>
                  <button onClick={() => navigate(`/staff/${r.session.id}`)} className="p-1.5 rounded-lg bg-muted mr-auto">
                    <ClipboardList className="w-3.5 h-3.5 text-warning" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CompletionTracker;
