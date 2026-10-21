import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Download, Loader2 } from "lucide-react";
import SignaturePad from "@/components/SignaturePad";
import logo from "@/assets/logo.jpeg";
import { DEFAULT_TRIP, HEALTH_TEXT, TripData, TripDetails, generateTripPDF, getTripByToken, heDate, heDay, loadTripDetails, saveTripDraft, submitTrip } from "@/lib/trip-consent";

const inp = "w-full px-3 py-2 rounded-xl border-2 border-border bg-card text-sm focus:outline-none focus:border-primary/60";
const today = () => new Date().toISOString().slice(0, 10);

const TripConsentPage = () => {
  const [sp] = useSearchParams();
  const token = sp.get("t")?.toLowerCase() || null;
  const [trip, setTrip] = useState<TripDetails>(DEFAULT_TRIP);
  const [d, setD] = useState<TripData>({ sign_date: today() });
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState("");
  const ready = useRef(false);

  useEffect(() => {
    (async () => {
      if (token) {
        const r = await getTripByToken(token);
        if (r) {
          setD({ sign_date: today(), ...r.data });
          setTrip(r.trip && Object.keys(r.trip).length ? { ...DEFAULT_TRIP, ...r.trip } : await loadTripDetails());
          if (r.status === "submitted") setDone(true);
        } else setTrip(await loadTripDetails());
      } else setTrip(await loadTripDetails());
      setLoading(false); setTimeout(() => (ready.current = true), 100);
    })();
  }, [token]);

  useEffect(() => {
    if (!token || !ready.current || done) return;
    const t = setTimeout(async () => { await saveTripDraft(token, d); setSaved(new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })); }, 1200);
    return () => clearTimeout(t);
  }, [d, token, done]);

  const set = (k: keyof TripData, v: unknown) => setD((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    const e: string[] = [];
    if (!d.student_name?.trim()) e.push("שם התלמיד/ה — חסר");
    if (!d.health) e.push("מצב בריאותי — יש לסמן אחת מהאפשרויות");
    if (d.health && d.health !== "fit" && !d.remarks?.trim()) e.push("הערות — יש לפרט את המגבלה הבריאותית");
    if (!d.parent_name?.trim()) e.push("שם האם/האב — חסר");
    if (!d.signature) e.push("חתימת ההורה — חסרה");
    setErrors(e);
    if (e.length) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setBusy(true);
    const ok = await submitTrip(token, d, trip);
    setBusy(false);
    if (ok) setDone(true); else setErrors(["השליחה נכשלה — נסו שוב"]);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const row = (l: string, v: string) => <div className="rounded-xl bg-muted/50 px-3 py-2"><p className="text-[11px] text-muted-foreground">{l}</p><p className="text-sm font-semibold">{v || "—"}</p></div>;

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <div className="bg-card border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <img src={logo} alt="בית אקשטיין" className="w-11 h-11 rounded-xl object-cover" />
          <div className="flex-1">
            <h1 className="font-heading font-bold text-base leading-tight">אישור הורים להשתתפות בטיול{trip.name ? ` — ${trip.name}` : ""}</h1>
            <p className="text-[11px] text-muted-foreground">בית אקשטיין 'מרום' — נצר יבנה</p>
          </div>
          {saved && !done && <span className="text-[11px] text-muted-foreground">נשמר {saved}</span>}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {done ? (
          <div className="intake-card-soft text-center py-8 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
            <h2 className="font-heading font-bold text-lg">האישור נשלח לבית הספר — תודה!</h2>
            <button onClick={() => generateTripPDF(d, trip)} className="btn-intake bg-primary text-primary-foreground inline-flex items-center gap-1.5">
              <Download className="w-4 h-4" /> הורדת PDF
            </button>
          </div>
        ) : (<>
          {errors.length > 0 && (
            <div className="rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-4">
              <p className="font-semibold text-sm text-destructive mb-1">יש לתקן את השדות הבאים:</p>
              <ul className="list-disc pr-5 text-sm text-destructive space-y-0.5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
          )}
          <div className="intake-card-soft space-y-3 text-sm leading-relaxed">
            <p>להורים שלום,</p>
            <h3 className="font-heading font-semibold underline">הנדון: יציאה לטיול במסגרת הלימודים</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {row("יום", heDay(trip.date))}{row("תאריך", heDate(trip.date))}{row("מסלול הטיול", trip.route)}{row("שעת יציאה משוערת", trip.depart)}{row("שעת חזרה משוערת", trip.return_time)}
            </div>
            <div><p className="font-semibold underline">ציוד נדרש:</p><p className="whitespace-pre-line">{trip.equipment}</p></div>
            {trip.notes && <div><p className="font-semibold underline">התאמות והערות:</p><p className="whitespace-pre-line">{trip.notes}</p></div>}
            <p className="font-semibold">* יש להעביר את אישור היציאה החתום ל{trip.teacher || "מחנכת הכיתה"} (בשליחת הטופס כאן הוא מועבר אוטומטית).</p>
            <p className="font-semibold">** במידה ומזג האוויר לא יאפשר יציאה לטיול במועד הנ"ל, הטיול יידחה למועד חדש שיפורסם.</p>
            <p className="text-center"><b>בברכה,</b><br />רפאל בוקעי, מנהל בית-הספר</p>
          </div>

          <div className="intake-card-soft space-y-3 text-sm">
            <h3 className="font-heading font-semibold">אישור הורים על השתתפות בנכם/בתכם בטיול</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <input className={inp} placeholder="שם התלמיד/ה *" value={d.student_name || ""} onChange={(e) => set("student_name", e.target.value)} />
              <input className={inp} placeholder="כיתה" value={d.grade || ""} onChange={(e) => set("grade", e.target.value)} />
            </div>
            <p className="text-muted-foreground">הריני לאשר יציאת בני/בתי לטיול שיתקיים ב{trip.route || trip.name || "—"}, ביום {heDay(trip.date) || "—"}, {heDate(trip.date) || "—"}, בין השעות {trip.depart || "—"}–{trip.return_time || "—"}.</p>
            <p className="font-semibold">נא לסמן במקום המתאים:</p>
            {(Object.keys(HEALTH_TEXT) as (keyof typeof HEALTH_TEXT)[]).map((k) => (
              <label key={k} className="flex gap-2 items-start"><input type="radio" className="mt-1" checked={d.health === k} onChange={() => set("health", k)} /><span>{HEALTH_TEXT[k]}</span></label>
            ))}
            {d.health && d.health !== "fit" && <p className="text-xs font-semibold text-destructive rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2">יש למסור את האישור הרפואי למחנכת הכיתה.</p>}
            <textarea className={inp} rows={2} placeholder="הערות" value={d.remarks || ""} onChange={(e) => set("remarks", e.target.value)} />
          </div>

          <div className="intake-card-soft space-y-3">
            <input className={inp} placeholder="שם האם/האב *" value={d.parent_name || ""} onChange={(e) => set("parent_name", e.target.value)} />
            <SignaturePad label="חתימה *" value={d.signature || ""} onChange={(v) => set("signature", v)} />
            <label className="flex items-center gap-2 text-sm">תאריך <input type="date" className={inp + " max-w-[200px]"} value={d.sign_date || ""} onChange={(e) => set("sign_date", e.target.value)} /></label>
          </div>

          <button onClick={submit} disabled={busy} className="btn-intake w-full bg-primary text-primary-foreground flex items-center justify-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} שליחת האישור
          </button>
        </>)}
      </div>
    </div>
  );
};

export default TripConsentPage;
