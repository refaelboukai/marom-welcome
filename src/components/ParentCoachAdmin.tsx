import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { AlertTriangle, ArrowRight, Folder, Loader2, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { coachApi, MODE_LABELS } from "@/lib/parent-coach";

const ADMIN = { admin_code: "9020" };
type P = { id: string; name: string; child_name?: string; consent_at: string | null; active: boolean; last_seen_at: string; created_at: string };
type C = { id: string; participant_id: string; mode: string; title: string; feedback: string | null; safety_flag: boolean; ended_at: string | null; created_at: string };
type S = { id?: string; title: string; opening: string; guidance: string; active: boolean; sort_order: number };

const fmt = (d: string) => new Date(d).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });

const ParentCoachAdmin = () => {
  const [data, setData] = useState<{ participants: P[]; conversations: C[]; scenarios: S[]; settings: { ai_enabled: boolean } } | null>(null);
  const [tab, setTab] = useState<"parents" | "scenarios">("parents");
  const [folder, setFolder] = useState<P | null>(null);
  const [conv, setConv] = useState<C | null>(null);
  const [msgs, setMsgs] = useState<{ role: string; content: string; created_at: string }[]>([]);
  const [q, setQ] = useState("");
  const [modeF, setModeF] = useState("");
  const [editing, setEditing] = useState<S | null>(null);

  const load = () => coachApi({ action: "admin_overview", ...ADMIN }).then(setData).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const openConv = async (c: C) => {
    setConv(c); setMsgs([]);
    const d = await coachApi({ action: "admin_messages", conversation_id: c.id, ...ADMIN });
    setMsgs(d.messages ?? []);
  };

  const parents = useMemo(() => (data?.participants ?? []).filter((p) => p.name.includes(q.trim())), [data, q]);
  if (!data) return <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  const convsOf = (pid: string) => data.conversations.filter((c) => c.participant_id === pid && (!modeF || c.mode === modeF));

  const toggleAi = async () => {
    await coachApi({ action: "admin_settings", ai_enabled: !data.settings.ai_enabled, ...ADMIN });
    toast.success(data.settings.ai_enabled ? "יצירת תשובות הושבתה" : "יצירת תשובות הופעלה"); load();
  };

  const top = (
    <div className="flex flex-wrap items-center gap-2 justify-between">
      <div className="flex gap-2">
        {([["parents", "תיקיות הורים"], ["scenarios", "סימולציות"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => { setTab(k); setFolder(null); setConv(null); }}
            className={`px-3.5 py-2 rounded-xl text-sm font-medium border-2 ${tab === k ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>{l}</button>
        ))}
      </div>
      <Button size="sm" variant={data.settings.ai_enabled ? "outline" : "destructive"} onClick={toggleAi}>
        <Power /> {data.settings.ai_enabled ? "השבתת יצירת תשובות" : "התשובות מושבתות — הפעלה"}
      </Button>
    </div>
  );

  if (tab === "scenarios") return (
    <div className="space-y-4">
      {top}
      {editing ? (
        <div className="intake-card-soft space-y-3">
          <Input placeholder="כותרת התרחיש" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
          <Textarea placeholder="המשפט הפותח של הבן (בדיוני)" value={editing.opening} onChange={(e) => setEditing({ ...editing, opening: e.target.value })} />
          <Textarea placeholder="הנחיות לבוט לתרחיש זה (לא מוצג להורה)" value={editing.guidance} onChange={(e) => setEditing({ ...editing, guidance: e.target.value })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> פעיל ומוצג להורים</label>
          <div className="flex gap-2">
            <Button onClick={async () => { try { await coachApi({ action: "admin_save_scenario", scenario: editing, ...ADMIN }); toast.success("נשמר"); setEditing(null); load(); } catch (e: any) { toast.error(e.message); } }}>שמירה</Button>
            <Button variant="outline" onClick={() => setEditing(null)}>ביטול</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" onClick={() => setEditing({ title: "", opening: "", guidance: "", active: true, sort_order: data.scenarios.length + 1 })}><Plus /> סימולציה חדשה</Button>
      )}
      <div className="space-y-2">
        {data.scenarios.map((s) => (
          <div key={s.id} className="rounded-xl border border-border bg-card p-3 flex items-start gap-3">
            <div className="flex-1">
              <p className="font-semibold text-sm">{s.title} {!s.active && <span className="text-xs text-muted-foreground">(מוסתר)</span>}</p>
              <p className="text-xs text-muted-foreground">{s.opening}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditing(s)}>עריכה</Button>
            <Button size="icon" variant="ghost" aria-label="מחיקה" onClick={async () => { if (confirm("למחוק את הסימולציה?")) { await coachApi({ action: "admin_delete_scenario", id: s.id, ...ADMIN }); load(); } }}><Trash2 /></Button>
          </div>
        ))}
      </div>
    </div>
  );

  if (folder && conv) return (
    <div className="space-y-3">
      {top}
      <button onClick={() => setConv(null)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"><ArrowRight className="w-4 h-4" /> חזרה לתיקייה של {folder.name}</button>
      <h3 className="font-heading font-bold">{conv.title} <span className="text-xs text-muted-foreground font-normal">· {fmt(conv.created_at)}</span></h3>
      {conv.safety_flag && <p className="text-sm text-destructive flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> סומן אוטומטית: הופיעו מילים הקשורות לסכנה או אלימות. הסימון אינו מבטיח שמישהו טיפל בכך.</p>}
      <div className="space-y-2">
        {msgs.map((m, i) => (
          <div key={i} className={`rounded-xl p-3 text-sm border ${m.role === "user" ? "bg-primary/10 border-primary/30" : "bg-card border-border"}`}>
            <p className="text-[11px] text-muted-foreground mb-1">{m.role === "user" ? `ההורה (${folder.name})` : "תשובת הכלי"} · {fmt(m.created_at)}</p>
            {m.role === "user" ? <p className="whitespace-pre-wrap">{m.content}</p> : <div className="prose prose-sm max-w-none text-foreground"><ReactMarkdown>{m.content}</ReactMarkdown></div>}
          </div>
        ))}
        {conv.feedback && (
          <div className="rounded-xl p-3 text-sm border-2 border-primary/40 bg-primary/5">
            <p className="text-[11px] text-muted-foreground mb-1">משוב מסכם שהוצג להורה</p>
            <div className="prose prose-sm max-w-none text-foreground"><ReactMarkdown>{conv.feedback}</ReactMarkdown></div>
          </div>
        )}
      </div>
    </div>
  );

  if (folder) {
    const list = convsOf(folder.id);
    return (
      <div className="space-y-3">
        {top}
        <button onClick={() => setFolder(null)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"><ArrowRight className="w-4 h-4" /> כל התיקיות</button>
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <h3 className="font-heading font-bold flex items-center gap-2"><Folder className="w-5 h-5 text-primary" /> {folder.name}{folder.child_name ? ` · הבן: ${folder.child_name}` : ""}</h3>
          <Button size="sm" variant="outline" onClick={async () => { await coachApi({ action: "admin_set_participant", id: folder.id, active: !folder.active, ...ADMIN }); setFolder({ ...folder, active: !folder.active }); load(); }}>
            {folder.active ? "חסימת גישה" : "החזרת גישה"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">נכנס לראשונה {fmt(folder.created_at)} · פעילות אחרונה {fmt(folder.last_seen_at)} · {folder.consent_at ? `אישר את תנאי הפיקוח ${fmt(folder.consent_at)}` : "טרם אישר את תנאי הפיקוח"}</p>
        <select value={modeF} onChange={(e) => setModeF(e.target.value)} className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm">
          <option value="">כל סוגי התרגול</option>
          {Object.entries(MODE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        {list.length === 0 && <p className="text-sm text-muted-foreground">אין תרגולים עדיין.</p>}
        {list.map((c) => (
          <button key={c.id} onClick={() => openConv(c)} className="w-full text-right rounded-xl border border-border bg-card p-3 hover:border-primary/40 flex justify-between gap-2">
            <span className="text-sm flex items-center gap-1">{c.safety_flag && <AlertTriangle className="w-4 h-4 text-destructive" />}{c.title}</span>
            <span className="text-xs text-muted-foreground">{fmt(c.created_at)}{c.feedback ? " · הושלם" : ""}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {top}
      <Input placeholder="חיפוש לפי שם הורה" value={q} onChange={(e) => setQ(e.target.value)} />
      {parents.length === 0 && <p className="text-sm text-muted-foreground">עדיין אין הורים שנכנסו למרחב.</p>}
      <div className="grid sm:grid-cols-2 gap-2">
        {parents.map((p) => {
          const cs = data.conversations.filter((c) => c.participant_id === p.id);
          return (
            <button key={p.id} onClick={() => setFolder(p)} className="rounded-xl border border-border bg-card p-3 text-right hover:border-primary/40 flex items-center gap-3">
              <Folder className="w-6 h-6 text-primary" />
              <div className="flex-1">
                <p className="font-semibold text-sm">{p.name} {!p.active && <span className="text-xs text-destructive">(חסום)</span>}</p>
                <p className="text-xs text-muted-foreground">{p.child_name ? `הבן: ${p.child_name} · ` : ""}{cs.length} תרגולים · {fmt(p.last_seen_at)}</p>
              </div>
              {cs.some((c) => c.safety_flag) && <AlertTriangle className="w-4 h-4 text-destructive" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ParentCoachAdmin;
