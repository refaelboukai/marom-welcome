import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, ChevronRight, Clock, Download, FileText, Loader2, Send } from "lucide-react";
import logo from "@/assets/logo.jpeg";
import moeLogo from "@/assets/moe-logo.jpeg";
import SignaturePad from "@/components/SignaturePad";
import {
  ACADEMIC_YEAR, DECLARATIONS, ShortDayRequest as SDR, WEEK_DAYS,
  generateShortDayPDF, submitShortDayRequest,
} from "@/lib/short-day";
import {
  getShortDayInviteByToken, markShortDayInviteSubmitted, saveShortDayDraft,
} from "@/lib/short-day-invites";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl border-2 border-border bg-card text-sm focus:outline-none focus:border-primary/60 transition-colors";

/** Red asterisk marking a mandatory field. */
const Req = () => <span className="text-destructive font-bold">*</span>;

const today = () => new Date().toISOString().split("T")[0];

const ShortDayRequestPage = () => {
  const [params] = useSearchParams();
  const token = (params.get("t") || "").trim().toLowerCase();
  const [v, setV] = useState({
    request_date: today(),
    student_name: "",
    student_id_number: "",
    grade: "",
    school_name: "מרום — בית אקשטיין יבנה",
    homeroom_teacher: "",
    principal_name: "",
    exit_time: "",
    start_date: "",
    reason: "",
    mother_name: "",
    mother_signature: "",
    father_name: "",
    father_signature: "",
  });
  const [days, setDays] = useState<string[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [singleParent, setSingleParent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const loadedRef = useRef(false);

  // Load the personal invite (WhatsApp link) and any saved draft
  useEffect(() => {
    if (!token) { loadedRef.current = true; return; }
    (async () => {
      const inv = await getShortDayInviteByToken(token);
      if (inv) {
        const d = (inv.draft_data || {}) as Record<string, any>;
        setV((prev) => ({
          ...prev,
          ...Object.fromEntries(Object.entries(d).filter(([k]) => k in prev)),
          student_name: d.student_name || inv.student_name || prev.student_name,
          grade: d.grade || inv.grade || prev.grade,
        }));
        if (Array.isArray(d.days)) setDays(d.days);
        if (d.accepted) setAccepted(true);
      }
      loadedRef.current = true;
    })();
  }, [token]);

  // Auto-save the draft so parents can pause and continue later
  useEffect(() => {
    if (!token || !loadedRef.current || done) return;
    const t = setTimeout(async () => {
      await saveShortDayDraft(token, { ...v, days, accepted });
      setSavedAt(new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }));
    }, 1200);
    return () => clearTimeout(t);
  }, [v, days, accepted, token, done]);

  const set = (k: keyof typeof v, val: string) => setV((p) => ({ ...p, [k]: val }));
  const toggleDay = (d: string) => setDays((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]));

  // Every field on this form is mandatory (red asterisk) before submitting.
  const missing: string[] = [];
  if (!v.request_date) missing.push("תאריך");
  if (!v.student_name.trim()) missing.push("שם התלמיד/ה");
  if (v.student_id_number.trim().length !== 9) missing.push("ת.ז. התלמיד/ה (9 ספרות)");
  if (!v.grade.trim()) missing.push("כיתה");
  if (!v.school_name.trim()) missing.push("בית הספר");
  if (!v.homeroom_teacher.trim()) missing.push("מחנך/ת הכיתה");
  if (!v.principal_name.trim()) missing.push("מנהל/ת בית הספר");
  if (!v.exit_time.trim()) missing.push("שעת היציאה המבוקשת");
  if (!v.start_date) missing.push("החל מתאריך");
  if (days.length === 0) missing.push("הימים המבוקשים");
  if (v.reason.trim().length <= 5) missing.push("נימוק לבקשה");
  if (!accepted) missing.push("אישור ההצהרה");
  if (!v.mother_name.trim() && !singleParent) missing.push("שם האם/האפוטרופוס");
  if (!v.mother_signature && !singleParent) missing.push("חתימת האם/האפוטרופוס");
  if (!v.father_name.trim() && !singleParent) missing.push("שם האב/האפוטרופוס");
  if (!v.father_signature && !singleParent) missing.push("חתימת האב/האפוטרופוס");
  if (singleParent) {
    if (!v.mother_name.trim() && !v.father_name.trim()) missing.push("שם ההורה/אפוטרופוס");
    if (!v.mother_signature && !v.father_signature) missing.push("חתימת ההורה/אפוטרופוס");
  }
  const valid = missing.length === 0;

  const record = (): SDR => ({
    id: "", academic_year: ACADEMIC_YEAR,
    request_date: v.request_date || null,
    student_name: v.student_name, student_id_number: v.student_id_number, grade: v.grade,
    school_name: v.school_name, homeroom_teacher: v.homeroom_teacher, principal_name: v.principal_name,
    exit_time: v.exit_time, days, start_date: v.start_date || null, reason: v.reason,
    mother_name: v.mother_name, mother_signature: v.mother_signature, mother_sign_date: v.mother_signature ? today() : null,
    father_name: v.father_name, father_signature: v.father_signature, father_sign_date: v.father_signature ? today() : null,
    declarations_accepted: accepted,
    decision: "pending", decision_exit_time: "", decision_days: [], decision_notes: "", decision_date: null,
    sig_teacher: "", sig_treatment_coordinator: "", sig_counselor: "", sig_principal: "", sig_supervisor: "",
    status: "submitted", created_at: "", updated_at: "",
  });

  const isIOS = typeof navigator !== "undefined" &&
    (/iP(hone|ad|od)/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

  const downloadPDF = async (compact = true) => {
    if (pdfBusy) return;
    setPdfBusy(true);
    const win = isIOS ? window.open("", "_blank") : null;
    try {
      await generateShortDayPDF(record(), { targetWindow: win, compact });
    } catch (e) {
      console.error("short-day pdf failed", e);
      win?.close();
    } finally { setPdfBusy(false); }
  };

  const submit = async () => {
    setSubmitting(true); setError("");
    const r = record();
    const { id: _id, created_at: _c, updated_at: _u, ...payload } = r;
    const res = await submitShortDayRequest(payload);
    setSubmitting(false);
    if (!res.ok) { setError("אירעה שגיאה בשליחת הטופס. נסו שוב בעוד רגע."); return; }
    if (token) await markShortDayInviteSubmitted(token, res.id || null);
    setDone(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center px-4">
        <div className="intake-card-soft max-w-md w-full text-center py-10">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-success" />
          </div>
          <h1 className="text-xl font-heading font-bold mb-2">הבקשה נשלחה בהצלחה</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            הבקשה לקיצור יום הלימודים עבור {v.student_name} התקבלה בבית הספר ותיבחן על ידי ההנהלה והגורמים המוסמכים.
          </p>
          <button onClick={() => downloadPDF(true)} disabled={pdfBusy}
            className="btn-intake bg-primary text-primary-foreground shadow-md inline-flex items-center gap-2 mx-auto disabled:opacity-60">
            {pdfBusy ? <><Loader2 className="w-4 h-4 animate-spin" /> מכין את הקובץ…</> : <><Download className="w-4 h-4" /> הורדת עותק PDF</>}
          </button>
          <div className="mt-4">
            <Link to="/forms" className="text-xs text-primary underline underline-offset-4">חזרה לטפסים הדיגיטליים</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="bg-card border-b border-border sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <img src={logo} alt="בית אקשטיין" className="w-10 h-10 rounded-xl object-cover" />
          <div className="flex-1">
            <h1 className="font-heading font-bold text-base leading-tight">בקשת הורים לקיצור יום לימודים</h1>
            <p className="text-[11px] text-muted-foreground">בית ספר מרום — בית אקשטיין יבנה · שנת הלימודים {ACADEMIC_YEAR}</p>
          </div>
          {token && savedAt && (
            <span className="hidden sm:inline text-[10px] text-muted-foreground">נשמר {savedAt}</span>
          )}
          <img src={moeLogo} alt="משרד החינוך" loading="lazy" className="h-9 w-auto object-contain" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-5 space-y-4">
        <Link to="/forms" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
          <ChevronRight className="w-3.5 h-3.5" /> כל הטפסים הדיגיטליים
        </Link>
        <p className="text-xs text-muted-foreground">
          שדות המסומנים ב-<Req /> הם שדות חובה ויש למלא את כולם לפני שליחת הבקשה.
        </p>

        <div className="intake-card-soft">
          <h2 className="flex items-center gap-2 text-base font-heading font-semibold mb-3">
            <FileText className="w-4 h-4 text-primary" /> פרטי התלמיד/ה והפנייה
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1.5">תאריך <Req /></label>
              <input type="date" className={inputCls} value={v.request_date} onChange={(e) => set("request_date", e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-1.5">שם התלמיד/ה <Req /></label>
              <input className={inputCls} value={v.student_name} onChange={(e) => set("student_name", e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-1.5">ת.ז. התלמיד/ה <Req /></label>
              <input className={inputCls} inputMode="numeric" value={v.student_id_number}
                onChange={(e) => set("student_id_number", e.target.value.replace(/\D/g, "").slice(0, 9))} /></div>
            <div><label className="block text-sm font-medium mb-1.5">כיתה <Req /></label>
              <input className={inputCls} value={v.grade} onChange={(e) => set("grade", e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-1.5">בית הספר <Req /></label>
              <input className={inputCls} value={v.school_name} onChange={(e) => set("school_name", e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-1.5">מחנך/ת הכיתה <Req /></label>
              <input className={inputCls} value={v.homeroom_teacher} onChange={(e) => set("homeroom_teacher", e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-1.5">מנהל/ת בית הספר <Req /></label>
              <input className={inputCls} value={v.principal_name} onChange={(e) => set("principal_name", e.target.value)} /></div>
          </div>
        </div>

        <div className="intake-card-soft">
          <h2 className="flex items-center gap-2 text-base font-heading font-semibold mb-3">
            <Clock className="w-4 h-4 text-primary" /> פרטי הבקשה
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1.5">שעת היציאה המבוקשת <Req /></label>
              <input type="time" className={inputCls} value={v.exit_time} onChange={(e) => set("exit_time", e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-1.5">החל מתאריך <Req /></label>
              <input type="date" className={inputCls} value={v.start_date} onChange={(e) => set("start_date", e.target.value)} /></div>
          </div>
          <p className="text-sm font-medium mt-4 mb-2">הימים המבוקשים <Req /></p>
          <div className="flex flex-wrap gap-2">
            {WEEK_DAYS.map((d) => (
              <button key={d} type="button" onClick={() => toggleDay(d)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                  days.includes(d) ? "bg-primary border-primary text-primary-foreground shadow-md" : "bg-card border-border hover:border-primary/40"
                }`}>{d}</button>
            ))}
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1.5">נימוק לבקשה <Req /></label>
            <textarea className={`${inputCls} resize-none`} rows={5} maxLength={1500} value={v.reason}
              onChange={(e) => set("reason", e.target.value)}
              placeholder="פרטו את הסיבה לבקשה — שיקולים רפואיים, טיפוליים, רגשיים או משפחתיים הרלוונטיים לילד/ה" />
          </div>
        </div>

        <div className="intake-card-soft">
          <h2 className="text-base font-heading font-semibold mb-2">הצהרת ההורים</h2>
          <ol className="list-decimal pr-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
            {DECLARATIONS.map((d, i) => <li key={i}>{d}</li>)}
          </ol>
          <label className={`mt-4 flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
            accepted ? "border-primary/60 bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}>
            <input type="checkbox" checked={accepted} onChange={() => setAccepted(!accepted)} className="mt-1 w-4 h-4 accent-primary" />
            <span className="text-sm leading-relaxed">קראנו, הבנו ואנו מאשרים את כל סעיפי ההצהרה <Req /></span>
          </label>
        </div>

        <div className="intake-card-soft">
          <h2 className="text-base font-heading font-semibold mb-1">חתימות ההורים</h2>
          <label className="flex items-center gap-2 text-xs text-muted-foreground mb-3 cursor-pointer">
            <input type="checkbox" checked={singleParent} onChange={() => setSingleParent(!singleParent)}
              className="w-3.5 h-3.5 accent-primary" />
            הורה יחיד / חתימה של הורה אחד בלבד
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1.5">שם האם/האפוטרופוס {!singleParent && <Req />}</label>
                <input className={inputCls} value={v.mother_name} onChange={(e) => set("mother_name", e.target.value)} /></div>
              <SignaturePad label={`חתימת האם/האפוטרופוס${singleParent ? "" : " *"}`} value={v.mother_signature} onChange={(d) => set("mother_signature", d)} />
            </div>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1.5">שם האב/האפוטרופוס {!singleParent && <Req />}</label>
                <input className={inputCls} value={v.father_name} onChange={(e) => set("father_name", e.target.value)} /></div>
              <SignaturePad label={`חתימת האב/האפוטרופוס${singleParent ? "" : " *"}`} value={v.father_signature} onChange={(d) => set("father_signature", d)} />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            מדור "החלטת בית הספר" ימולא על ידי הצוות לאחר בחינת הבקשה, ויופיע בעותק ה-PDF הסופי.
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <button onClick={() => downloadPDF(true)} disabled={pdfBusy}
            className="btn-intake bg-secondary text-secondary-foreground flex items-center justify-center gap-2 disabled:opacity-60">
            {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} תצוגת PDF
          </button>
          <button onClick={submit} disabled={!valid || submitting}
            className={`btn-intake flex-1 flex items-center justify-center gap-2 ${
              valid && !submitting ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> שולח…</> : <><Send className="w-4 h-4" /> שליחת הבקשה</>}
          </button>
        </div>
        {!valid && (
          <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-3.5">
            <p className="text-xs font-semibold text-destructive mb-1">כל השדות המסומנים ב-<Req /> הם שדות חובה. נותר למלא:</p>
            <ul className="text-xs text-destructive/90 list-disc pr-5 space-y-0.5">
              {missing.map((m) => <li key={m}>{m}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShortDayRequestPage;