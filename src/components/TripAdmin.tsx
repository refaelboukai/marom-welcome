import { useEffect, useState } from "react";
import { Copy, Download, Loader2, MessageCircle, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { copyText } from "@/lib/clipboard";
import { openWhatsApp, preOpenTab } from "@/lib/whatsapp";
import { DEFAULT_TRIP, TRIP_STATUS, TripConsent, TripDetails, createTripInvite, deleteTrip, generateTripPDF, getTripConsents, heDate, loadTripDetails, saveTripDetails, tripLink, tripMessage } from "@/lib/trip-consent";

const inp = "w-full px-3 py-2 rounded-xl border-2 border-border bg-card text-sm focus:outline-none focus:border-primary/60";
const statusCls: Record<string, string> = { sent: "bg-muted text-muted-foreground", in_progress: "bg-accent text-accent-foreground", submitted: "bg-success/15 text-success" };
const healthLbl: Record<string, string> = { fit: "כשיר/ה", limited_ok: "מגבלה — משתתף/ת", limited_no: "מגבלה — לא משתתף/ת" };

const TripAdmin = () => {
  const [trip, setTrip] = useState<TripDetails>(DEFAULT_TRIP);
  const [rows, setRows] = useState<TripConsent[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ student_name: "", grade: "", parent_phone: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => { setLoading(true); try { setRows(await getTripConsents()); } catch (e: any) { toast.error(e.message); } setLoading(false); };
  useEffect(() => { load(); loadTripDetails().then(setTrip); }, []);
  const st = (k: keyof TripDetails, v: string) => setTrip((p) => ({ ...p, [k]: v }));

  const send = (r: TripConsent, win?: Window | null) => {
    if (!openWhatsApp(r.parent_phone, tripMessage(r), win ?? preOpenTab())) toast.error("מספר טלפון לא תקין — אפשר להעתיק את הקישור");
  };
  const create = async (mode: "wa" | "copy") => {
    if (!form.student_name.trim()) return toast.error("יש להזין שם תלמיד/ה");
    if (mode === "wa" && !form.parent_phone.trim()) return toast.error("לשליחה בוואטסאפ יש להזין טלפון הורה");
    const win = mode === "wa" ? preOpenTab() : null;
    setBusy(true);
    await saveTripDetails(trip);
    const r = await createTripInvite(form);
    setBusy(false);
    if (!r) { win?.close(); return toast.error("היצירה נכשלה"); }
    setForm({ student_name: "", grade: "", parent_phone: "" });
    if (mode === "wa") send(r, win); else { await copyText(tripLink(r.token)); toast.success("הקישור נוצר והועתק"); }
    load();
  };

  return (
    <div className="space-y-5">
      <div className="intake-card-soft space-y-3">
        <h4 className="font-heading font-semibold text-sm">פרטי הטיול (מופיעים בטופס להורים)</h4>
        <div className="grid sm:grid-cols-2 gap-3">
          <input className={inp} placeholder="שם הטיול / יעד" value={trip.name} onChange={(e) => st("name", e.target.value)} />
          <input className={inp} type="date" value={trip.date} onChange={(e) => st("date", e.target.value)} />
          <input className={inp + " sm:col-span-2"} placeholder="מסלול הטיול" value={trip.route} onChange={(e) => st("route", e.target.value)} />
          <input className={inp} placeholder="שעת יציאה משוערת (למשל 08:30)" value={trip.depart} onChange={(e) => st("depart", e.target.value)} />
          <input className={inp} placeholder="שעת חזרה משוערת (למשל 13:00)" value={trip.return_time} onChange={(e) => st("return_time", e.target.value)} />
          <input className={inp} placeholder="למי מעבירים את האישור" value={trip.teacher} onChange={(e) => st("teacher", e.target.value)} />
        </div>
        <label className="block text-xs font-medium">ציוד נדרש</label>
        <textarea className={inp} rows={3} value={trip.equipment} onChange={(e) => st("equipment", e.target.value)} />
        <label className="block text-xs font-medium">התאמות נדרשות / הערות ליציאה (לא חובה)</label>
        <textarea className={inp} rows={2} placeholder="למשל: קרם הגנה, בגדים להחלפה, תרופות אישיות…" value={trip.notes} onChange={(e) => st("notes", e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <button onClick={async () => toast[(await saveTripDetails(trip)) ? "success" : "error"]("פרטי הטיול נשמרו")} className="btn-intake bg-secondary text-secondary-foreground text-sm flex items-center gap-1.5"><Save className="w-4 h-4" /> שמירת פרטי הטיול</button>
          <button onClick={async () => { await saveTripDetails(trip); toast[(await copyText(tripLink())) ? "success" : "error"]("הקישור הכללי הועתק"); }} className="btn-intake bg-primary text-primary-foreground text-sm flex items-center gap-1.5"><Copy className="w-4 h-4" /> שמירה והעתקת קישור כללי</button>
        </div>
      </div>

      <div className="intake-card-soft">
        <h4 className="font-heading font-semibold text-sm mb-3">קישור אישי להורה (לא חובה)</h4>
        <div className="grid sm:grid-cols-3 gap-3">
          <input className={inp} placeholder="שם התלמיד/ה *" value={form.student_name} onChange={(e) => setForm({ ...form, student_name: e.target.value })} />
          <input className={inp} placeholder="כיתה" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
          <input className={inp} inputMode="tel" placeholder="טלפון הורה (לוואטסאפ)" value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} />
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <button disabled={busy} onClick={() => create("wa")} className="btn-intake bg-primary text-primary-foreground text-sm flex items-center gap-1.5">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />} יצירה ושליחה בוואטסאפ
          </button>
          <button disabled={busy} onClick={() => create("copy")} className="btn-intake bg-secondary text-secondary-foreground text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> יצירה והעתקת קישור</button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">אישורים ({rows.length})</p>
        <button onClick={load} className="inline-flex items-center gap-1.5 text-xs text-primary"><RefreshCw className="w-3.5 h-3.5" /> רענון</button>
      </div>
      {loading ? <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /> : rows.length === 0 ? (
        <div className="intake-card-soft text-center py-6 text-sm text-muted-foreground">עדיין אין אישורים.</div>
      ) : rows.map((r) => (
        <div key={r.id} className="intake-card-soft flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <p className="font-heading font-semibold text-sm">{r.student_name || "—"} {r.grade && <span className="text-xs text-muted-foreground">· {r.grade}</span>}</p>
            <p className="text-xs text-muted-foreground">{r.trip?.name || "טיול"} {r.trip?.date && `· ${heDate(r.trip.date)}`} · {r.parent_phone || "ללא טלפון"}{r.data?.health && ` · ${healthLbl[r.data.health]}`}</p>
            <p className="text-[10px] text-muted-foreground/70 break-all">{tripLink(r.token)}</p>
          </div>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${statusCls[r.status] || statusCls.sent}`}>{TRIP_STATUS[r.status] || r.status}</span>
          <div className="flex gap-1.5">
            <button onClick={async () => toast[(await copyText(tripLink(r.token))) ? "success" : "error"]("הקישור הועתק")} className="p-2 rounded-xl hover:bg-muted" title="העתקת קישור"><Copy className="w-4 h-4" /></button>
            {r.parent_phone && <button onClick={() => send(r)} className="p-2 rounded-xl text-primary hover:bg-primary/10" title="וואטסאפ"><MessageCircle className="w-4 h-4" /></button>}
            {r.status === "submitted" && <button onClick={() => generateTripPDF(r.data, r.trip)} className="btn-intake bg-primary text-primary-foreground text-xs flex items-center gap-1"><Download className="w-3.5 h-3.5" /> PDF</button>}
            <button onClick={async () => { if (confirm("למחוק?")) { await deleteTrip(r.id); load(); } }} className="p-2 rounded-xl text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TripAdmin;
