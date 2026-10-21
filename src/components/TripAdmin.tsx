import { useEffect, useState } from "react";
import { ArrowRight, Copy, Download, Loader2, MapPin, MessageCircle, Pencil, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { copyText, labeledLink } from "@/lib/clipboard";
import { openWhatsApp, preOpenTab } from "@/lib/whatsapp";
import { DEFAULT_TRIP, TRIP_STATUS, TripConsent, TripDetails, createTripInvite, deleteTrip, deleteTripDetails, generateTripPDF, getTripConsents, heDate, heDay, loadTrips, saveTrip, tripLink, tripMessage, tripPublicLink } from "@/lib/trip-consent";

const inp = "w-full px-3 py-2 rounded-xl border-2 border-border bg-card text-sm focus:outline-none focus:border-primary/60";
const statusCls: Record<string, string> = { sent: "bg-muted text-muted-foreground", in_progress: "bg-accent text-accent-foreground", submitted: "bg-success/15 text-success" };
const healthLbl: Record<string, string> = { fit: "כשיר/ה", limited_ok: "מגבלה — משתתף/ת", limited_no: "מגבלה — לא משתתף/ת" };

const TripAdmin = () => {
  const [trips, setTrips] = useState<TripDetails[]>([]);
  const [trip, setTrip] = useState<TripDetails | null>(null); // trip being edited/viewed
  const [dirty, setDirty] = useState(false);
  const [rows, setRows] = useState<TripConsent[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ student_name: "", grade: "", parent_phone: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const [t, r] = await Promise.all([loadTrips(), getTripConsents()]); setTrips(t); setRows(r); } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const st = (k: keyof TripDetails, v: string) => { setTrip((p) => p && ({ ...p, [k]: v })); setDirty(true); };

  const save = async () => {
    if (!trip) return;
    if (!trip.name.trim()) return toast.error("יש להזין שם לטיול");
    if (!trip.date) return toast.error("יש לבחור תאריך לטיול");
    setBusy(true);
    const saved = await saveTrip(trip);
    setBusy(false);
    if (!saved) return toast.error("השמירה נכשלה");
    setTrip(saved); setDirty(false); toast.success("הטיול נשמר — אפשר להפיק קישור"); load();
  };

  const send = (r: TripConsent, win?: Window | null) => {
    if (!openWhatsApp(r.parent_phone, tripMessage(r), win ?? preOpenTab())) toast.error("מספר טלפון לא תקין — אפשר להעתיק את הקישור");
  };
  const create = async (mode: "wa" | "copy") => {
    if (!trip?.id) return;
    if (!form.student_name.trim()) return toast.error("יש להזין שם תלמיד/ה");
    if (mode === "wa" && !form.parent_phone.trim()) return toast.error("לשליחה בוואטסאפ יש להזין טלפון הורה");
    const win = mode === "wa" ? preOpenTab() : null;
    setBusy(true);
    const r = await createTripInvite(form, trip);
    setBusy(false);
    if (!r) { win?.close(); return toast.error("היצירה נכשלה"); }
    setForm({ student_name: "", grade: "", parent_phone: "" });
    if (mode === "wa") send(r, win); else { await copyText(labeledLink(`אישור הורים — יציאה לטיול${trip.name ? ` — ${trip.name}` : ""}`, tripLink(r.token))); toast.success("הקישור נוצר והועתק"); }
    load();
  };

  /* ---------- trips list ---------- */
  if (!trip) return (
    <div className="space-y-4">
      <button onClick={() => { setTrip({ ...DEFAULT_TRIP }); setDirty(false); }} className="btn-intake bg-primary text-primary-foreground text-sm inline-flex items-center gap-1.5">
        <Plus className="w-4 h-4" /> טיול חדש
      </button>
      {loading ? <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /> : trips.length === 0 ? (
        <div className="intake-card-soft text-center py-6 text-sm text-muted-foreground">עדיין אין טיולים. לחצו "טיול חדש" כדי להתחיל.</div>
      ) : trips.map((t) => {
        const mine = rows.filter((r) => r.trip?.id === t.id);
        const sub = mine.filter((r) => r.status === "submitted").length;
        return (
          <div key={t.id} className="intake-card-soft flex flex-wrap items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><MapPin className="w-5 h-5 text-primary" /></span>
            <div className="flex-1 min-w-[180px]">
              <p className="font-heading font-semibold text-sm">{t.name}</p>
              <p className="text-xs text-muted-foreground">{heDay(t.date)} {heDate(t.date)}{t.route && ` · ${t.route}`} · {sub} אישורים הוגשו</p>
            </div>
            <div className="flex gap-1.5">
              <button onClick={async () => toast[(await copyText(labeledLink(`אישור הורים — יציאה לטיול${t.name ? ` — ${t.name}` : ""}`, tripPublicLink(t.id!)))) ? "success" : "error"]("הקישור הועתק")} className="btn-intake bg-secondary text-secondary-foreground text-xs flex items-center gap-1"><Copy className="w-3.5 h-3.5" /> העתקת קישור</button>
              <button onClick={() => { setTrip(t); setDirty(false); }} className="p-2 rounded-xl hover:bg-muted" title="פתיחה ועריכה"><Pencil className="w-4 h-4" /></button>
              <button onClick={async () => { if (confirm(`למחוק את הטיול "${t.name}"?`)) { await deleteTripDetails(t.id!); load(); } }} className="p-2 rounded-xl text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        );
      })}
    </div>
  );

  /* ---------- single trip ---------- */
  const mine = rows.filter((r) => trip.id && r.trip?.id === trip.id);
  const savedOk = !!trip.id && !dirty;
  return (
    <div className="space-y-5">
      <button onClick={() => { setTrip(null); load(); }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
        <ArrowRight className="w-4 h-4" /> לרשימת הטיולים
      </button>

      <div className="intake-card-soft space-y-3">
        <h4 className="font-heading font-semibold text-sm">1. פרטי הטיול</h4>
        <div className="grid sm:grid-cols-2 gap-3">
          <input className={inp} placeholder="שם הטיול / יעד *" value={trip.name} onChange={(e) => st("name", e.target.value)} />
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
        <button disabled={busy} onClick={save} className="btn-intake bg-primary text-primary-foreground text-sm inline-flex items-center gap-1.5">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} שמירה
        </button>
      </div>

      <div className={`intake-card-soft space-y-3 ${savedOk ? "" : "opacity-50 pointer-events-none"}`}>
        <h4 className="font-heading font-semibold text-sm">2. הפקת קישור {savedOk ? "" : "(יש לשמור קודם)"}</h4>
        {trip.id && <p className="text-[11px] text-muted-foreground break-all">{tripPublicLink(trip.id)}</p>}
        <button onClick={async () => toast[(await copyText(labeledLink(`אישור הורים — יציאה לטיול${trip.name ? ` — ${trip.name}` : ""}`, tripPublicLink(trip.id!)))) ? "success" : "error"]("הקישור הועתק — אפשר להדביק בוואטסאפ")} className="btn-intake bg-primary text-primary-foreground text-sm inline-flex items-center gap-1.5">
          <Copy className="w-4 h-4" /> העתקת קישור לטיול
        </button>
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">שליחת קישור אישי להורה (לא חובה)</summary>
          <div className="grid sm:grid-cols-3 gap-3 mt-3">
            <input className={inp} placeholder="שם התלמיד/ה *" value={form.student_name} onChange={(e) => setForm({ ...form, student_name: e.target.value })} />
            <input className={inp} placeholder="כיתה" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
            <input className={inp} inputMode="tel" placeholder="טלפון הורה (לוואטסאפ)" value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} />
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <button disabled={busy} onClick={() => create("wa")} className="btn-intake bg-primary text-primary-foreground text-sm flex items-center gap-1.5"><MessageCircle className="w-4 h-4" /> יצירה ושליחה בוואטסאפ</button>
            <button disabled={busy} onClick={() => create("copy")} className="btn-intake bg-secondary text-secondary-foreground text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> יצירה והעתקת קישור</button>
          </div>
        </details>
      </div>

      <div className={savedOk ? "" : "opacity-50 pointer-events-none"}>
        <button onClick={() => { setTrip({ ...DEFAULT_TRIP }); setDirty(false); }} className="btn-intake bg-secondary text-secondary-foreground text-sm inline-flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> 3. יצירת טיול חדש
        </button>
      </div>

      {trip.id && (<>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">אישורים לטיול זה ({mine.length})</p>
          <button onClick={load} className="inline-flex items-center gap-1.5 text-xs text-primary"><RefreshCw className="w-3.5 h-3.5" /> רענון</button>
        </div>
        {mine.length === 0 ? <div className="intake-card-soft text-center py-6 text-sm text-muted-foreground">עדיין אין אישורים.</div> : mine.map((r) => (
          <div key={r.id} className="intake-card-soft flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <p className="font-heading font-semibold text-sm">{r.student_name || "—"} {r.grade && <span className="text-xs text-muted-foreground">· {r.grade}</span>}</p>
              <p className="text-xs text-muted-foreground">{r.data?.parent_name || r.parent_phone || "—"}{r.data?.health && ` · ${healthLbl[r.data.health]}`}</p>
            </div>
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${statusCls[r.status] || statusCls.sent}`}>{TRIP_STATUS[r.status] || r.status}</span>
            <div className="flex gap-1.5">
              {r.parent_phone && r.status !== "submitted" && <button onClick={() => send(r)} className="p-2 rounded-xl text-primary hover:bg-primary/10" title="וואטסאפ"><MessageCircle className="w-4 h-4" /></button>}
              {r.status === "submitted" && <button onClick={() => generateTripPDF(r.data, r.trip)} className="btn-intake bg-primary text-primary-foreground text-xs flex items-center gap-1"><Download className="w-3.5 h-3.5" /> PDF</button>}
              <button onClick={async () => { if (confirm("למחוק?")) { await deleteTrip(r.id); load(); } }} className="p-2 rounded-xl text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </>)}
    </div>
  );
};

export default TripAdmin;
