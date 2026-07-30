import { useEffect, useMemo, useState } from "react";
import { IntakeSession } from "@/lib/types";
import { updateSessionDB } from "@/lib/supabase-storage";
import { buildStudentProfile } from "@/lib/class-aggregations";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Loader2, Save, Search, Lock, LockOpen, UserRound, HeartHandshake, FileText, X } from "lucide-react";

interface Props {
  session: IntakeSession | null;
  allSessions: IntakeSession[];
  pinned: boolean;
  onTogglePin: () => void;
  onClose: () => void;
  onSaved: (updated: IntakeSession) => void;
}

const tabs = [
  { key: "info", label: "פרטים", icon: UserRound },
  { key: "chem", label: "כימיה חברתית", icon: HeartHandshake },
  { key: "text", label: "מידע מילולי", icon: FileText },
] as const;

const StudentEditor = ({ session, allSessions, pinned, onTogglePin, onClose, onSaved }: Props) => {
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("info");
  const [grade, setGrade] = useState("");
  const [gender, setGender] = useState<string>("");
  const [narrative, setNarrative] = useState("");
  const [notes, setNotes] = useState("");
  const [avoid, setAvoid] = useState<string[]>([]);
  const [prefer, setPrefer] = useState<string[]>([]);
  const [relNotes, setRelNotes] = useState("");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session) return;
    setTab("info");
    setGrade(session.grade || "");
    setGender(session.gender || "");
    setNarrative(session.narrativeSummary || "");
    setNotes(session.adminNotes || "");
    setAvoid(session.relationships?.avoid || []);
    setPrefer(session.relationships?.prefer || []);
    setRelNotes(session.relationships?.notes || "");
    setQuery("");
  }, [session]);

  const profile = useMemo(() => (session ? buildStudentProfile(session) : null), [session]);

  const peers = useMemo(() => {
    const q = query.trim();
    return allSessions
      .filter((s) => s.id !== session?.id)
      .filter((s) => !q || s.studentName.includes(q))
      .sort((a, b) => a.studentName.localeCompare(b.studentName, "he"))
      .slice(0, 60);
  }, [allSessions, session, query]);

  const grades = useMemo(
    () => Array.from(new Set(allSessions.map((s) => s.grade).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "he")),
    [allSessions]
  );

  const toggle = (list: string[], set: (v: string[]) => void, other: string[], setOther: (v: string[]) => void, id: string) => {
    if (list.includes(id)) set(list.filter((x) => x !== id));
    else { set([...list, id]); setOther(other.filter((x) => x !== id)); }
  };

  const save = async () => {
    if (!session) return;
    setSaving(true);
    const updates: Partial<IntakeSession> = {
      grade,
      gender: (gender || "") as IntakeSession["gender"],
      narrativeSummary: narrative,
      adminNotes: notes,
      relationships: { avoid, prefer, notes: relNotes },
    };
    try {
      await updateSessionDB(session.id, updates);
      onSaved({ ...session, ...updates } as IntakeSession);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={!!session} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" dir="rtl" className="text-right w-full sm:max-w-lg overflow-y-auto">
        {session && (
          <>
            <SheetHeader className="text-right">
              <SheetTitle className="flex items-center gap-2 text-right">
                <span className="flex-1 truncate">{session.studentName}</span>
                <button
                  onClick={onTogglePin}
                  title={pinned ? "שחרור נעילת שיבוץ" : "נעילת התלמיד לכיתה הנוכחית"}
                  className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 border transition-colors ${
                    pinned ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {pinned ? <Lock className="w-3.5 h-3.5" /> : <LockOpen className="w-3.5 h-3.5" />}
                  {pinned ? "נעול" : "נעילה"}
                </button>
              </SheetTitle>
            </SheetHeader>

            {profile && (
              <div className="flex flex-wrap gap-1.5 mt-3 text-[11px]">
                {profile.conductMetrics?.average ? (
                  <span className="px-2 py-1 rounded-lg bg-muted">התנהגות {profile.conductMetrics.average}</span>
                ) : null}
                {typeof profile.sensorySensitivity === "number" && profile.sensorySensitivity > 0 && (
                  <span className="px-2 py-1 rounded-lg bg-muted">רגישות חושית {profile.sensorySensitivity}</span>
                )}
                {profile.riskFlags.length > 0 && (
                  <span className="px-2 py-1 rounded-lg bg-destructive/10 text-destructive">{profile.riskFlags.length} דגלים</span>
                )}
              </div>
            )}

            <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 mt-4">
              {tabs.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors ${
                    tab === t.key ? "bg-card shadow-sm text-primary" : "hover:bg-card/60 text-muted-foreground"
                  }`}>
                  <t.icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-4 pb-24">
              {tab === "info" && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground">שכבה</label>
                    <input list="board-grades" value={grade} onChange={(e) => setGrade(e.target.value)}
                      className="mt-1 w-full text-sm border border-border rounded-xl px-3 py-2 bg-background" />
                    <datalist id="board-grades">{grades.map((g) => <option key={g} value={g} />)}</datalist>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">מגדר</label>
                    <select value={gender} onChange={(e) => setGender(e.target.value)}
                      className="mt-1 w-full text-sm border border-border rounded-xl px-3 py-2 bg-background">
                      <option value="">לא הוגדר</option>
                      <option value="male">זכר</option>
                      <option value="female">נקבה</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">הערות מנהל (משפיעות על שיקולי השיבוץ)</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5}
                      placeholder="לדוגמה: זקוק למחנכת עם גבולות ברורים, מתקשה במעברים, אח בכיתה ט׳…"
                      className="mt-1 w-full text-sm border border-border rounded-xl px-3 py-2 bg-background" />
                  </div>
                </>
              )}

              {tab === "chem" && (
                <>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חיפוש תלמיד…"
                      className="w-full text-sm border border-border rounded-xl py-2 pr-9 pl-3 bg-background" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    סמנו תלמידים שרצוי לשבץ יחד (ירוק) או להפריד (אדום). ההגדרה נלקחת בחשבון במנוע האיזון ובאזהרות ההעברה.
                  </p>
                  <div className="space-y-1 max-h-[46vh] overflow-y-auto pl-1">
                    {peers.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
                        <span className="text-sm truncate flex-1">{p.studentName}</span>
                        {p.grade && <span className="text-[10px] text-muted-foreground">{p.grade}</span>}
                        <button onClick={() => toggle(prefer, setPrefer, avoid, setAvoid, p.id)}
                          className={`text-[11px] px-2 py-1 rounded-lg border transition-colors ${
                            prefer.includes(p.id) ? "border-success text-success bg-success/10" : "border-border text-muted-foreground hover:bg-muted"
                          }`}>יחד</button>
                        <button onClick={() => toggle(avoid, setAvoid, prefer, setPrefer, p.id)}
                          className={`text-[11px] px-2 py-1 rounded-lg border transition-colors ${
                            avoid.includes(p.id) ? "border-destructive text-destructive bg-destructive/10" : "border-border text-muted-foreground hover:bg-muted"
                          }`}>להפריד</button>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">הערות כימיה חברתית</label>
                    <textarea value={relNotes} onChange={(e) => setRelNotes(e.target.value)} rows={3}
                      className="mt-1 w-full text-sm border border-border rounded-xl px-3 py-2 bg-background" />
                  </div>
                </>
              )}

              {tab === "text" && (
                <div>
                  <label className="text-xs text-muted-foreground">סיכום מילולי על התלמיד</label>
                  <textarea value={narrative} onChange={(e) => setNarrative(e.target.value)} rows={14}
                    placeholder="תיאור חופשי: חוזקות, אתגרים, המלצות מהצוות…"
                    className="mt-1 w-full text-sm border border-border rounded-xl px-3 py-2 bg-background leading-relaxed" />
                </div>
              )}
            </div>

            <div className="absolute bottom-0 right-0 left-0 bg-card border-t border-border p-3 flex items-center gap-2">
              <button onClick={save} disabled={saving}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground flex items-center justify-center gap-1.5 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} שמירה
              </button>
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm border border-border hover:bg-muted flex items-center gap-1.5">
                <X className="w-4 h-4" /> סגירה
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default StudentEditor;