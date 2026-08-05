import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, HeartPulse, Home, Loader2, ShieldCheck, User, Users } from "lucide-react";
import logo from "@/assets/logo.jpeg";
import { CONSENT_ITEMS, EnrollmentDraft, submitEnrollmentForm } from "@/lib/enrollment";

const DRAFT_KEY = "enrollment_draft_v1";

const GRADES = ["ז", "ח", "ט", "י", "יא", "יב"];
const FAMILY_STATUS = ["נשואים", "גרושים", "פרודים", "הורה יחיד", "אחר"];
const HEALTH_FUNDS = ["כללית", "מכבי", "מאוחדת", "לאומית", "אחר"];

const STEPS = [
  { key: "student", label: "פרטי התלמיד/ה", icon: User },
  { key: "parents", label: "פרטי ההורים", icon: Users },
  { key: "medical", label: "רקע רפואי", icon: HeartPulse },
  { key: "consents", label: "הצהרות והסכמות", icon: ShieldCheck },
];

const emptyDraft: EnrollmentDraft = {
  student_first_name: "", student_last_name: "", student_id_number: "", birth_date: null,
  gender: "", grade: "", address: "", city: "", student_phone: "", previous_school: "",
  parent1_name: "", parent1_phone: "", parent1_email: "", parent1_id_number: "",
  parent2_name: "", parent2_phone: "", parent2_email: "", family_status: "", siblings: "",
  medical_allergies: "", medical_medications: "", medical_conditions: "", medical_diagnoses: "",
  medical_treatments: "", emergency_contact_name: "", emergency_contact_phone: "", health_fund: "",
  consents: {}, signature_name: "", extra_notes: "",
};

