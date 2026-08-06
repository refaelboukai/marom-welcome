import { useEffect, useState } from "react";
import { Clock, Download, Loader2, Save, Trash2 } from "lucide-react";
import { APP_URL } from "@/lib/app-url";
import {
  DECISION_LABELS, ShortDayRequest, WEEK_DAYS, deleteShortDayRequest,
  generateShortDayPDF, getShortDayRequests, updateShortDayRequest,
} from "@/lib/short-day";

const inputCls = "w-full px-3 py-2 rounded-xl border-2 border-border bg-card text-sm focus:outline-none focus:border-primary/60";

const heDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("he-IL") : "—");

const ShortDayAdmin = () => {
  const [rows, setRows] = useState<ShortDayRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Partial<ShortDayRequest>>({});

  const load = async () => { setLoading(true); setRows(await getShortDayRequests()); setLoading(false); };
  useEffect(() => { load(); }, []);

  const open = (r: ShortDayRequest) => {
    setOpenId(openId === r.id ? null : r.id);
    setDraft({ ...r });
  };

  const save = async () => {
    if (!openId) return;
    setBusy(true);
    await updateShortDayRequest(openId, {
      decision: draft.decision, decision_exit_time: draft.decision_exit_time,
      decision_days: draft.decision_days, decision_notes: draft.decision_notes,
      decision_date: draft.decision_date || new Date().toISOString().split("T")[0],
      sig_teacher: draft.sig_teacher, sig_treatment_coordinator: draft.sig_treatment_coordinator,
      sig_counselor: draft.sig_counselor, sig_principal: draft.sig_principal, sig_supervisor: draft.sig_supervisor,
      status: draft.decision === "pending" ? "submitted" : "decided",
    });
    setBusy(false);
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק את הבקשה לצמיתות?")) return;
    await deleteShortDayRequest(id);
    await load();
  };

  const setD = (k: keyof ShortDayRequest, v: unknown) => setDraft((p) => ({ ...p, [k]: v }));

  if (loading) return <div className="py-14 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="intake-card-soft flex flex-wrap items-center gap-3">
        <Clock className="w-5 h-5 text-primary" />
        <div className="flex-1">
          <p className="font-semibold text-sm">בקשות לקיצור יום לימודים</p>
          <p className="text-xs text-muted-foreground">קישור למילוי על ידי הורים: {APP_URL}/forms/short-day</p>
        </div>
        <button onClick={() => navigator.clipboard.writeText(`${APP_URL}/forms/short-day`)}
          className="btn-intake bg-secondary text-secondary-foreground text-xs px-3 py-2">העתקת קישור</button>
      </div>

      {rows.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">עדיין לא התקבלו בקשות.</p>}

      {rows.map((r) => (
        <div key={r.id} className="intake-card-soft">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => open(r)} className="flex-1 text-right">
              <p className="font-semibold text-sm">{r.student_name} {r.grade && <span className="text-muted-foreground font-normal">· כיתה {r.grade}</span>}</p>
              <p className="text-xs text-muted-foreground">
                יציאה ב-{r.exit_time || "—"} · {(r.days || []).join(", ") || "—"} · הוגש {heDate(r.created_at)}
              </p>
            </button>
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${
              r.decision === "approved" ? "bg-success/15 text-success"
                : r.decision === "rejected" ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground"}`}>
              {DECISION_LABELS[r.decision] || r.decision}
            </span>
            <button onClick={() => generateShortDayPDF(r, { compact: true })}
              className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10" title="הורדת PDF">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={() => remove(r.id)}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="מחיקה">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {openId === r.id && (
            <div className="mt-4 pt-4 border-t border-border space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <p><span className="text-muted-foreground">ת.ז.:</span> {r.student_id_number || "—"}</p>
                <p><span className="text-muted-foreground">מחנך/ת:</span> {r.homeroom_teacher || "—"}</p>
                <p><span className="text-muted-foreground">החל מתאריך:</span> {heDate(r.start_date)}</p>
                <p><span className="text-muted-foreground">הורים:</span> {[r.mother_name, r.father_name].filter(Boolean).join(" · ") || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">נימוק ההורים</p>
                <p className="text-sm whitespace-pre-wrap bg-muted/40 rounded-xl p-3">{r.reason || "—"}</p>
              </div>
              <div className="flex gap-3">
                {[["חתימת האם", r.mother_signature], ["חתימת האב", r.father_signature]].map(([l, img]) => (
                  <div key={l as string} className="flex-1 border border-border rounded-xl p-2">
                    <p className="text-[11px] text-muted-foreground mb-1">{l}</p>
                    {typeof img === "string" && img.startsWith("data:")
                      ? <img src={img} alt={l as string} className="h-16 object-contain" />
                      : <p className="text-xs text-muted-foreground">—</p>}
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
                <p className="font-semibold text-sm">החלטת בית הספר</p>
                <div className="flex gap-2">
                  {[["approved", "לאשר"], ["rejected", "לא לאשר"], ["pending", "ממתין"]].map(([k, l]) => (
                    <button key={k} onClick={() => setD("decision", k)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border-2 ${
                        draft.decision === k ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border"}`}>{l}</button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="block text-xs mb-1">שעת יציאה שאושרה</label>
                    <input type="time" className={inputCls} value={draft.decision_exit_time || ""} onChange={(e) => setD("decision_exit_time", e.target.value)} /></div>
                  <div><label className="block text-xs mb-1">תאריך ההחלטה</label>
                    <input type="date" className={inputCls} value={draft.decision_date || ""} onChange={(e) => setD("decision_date", e.target.value)} /></div>
                </div>
                <div>
                  <p className="text-xs mb-1">ימים שאושרו</p>
                  <div className="flex flex-wrap gap-2">
                    {WEEK_DAYS.map((d) => {
                      const arr = draft.decision_days || [];
                      const on = arr.includes(d);
                      return (
                        <button key={d} onClick={() => setD("decision_days", on ? arr.filter((x) => x !== d) : [...arr, d])}
                          className={`px-3 py-1.5 rounded-lg text-xs border-2 ${on ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border"}`}>{d}</button>
                      );
                    })}
                  </div>
                </div>
                <div><label className="block text-xs mb-1">הערות / נימוקים</label>
                  <textarea rows={3} className={`${inputCls} resize-none`} value={draft.decision_notes || ""} onChange={(e) => setD("decision_notes", e.target.value)} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([["sig_teacher", "מחנך/ת הכיתה"], ["sig_treatment_coordinator", "רכז/ת טיפול"], ["sig_counselor", "יועץ/ת בית הספר"], ["sig_principal", "מנהל/ת בית הספר"], ["sig_supervisor", "מפקח/ת חינוך מיוחד"]] as const).map(([k, l]) => (
                    <div key={k}><label className="block text-xs mb-1">{l}</label>
                      <input className={inputCls} value={(draft[k] as string) || ""} onChange={(e) => setD(k, e.target.value)} /></div>
                  ))}
                </div>
                <button onClick={save} disabled={busy}
                  className="btn-intake bg-primary text-primary-foreground text-xs px-4 py-2 inline-flex items-center gap-2 disabled:opacity-60">
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} שמירת ההחלטה
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ShortDayAdmin;