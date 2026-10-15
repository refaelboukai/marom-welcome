import { useEffect, useState } from "react";
import { Copy, Download, Loader2, MessageCircle, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { copyText } from "@/lib/clipboard";
import { openWhatsApp, preOpenTab } from "@/lib/whatsapp";
import { EXIT_STATUS, ExitConsent, createExitInvite, deleteExit, exitLink, exitMessage, generateExitPDF, getExitConsents } from "@/lib/exit-consent";

const inp = "w-full px-3 py-2 rounded-xl border-2 border-border bg-card text-sm focus:outline-none focus:border-primary/60";
const statusCls: Record<string, string> = { sent: "bg-muted text-muted-foreground", in_progress: "bg-accent text-accent-foreground", submitted: "bg-success/15 text-success" };

const ExitAdmin = () => {
  const [rows, setRows] = useState<ExitConsent[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ student_name: "", grade: "", parent_phone: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => { setLoading(true); try { setRows(await getExitConsents()); } catch (e: any) { toast.error(e.message); } setLoading(false); };
  useEffect(() => { load(); }, []);

  const send = (r: ExitConsent, win?: Window | null) => {
    if (!openWhatsApp(r.parent_phone, exitMessage(r), win ?? preOpenTab())) toast.error("מספר טלפון לא תקין — אפשר להעתיק את הקישור");
  };

  const create = async (mode: "wa" | "copy") => {
    if (!form.student_name.trim()) return toast.error("יש להזין שם תלמיד/ה");
    if (mode === "wa" && !form.parent_phone.trim()) return toast.error("לשליחה בוואטסאפ יש להזין טלפון הורה");
    const win = mode === "wa" ? preOpenTab() : null;
    setBusy(true);
    const r = await createExitInvite(form);
    setBusy(false);
    if (!r) { win?.close(); return toast.error("היצירה נכשלה"); }
    setForm({ student_name: "", grade: "", parent_phone: "" });
    if (mode === "wa") send(r, win); else { await copyText(exitLink(r.token)); toast.success("הקישור נוצר והועתק"); }
    load();
  };

  return (
    <div className="space-y-5">
      <div className="intake-card-soft">
        <h4 className="font-heading font-semibold text-sm mb-3">יצירת קישור אישי להורים</h4>
        <div className="grid sm:grid-cols-3 gap-3">
          <input className={inp} placeholder="שם התלמיד/ה *" value={form.student_name} onChange={(e) => setForm({ ...form, student_name: e.target.value })} />
          <input className={inp} placeholder="כיתה" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
          <input className={inp} inputMode="tel" placeholder="טלפון הורה (לוואטסאפ)" value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} />
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <button disabled={busy} onClick={() => create("wa")} className="btn-intake bg-primary text-primary-foreground text-sm flex items-center gap-1.5">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />} יצירה ושליחה בוואטסאפ
          </button>
          <button disabled={busy} onClick={() => create("copy")} className="btn-intake bg-secondary text-secondary-foreground text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> יצירה והעתקת קישור
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">טפסים ({rows.length})</p>
        <button onClick={load} className="inline-flex items-center gap-1.5 text-xs text-primary"><RefreshCw className="w-3.5 h-3.5" /> רענון</button>
      </div>
      {loading ? <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /> : rows.length === 0 ? (
        <div className="intake-card-soft text-center py-6 text-sm text-muted-foreground">עדיין אין טפסים.</div>
      ) : rows.map((r) => (
        <div key={r.id} className="intake-card-soft flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <p className="font-heading font-semibold text-sm">{r.student_name || "—"} {r.grade && <span className="text-xs text-muted-foreground">· {r.grade}</span>}</p>
            <p className="text-xs text-muted-foreground">{r.parent_phone || "ללא טלפון"} · {new Date(r.created_at).toLocaleDateString("he-IL")}</p>
            <p className="text-[10px] text-muted-foreground/70 break-all">{exitLink(r.token)}</p>
          </div>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${statusCls[r.status] || statusCls.sent}`}>{EXIT_STATUS[r.status] || r.status}</span>
          <div className="flex gap-1.5">
            <button onClick={async () => toast[(await copyText(exitLink(r.token))) ? "success" : "error"]("הקישור הועתק")} className="p-2 rounded-xl hover:bg-muted" title="העתקת קישור"><Copy className="w-4 h-4" /></button>
            {r.parent_phone && <button onClick={() => send(r)} className="p-2 rounded-xl text-primary hover:bg-primary/10" title="וואטסאפ"><MessageCircle className="w-4 h-4" /></button>}
            {r.status === "submitted" && <button onClick={() => generateExitPDF(r.data)} className="btn-intake bg-primary text-primary-foreground text-xs flex items-center gap-1"><Download className="w-3.5 h-3.5" /> PDF</button>}
            <button onClick={async () => { if (confirm("למחוק?")) { await deleteExit(r.id); load(); } }} className="p-2 rounded-xl text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExitAdmin;
