import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, ChevronRight, Download, FileText, Loader2, School, Send } from "lucide-react";
import logo from "@/assets/logo.jpeg";
import moeLogo from "@/assets/moe-state.png";
import SignaturePad from "@/components/SignaturePad";
import { ACADEMIC_YEAR } from "@/lib/short-day";
import {
  InclusionConsent as IC, RETURN_DESTINATIONS,
  generateInclusionConsentPDF, submitInclusionConsent,
} from "@/lib/inclusion-consent";
import {
  getInclusionInviteByToken, markInclusionInviteSubmitted, saveInclusionDraft,
} from "@/lib/inclusion-invites";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl border-2 border-border bg-card text-sm focus:outline-none focus:border-primary/60 transition-colors";

const Req = () => <span className="text-destructive font-bold">*</span>;
const today = () => new Date().toISOString().split("T")[0];

const InclusionConsentPage = () => {
  const [v, setV] = useState({
    request_date: today(),
    student_name: "",
    birth_date: "",
    student_id_number: "",
    grade: "",
    school_name: "מרום — בית אקשטיין יבנה",
    receiving_school: "שחקים, יבנה",
    inclusion_day: "ראשון",
    inclusion_hours: "09:00–12:00",
    start_date: "",
    arrival_notes: "התלמיד/ה יגיע/תגיע באופן עצמאי לבית הספר הקולט",
    return_destination: "",
    parent1_name: "",
    parent1_phone: "",
    parent1_signature: "",
    parent2_name: "",
    parent2_phone: "",
    parent2_signature: "",
  });
  const [singleParent, setSingleParent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);

  const set = (k: keyof typeof v, val: string) => setV((p) => ({ ...p, [k]: val }));

  const missing: string[] = [];
  if (!v.request_date) missing.push("תאריך");
  if (!v.student_name.trim()) missing.push("שם התלמיד/ה");
  if (!v.birth_date) missing.push("תאריך לידה");
  if (v.student_id_number.trim().length !== 9) missing.push("ת.ז. התלמיד/ה (9 ספרות)");
  if (!v.grade.trim()) missing.push("כיתה");
  if (!v.receiving_school.trim()) missing.push("בית הספר הקולט");
  if (!v.inclusion_day.trim()) missing.push("יום השילוב");
  if (!v.inclusion_hours.trim()) missing.push("שעות השילוב");
  if (!v.start_date) missing.push("תאריך תחילת השילוב");
  if (!v.return_destination) missing.push("יעד החזרה (יש לסמן אפשרות אחת)");
  if (singleParent) {
    if (!v.parent1_name.trim() && !v.parent2_name.trim()) missing.push("שם ההורה/אפוטרופוס");
    if (!v.parent1_signature && !v.parent2_signature) missing.push("חתימת ההורה/אפוטרופוס");
  } else {
    if (!v.parent1_name.trim()) missing.push("שם הורה/אפוטרופוס");
    if (!v.parent1_signature) missing.push("חתימת הורה/אפוטרופוס");
    if (!v.parent2_name.trim()) missing.push("שם הורה/אפוטרופוס נוסף");
    if (!v.parent2_signature) missing.push("חתימת הורה/אפוטרופוס נוסף");
  }
  const valid = missing.length === 0;

  const record = (): IC => ({
    id: "", academic_year: ACADEMIC_YEAR,
    request_date: v.request_date || null,
    student_name: v.student_name, birth_date: v.birth_date || null,
    student_id_number: v.student_id_number, grade: v.grade,
    school_name: v.school_name, receiving_school: v.receiving_school,
    inclusion_day: v.inclusion_day, inclusion_hours: v.inclusion_hours,
    start_date: v.start_date || null, arrival_notes: v.arrival_notes,
    return_destination: v.return_destination,
    parent1_name: v.parent1_name, parent1_phone: v.parent1_phone,
    parent1_signature: v.parent1_signature, parent1_sign_date: v.parent1_signature ? today() : null,
    parent2_name: v.parent2_name, parent2_phone: v.parent2_phone,
    parent2_signature: v.parent2_signature, parent2_sign_date: v.parent2_signature ? today() : null,
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
      await generateInclusionConsentPDF(record(), { targetWindow: win, compact });
    } catch (e) {
      console.error("inclusion pdf failed", e);
      win?.close();
    } finally { setPdfBusy(false); }
  };

  const submit = async () => {
    setSubmitting(true); setError("");
    try {
      const r = record();
      const { id: _id, created_at: _c, updated_at: _u, ...payload } = r;
      const res = await submitInclusionConsent(payload);
      if (!res.ok) {
        console.error("inclusion submit failed", res.error);
        setError(`אירעה שגיאה בשליחת הטופס: ${res.error || "נסו שוב בעוד רגע"}`);
        return;
      }
    } catch (e: any) {
      console.error("inclusion submit exception", e);
      setError(`אירעה שגיאה בשליחת הטופס: ${e?.message || "נסו שוב בעוד רגע"}`);
      return;
    } finally {
      setSubmitting(false);
    }
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
          <h1 className="text-xl font-heading font-bold mb-2">האישור נשלח בהצלחה</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            אישור ההורים לשילוב הלימודי של {v.student_name} התקבל בבית הספר.
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
            <h1 className="font-heading font-bold text-base leading-tight">אישור הורים — שילוב לימודי בבית ספר {v.receiving_school}</h1>
            <p className="text-[11px] text-muted-foreground">בית ספר מרום — בית אקשטיין יבנה · שנת הלימודים {ACADEMIC_YEAR}</p>
          </div>
          <img src={moeLogo} alt="משרד החינוך" loading="lazy" className="h-9 w-auto object-contain" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-5 space-y-4">
        <Link to="/forms" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
          <ChevronRight className="w-3.5 h-3.5" /> כל הטפסים הדיגיטליים
        </Link>

        <div className="intake-card-soft text-sm leading-relaxed text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground">הורים יקרים,</p>
          <p>
            כחלק מרצוננו לקדם את ילדכם/ן, לטפח את יכולותיו/ה ולהרחיב את הזדמנויותיו/ה הלימודיות והחברתיות, אנו מבקשים את הסכמתכם להתחלת תהליך שילוב לימודי בבית הספר הקולט, במסגרת החינוך הרגיל.
          </p>
          <p>
            התהליך נועד לאפשר התנסות בסביבה לימודית נוספת, לחזק עצמאות ותחושת מסוגלות ולעודד התפתחות אישית. השילוב ילווה בקשר בין צוותי בתי הספר ובשיתוף עמכם, תוך מעקב והתאמה לצרכי התלמיד/ה.
          </p>
        </div>

        <div className="intake-card-soft">
          <h2 className="flex items-center gap-2 text-base font-heading font-semibold mb-3">
            <FileText className="w-4 h-4 text-primary" /> פרטי התלמיד/ה
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1.5">תאריך <Req /></label>
              <input type="date" className={inputCls} value={v.request_date} onChange={(e) => set("request_date", e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-1.5">שם התלמיד/ה <Req /></label>
              <input className={inputCls} value={v.student_name} onChange={(e) => set("student_name", e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-1.5">תאריך לידה <Req /></label>
              <input type="date" className={inputCls} value={v.birth_date} onChange={(e) => set("birth_date", e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-1.5">ת.ז. התלמיד/ה <Req /></label>
              <input className={inputCls} inputMode="numeric" value={v.student_id_number}
                onChange={(e) => set("student_id_number", e.target.value.replace(/\D/g, "").slice(0, 9))} /></div>
            <div><label className="block text-sm font-medium mb-1.5">כיתה <Req /></label>
              <input className={inputCls} value={v.grade} onChange={(e) => set("grade", e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-1.5">בית הספר</label>
              <input className={inputCls} value={v.school_name} onChange={(e) => set("school_name", e.target.value)} /></div>
          </div>
        </div>

        <div className="intake-card-soft">
          <h2 className="flex items-center gap-2 text-base font-heading font-semibold mb-3">
            <School className="w-4 h-4 text-primary" /> פרטי השילוב
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1.5">בית הספר הקולט <Req /></label>
              <input className={inputCls} value={v.receiving_school} onChange={(e) => set("receiving_school", e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-1.5">יום השילוב <Req /></label>
              <select className={inputCls} value={v.inclusion_day} onChange={(e) => set("inclusion_day", e.target.value)}>
                {["ראשון", "שני", "שלישי", "רביעי", "חמישי"].map((d) => <option key={d} value={d}>{d}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium mb-1.5">שעות השילוב <Req /></label>
              <input className={inputCls} value={v.inclusion_hours} onChange={(e) => set("inclusion_hours", e.target.value)} placeholder="09:00–12:00" /></div>
            <div><label className="block text-sm font-medium mb-1.5">תאריך תחילת השילוב <Req /></label>
              <input type="date" className={inputCls} value={v.start_date} onChange={(e) => set("start_date", e.target.value)} /></div>
            <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1.5">הסדרי הגעה</label>
              <input className={inputCls} value={v.arrival_notes} onChange={(e) => set("arrival_notes", e.target.value)} /></div>
          </div>
        </div>

        <div className="intake-card-soft">
          <h2 className="text-base font-heading font-semibold mb-2">אישור הורים / אפוטרופוסים</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            אנו מאשרים את הגעתו/ה העצמאית של התלמיד/ה לבית הספר הקולט ואת יציאתו/ה העצמאית ממנו בתום הפעילות, ליעד המסומן להלן (יש לסמן אפשרות אחת) <Req />:
          </p>
          <div className="flex flex-col gap-2 mb-3">
            {Object.entries(RETURN_DESTINATIONS).map(([k, label]) => (
              <label key={k} className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                v.return_destination === k ? "border-primary/60 bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}>
                <input type="radio" name="return_destination" checked={v.return_destination === k}
                  onChange={() => set("return_destination", k)} className="w-4 h-4 accent-primary" />
                <span className="text-sm font-medium">{label}</span>
              </label>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            כל שינוי ביעד החזרה או בהסדרי ההגעה והיציאה יימסר בכתב לצוות בית ספר מרום ויתואם עמו מראש.
          </p>
        </div>

        <div className="intake-card-soft">
          <h2 className="text-base font-heading font-semibold mb-1">חתימות ההורים / האפוטרופוסים</h2>
          <label className="flex items-center gap-2 text-xs text-muted-foreground mb-3 cursor-pointer">
            <input type="checkbox" checked={singleParent} onChange={() => setSingleParent(!singleParent)}
              className="w-3.5 h-3.5 accent-primary" />
            הורה יחיד / חתימה של הורה אחד בלבד
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1.5">שם הורה/אפוטרופוס {!singleParent && <Req />}</label>
                <input className={inputCls} value={v.parent1_name} onChange={(e) => set("parent1_name", e.target.value)} /></div>
              <div><label className="block text-sm font-medium mb-1.5">טלפון</label>
                <input className={inputCls} inputMode="tel" value={v.parent1_phone} onChange={(e) => set("parent1_phone", e.target.value)} /></div>
              <SignaturePad label={`חתימת הורה/אפוטרופוס${singleParent ? "" : " *"}`} value={v.parent1_signature} onChange={(d) => set("parent1_signature", d)} />
            </div>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1.5">שם הורה/אפוטרופוס נוסף {!singleParent && <Req />}</label>
                <input className={inputCls} value={v.parent2_name} onChange={(e) => set("parent2_name", e.target.value)} /></div>
              <div><label className="block text-sm font-medium mb-1.5">טלפון</label>
                <input className={inputCls} inputMode="tel" value={v.parent2_phone} onChange={(e) => set("parent2_phone", e.target.value)} /></div>
              <SignaturePad label={`חתימת הורה/אפוטרופוס נוסף${singleParent ? "" : " *"}`} value={v.parent2_signature} onChange={(d) => set("parent2_signature", d)} />
            </div>
          </div>
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
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> שולח…</> : <><Send className="w-4 h-4" /> שליחת האישור</>}
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

export default InclusionConsentPage;
