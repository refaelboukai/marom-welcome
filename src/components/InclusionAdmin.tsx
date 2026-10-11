import { useEffect, useState } from "react";
import { Download, Loader2, MessageCircle, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  InclusionConsent, RETURN_DESTINATIONS,
  deleteInclusionConsent, generateInclusionConsentPDF, getInclusionConsents,
} from "@/lib/inclusion-consent";
import {
  INCLUSION_INVITE_STATUS, InclusionInvite,
  createInclusionInvite, deleteInclusionInvite, getInclusionInvites,
  inclusionInviteLink, inclusionInviteMessage,
} from "@/lib/inclusion-invites";
import { openWhatsApp, preOpenTab } from "@/lib/whatsapp";

const heDate = (d?: string | null) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString("he-IL");
};

const inputCls =
  "w-full px-3 py-2 rounded-xl border-2 border-border bg-card text-sm focus:outline-none focus:border-primary/60 transition-colors";

const statusCls: Record<string, string> = {
  sent: "bg-muted text-muted-foreground",
  in_progress: "bg-amber-100 text-amber-800",
  submitted: "bg-success/15 text-success",
};

const InclusionAdmin = () => {
  const [rows, setRows] = useState<InclusionConsent[]>([]);
  const [invites, setInvites] = useState<InclusionInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({ student_name: "", grade: "", parent_name: "", parent_phone: "" });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [c, i] = await Promise.all([getInclusionConsents(), getInclusionInvites()]);
      setRows(c); setInvites(i);
    } catch (e: any) { setError(e?.message || "טעינה נכשלה"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const canCreate = form.student_name.trim() && form.parent_name.trim() && form.parent_phone.trim();

  const createAndSend = async (send: boolean) => {
    if (!canCreate || creating) return;
    const win = send ? preOpenTab() : null;
    setCreating(true);
    const inv = await createInclusionInvite(form);
    setCreating(false);
    if (!inv) { win?.close(); setError("יצירת ההזמנה נכשלה — נסו שוב"); return; }
    setForm({ student_name: "", grade: "", parent_name: "", parent_phone: "" });
    load();
    if (send) {
      const ok = openWhatsApp(inv.parent_phone, inclusionInviteMessage(inv), win);
      if (!ok) setError("מספר הטלפון אינו תקין לשליחת וואטסאפ");
    }
  };

  const resend = (inv: InclusionInvite) => {
    const ok = openWhatsApp(inv.parent_phone, inclusionInviteMessage(inv), preOpenTab());
    if (!ok) setError("מספר הטלפון אינו תקין לשליחת וואטסאפ");
  };

  const removeInvite = async (inv: InclusionInvite) => {
    if (!window.confirm(`למחוק את ההזמנה עבור ${inv.student_name}?`)) return;
    setBusyId(inv.id);
    await deleteInclusionInvite(inv.id);
    setBusyId(null);
    load();
  };

  const pdf = async (r: InclusionConsent) => {
    setBusyId(r.id);
    try { await generateInclusionConsentPDF(r, { compact: true }); }
    catch (e) { console.error("inclusion pdf failed", e); }
    finally { setBusyId(null); }
  };

  const remove = async (r: InclusionConsent) => {
    if (!window.confirm(`למחוק את האישור של ${r.student_name}?`)) return;
    setBusyId(r.id);
    await deleteInclusionConsent(r.id);
    setBusyId(null);
    load();
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <div className="intake-card-soft">
        <h4 className="font-heading font-semibold text-sm mb-1">שליחת הזמנה להורים בוואטסאפ</h4>
        <p className="text-xs text-muted-foreground mb-3">
          כל הורה מקבל קישור אישי עם שמירה אוטומטית — אפשר לעצור באמצע ולהמשיך מאוחר יותר.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className={inputCls} placeholder="שם התלמיד/ה *" value={form.student_name}
            onChange={(e) => setForm({ ...form, student_name: e.target.value })} />
          <input className={inputCls} placeholder="כיתה" value={form.grade}
            onChange={(e) => setForm({ ...form, grade: e.target.value })} />
          <input className={inputCls} placeholder="שם ההורה *" value={form.parent_name}
            onChange={(e) => setForm({ ...form, parent_name: e.target.value })} />
          <input className={inputCls} inputMode="tel" placeholder="טלפון ההורה (לוואטסאפ) *" value={form.parent_phone}
            onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} />
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={() => createAndSend(true)} disabled={!canCreate || creating}
            className="btn-intake bg-primary text-primary-foreground text-sm flex items-center gap-1.5 disabled:opacity-50">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />} יצירה ושליחה בוואטסאפ
          </button>
          <button onClick={() => createAndSend(false)} disabled={!canCreate || creating}
            className="btn-intake bg-secondary text-secondary-foreground text-sm flex items-center gap-1.5 disabled:opacity-50">
            <Plus className="w-4 h-4" /> יצירת הזמנה בלבד
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">הזמנות ({invites.length})</p>
          <button onClick={load} className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
            <RefreshCw className="w-3.5 h-3.5" /> רענון
          </button>
        </div>
        {error && <p className="text-sm text-destructive mb-2">{error}</p>}
        {invites.length === 0 && (
          <div className="intake-card-soft text-center py-6 text-sm text-muted-foreground">עדיין לא נשלחו הזמנות.</div>
        )}
        <div className="space-y-2">
          {invites.map((inv) => (
            <div key={inv.id} className="intake-card-soft flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <p className="font-heading font-semibold text-sm">{inv.student_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {inv.parent_name} · {inv.parent_phone} · נשלח {heDate(inv.sent_at)}
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5 break-all">{inclusionInviteLink(inv.token)}</p>
              </div>
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${statusCls[inv.status] || statusCls.sent}`}>
                {INCLUSION_INVITE_STATUS[inv.status] || inv.status}
              </span>
              <div className="flex gap-1.5">
                <button onClick={() => resend(inv)}
                  className="btn-intake bg-primary text-primary-foreground text-xs flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5" /> שליחה חוזרת
                </button>
                <button onClick={() => removeInvite(inv)} disabled={busyId === inv.id}
                  className="p-2 rounded-xl text-destructive hover:bg-destructive/10" title="מחיקה">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">אישורים שהתקבלו ({rows.length})</p>
        {rows.length === 0 && (
          <div className="intake-card-soft text-center py-6 text-sm text-muted-foreground">עדיין לא התקבלו אישורים.</div>
        )}
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="intake-card-soft flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <p className="font-heading font-semibold text-sm">{r.student_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  כיתה {r.grade} · שילוב ב{r.receiving_school} · יום {r.inclusion_day} {r.inclusion_hours}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  הוגש: {heDate(r.created_at)} · יעד חזרה: {RETURN_DESTINATIONS[r.return_destination] || "—"}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => pdf(r)} disabled={busyId === r.id}
                  className="btn-intake bg-primary text-primary-foreground text-xs flex items-center gap-1.5 disabled:opacity-60">
                  {busyId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PDF
                </button>
                <button onClick={() => remove(r)} disabled={busyId === r.id}
                  className="p-2 rounded-xl text-destructive hover:bg-destructive/10" title="מחיקה">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InclusionAdmin;