const Field = ({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) => (
  <div>
    <label className="block text-sm font-medium mb-1.5">
      {label} {required && <span className="text-destructive">*</span>}
    </label>
    {children}
  </div>
);

const inputCls =
  "w-full bg-background border border-input rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

const Enrollment = () => {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<EnrollmentDraft>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return { ...emptyDraft, ...JSON.parse(saved) };
    } catch { /* ignore */ }
    return emptyDraft;
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* ignore */ }
  }, [draft]);

  const set = (key: keyof EnrollmentDraft, value: unknown) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const toggleConsent = (key: string) =>
    setDraft((d) => ({ ...d, consents: { ...(d.consents || {}), [key]: !(d.consents || {})[key] } }));

  const stepValid = useMemo(() => {
    if (step === 0) {
      return !!(draft.student_first_name?.trim() && draft.student_last_name?.trim() && draft.student_id_number?.trim() && draft.grade);
    }
    if (step === 1) {
      return !!(draft.parent1_name?.trim() && draft.parent1_phone?.trim());
    }
    if (step === 2) {
      return !!(draft.emergency_contact_name?.trim() && draft.emergency_contact_phone?.trim());
    }
    const requiredOk = CONSENT_ITEMS.filter((c) => c.required).every((c) => (draft.consents || {})[c.key]);
    return requiredOk && !!draft.signature_name?.trim();
  }, [step, draft]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    const res = await submitEnrollmentForm(draft);
    setSubmitting(false);
    if (!res.ok) { setError("אירעה שגיאה בשליחת הטופס. נסו שוב בעוד רגע."); return; }
    localStorage.removeItem(DRAFT_KEY);
    setDone(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="intake-card-soft max-w-md w-full text-center py-10">
          <CheckCircle2 className="w-14 h-14 text-success mx-auto mb-4" />
          <h1 className="text-xl font-heading font-bold mb-2">הטופס נשלח בהצלחה</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            תודה רבה! פרטי הקליטה התקבלו במזכירות בית הספר.
            <br />ניצור אתכם קשר בהמשך לצורך השלמת התהליך.
          </p>
        </div>
      </div>
    );
  }

  const StepIcon = STEPS[step].icon;

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-20 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <img src={logo} alt="מרום בית אקשטיין" className="h-10 rounded-xl shadow-sm" />
          <div>
            <h1 className="text-base sm:text-lg font-heading font-bold">טופס קליטה דיגיטלי</h1>
            <p className="text-[11px] text-muted-foreground">מרום בית אקשטיין — קליטת תלמידים חדשים</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5">
        {/* Steps */}
        <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <button key={s.key} onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  i === step ? "bg-primary text-primary-foreground shadow-md"
                    : i < step ? "bg-success/10 text-success" : "bg-muted/50 text-muted-foreground"
                }`}>
                <Icon className="w-3.5 h-3.5" /> {s.label}
              </button>
            );
          })}
        </div>

        <div className="h-2 bg-muted rounded-full overflow-hidden mb-5">
          <div className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        <div className="intake-card-soft animate-fade-in">
          <h2 className="flex items-center gap-2 text-base font-heading font-semibold mb-4">
            <StepIcon className="w-4.5 h-4.5 text-primary" /> {STEPS[step].label}
          </h2>

          {step === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="שם פרטי" required>
                <input className={inputCls} value={draft.student_first_name || ""} onChange={(e) => set("student_first_name", e.target.value)} maxLength={60} />
              </Field>
              <Field label="שם משפחה" required>
                <input className={inputCls} value={draft.student_last_name || ""} onChange={(e) => set("student_last_name", e.target.value)} maxLength={60} />
              </Field>
              <Field label="תעודת זהות" required>
                <input className={inputCls} inputMode="numeric" value={draft.student_id_number || ""} onChange={(e) => set("student_id_number", e.target.value.replace(/\D/g, "").slice(0, 9))} />
              </Field>
              <Field label="תאריך לידה">
                <input type="date" className={inputCls} value={draft.birth_date || ""} onChange={(e) => set("birth_date", e.target.value || null)} />
              </Field>
              <Field label="מין">
                <select className={inputCls} value={draft.gender || ""} onChange={(e) => set("gender", e.target.value)}>
                  <option value="">בחרו</option>
                  <option value="male">בן</option>
                  <option value="female">בת</option>
                </select>
              </Field>
              <Field label="כיתה" required>
                <select className={inputCls} value={draft.grade || ""} onChange={(e) => set("grade", e.target.value)}>
                  <option value="">בחרו</option>
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="כתובת מגורים">
                <input className={inputCls} value={draft.address || ""} onChange={(e) => set("address", e.target.value)} maxLength={120} />
              </Field>
              <Field label="יישוב">
                <input className={inputCls} value={draft.city || ""} onChange={(e) => set("city", e.target.value)} maxLength={60} />
              </Field>
              <Field label="טלפון התלמיד/ה">
                <input className={inputCls} inputMode="tel" value={draft.student_phone || ""} onChange={(e) => set("student_phone", e.target.value)} maxLength={20} />
              </Field>
              <Field label="בית ספר קודם">
                <input className={inputCls} value={draft.previous_school || ""} onChange={(e) => set("previous_school", e.target.value)} maxLength={120} />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="שם הורה 1" required>
                  <input className={inputCls} value={draft.parent1_name || ""} onChange={(e) => set("parent1_name", e.target.value)} maxLength={80} />
                </Field>
                <Field label="טלפון הורה 1" required>
                  <input className={inputCls} inputMode="tel" value={draft.parent1_phone || ""} onChange={(e) => set("parent1_phone", e.target.value)} maxLength={20} />
                </Field>
                <Field label="דוא״ל הורה 1">
                  <input className={inputCls} type="email" value={draft.parent1_email || ""} onChange={(e) => set("parent1_email", e.target.value)} maxLength={120} />
                </Field>
                <Field label="ת״ז הורה 1">
                  <input className={inputCls} inputMode="numeric" value={draft.parent1_id_number || ""} onChange={(e) => set("parent1_id_number", e.target.value.replace(/\D/g, "").slice(0, 9))} />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-border/60">
                <Field label="שם הורה 2">
                  <input className={inputCls} value={draft.parent2_name || ""} onChange={(e) => set("parent2_name", e.target.value)} maxLength={80} />
                </Field>
                <Field label="טלפון הורה 2">
                  <input className={inputCls} inputMode="tel" value={draft.parent2_phone || ""} onChange={(e) => set("parent2_phone", e.target.value)} maxLength={20} />
                </Field>
                <Field label="דוא״ל הורה 2">
                  <input className={inputCls} type="email" value={draft.parent2_email || ""} onChange={(e) => set("parent2_email", e.target.value)} maxLength={120} />
                </Field>
                <Field label="מצב משפחתי">
                  <select className={inputCls} value={draft.family_status || ""} onChange={(e) => set("family_status", e.target.value)}>
                    <option value="">בחרו</option>
                    {FAMILY_STATUS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="אחים ואחיות (שמות וגילאים)">
                <textarea className={`${inputCls} resize-none`} rows={3} value={draft.siblings || ""} onChange={(e) => set("siblings", e.target.value)} maxLength={500} />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="אלרגיות">
                  <textarea className={`${inputCls} resize-none`} rows={2} value={draft.medical_allergies || ""} onChange={(e) => set("medical_allergies", e.target.value)} maxLength={500} placeholder="אם אין — כתבו: אין" />
                </Field>
                <Field label="תרופות קבועות">
                  <textarea className={`${inputCls} resize-none`} rows={2} value={draft.medical_medications || ""} onChange={(e) => set("medical_medications", e.target.value)} maxLength={500} />
                </Field>
                <Field label="מצבים רפואיים / הגבלות">
                  <textarea className={`${inputCls} resize-none`} rows={2} value={draft.medical_conditions || ""} onChange={(e) => set("medical_conditions", e.target.value)} maxLength={500} />
                </Field>
                <Field label="אבחונים קיימים">
                  <textarea className={`${inputCls} resize-none`} rows={2} value={draft.medical_diagnoses || ""} onChange={(e) => set("medical_diagnoses", e.target.value)} maxLength={500} />
                </Field>
              </div>
              <Field label="טיפולים נוכחיים (רגשי, פארא-רפואי וכו')">
                <textarea className={`${inputCls} resize-none`} rows={2} value={draft.medical_treatments || ""} onChange={(e) => set("medical_treatments", e.target.value)} maxLength={500} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="איש קשר לחירום" required>
                  <input className={inputCls} value={draft.emergency_contact_name || ""} onChange={(e) => set("emergency_contact_name", e.target.value)} maxLength={80} />
                </Field>
                <Field label="טלפון לחירום" required>
                  <input className={inputCls} inputMode="tel" value={draft.emergency_contact_phone || ""} onChange={(e) => set("emergency_contact_phone", e.target.value)} maxLength={20} />
                </Field>
                <Field label="קופת חולים">
                  <select className={inputCls} value={draft.health_fund || ""} onChange={(e) => set("health_fund", e.target.value)}>
                    <option value="">בחרו</option>
                    {HEALTH_FUNDS.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </Field>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">אנא קראו ואשרו את הסעיפים הבאים. סעיפים המסומנים בכוכבית הם חובה.</p>
              <div className="space-y-2">
                {CONSENT_ITEMS.map((c) => (
                  <label key={c.key} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card cursor-pointer hover:border-primary/40 transition-colors">
                    <input type="checkbox" className="mt-1 w-4 h-4 accent-current text-primary"
                      checked={!!(draft.consents || {})[c.key]} onChange={() => toggleConsent(c.key)} />
                    <span className="text-sm leading-relaxed">
                      {c.label} {c.required && <span className="text-destructive">*</span>}
                    </span>
                  </label>
                ))}
              </div>
              <Field label="הערות נוספות">
                <textarea className={`${inputCls} resize-none`} rows={3} value={draft.extra_notes || ""} onChange={(e) => set("extra_notes", e.target.value)} maxLength={1000} />
              </Field>
              <Field label="חתימה דיגיטלית — שם ההורה החותם" required>
                <input className={inputCls} value={draft.signature_name || ""} onChange={(e) => set("signature_name", e.target.value)} maxLength={80} placeholder="שם מלא" />
              </Field>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-5">
          {step > 0 && (
            <button onClick={() => { setStep((s) => s - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="btn-intake bg-secondary text-secondary-foreground flex-1 flex items-center justify-center gap-1">
              <ChevronRight className="w-4 h-4" /> חזרה
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={() => { setStep((s) => s + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} disabled={!stepValid}
              className={`btn-intake flex-1 flex items-center justify-center gap-1 ${stepValid ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
              המשך <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={!stepValid || submitting}
              className={`btn-intake flex-1 flex items-center justify-center gap-2 ${stepValid && !submitting ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> שולח...</> : <><Home className="w-4 h-4" /> שליחת הטופס</>}
            </button>
          )}
        </div>

        {!stepValid && (
          <p className="text-center text-xs text-muted-foreground mt-2">יש למלא את שדות החובה כדי להמשיך</p>
        )}
        <p className="text-center text-[11px] text-muted-foreground mt-3">הפרטים נשמרים אצלכם במכשיר עד לשליחה, כך שניתן להשלים את הטופס בהמשך.</p>
      </div>
    </div>
  );
};

export default Enrollment;
