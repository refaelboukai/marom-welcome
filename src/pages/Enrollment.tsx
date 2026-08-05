import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2, ChevronLeft, ChevronRight, HeartPulse, Loader2, PenLine,
  Send, Shield, Stethoscope, User, Users,
} from "lucide-react";
import logo from "@/assets/logo.jpeg";
import { FORM_STEPS, FormField, SCHOOL_RULES } from "@/data/enrollment-form";
import { FormValues, submitEnrollmentForm } from "@/lib/enrollment";

const DRAFT_KEY = "enrollment_draft_v2";

const ICONS = {
  user: User, users: Users, stethoscope: Stethoscope,
  heart: HeartPulse, shield: Shield, signature: PenLine,
} as const;

const inputCls =
  "w-full bg-background border border-input rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

const Enrollment = () => {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FormValues>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return {};
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(values)); } catch { /* ignore */ }
  }, [values]);

  const set = (key: string, value: FormValues[string]) => setValues((v) => ({ ...v, [key]: value }));

  const visible = (f: FormField) => {
    if (!f.showIf) return true;
    return values[f.showIf.key] === f.showIf.equals;
  };

  const currentStep = FORM_STEPS[step];

  const stepValid = useMemo(() => {
    for (const group of currentStep.groups) {
      for (const f of group.fields) {
        if (!f.required || !visible(f)) continue;
        const v = values[f.key];
        if (f.type === "checkbox") { if (v !== true) return false; }
        else if (typeof v !== "string" || !v.trim()) return false;
      }
    }
    return true;
  }, [currentStep, values]);

  const handleSubmit = async () => {
    setSubmitting(true); setError("");
    const res = await submitEnrollmentForm(values);
    setSubmitting(false);
    if (!res.ok) { setError("אירעה שגיאה בשליחת הטופס. נסו שוב בעוד רגע."); return; }
    localStorage.removeItem(DRAFT_KEY);
    setDone(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderField = (f: FormField) => {
    if (!visible(f)) return null;
    const v = values[f.key];

    if (f.type === "note") {
      return (
        <div key={f.key} className="sm:col-span-2 rounded-xl bg-muted/40 border border-border p-4">
          <ol className="list-decimal pr-5 space-y-2 text-sm leading-relaxed">
            {SCHOOL_RULES.map((r, i) => <li key={i}>{r}</li>)}
          </ol>
        </div>
      );
    }

    if (f.type === "checkbox") {
      return (
        <label key={f.key} className="sm:col-span-2 flex items-start gap-3 p-3 rounded-xl border border-border bg-card cursor-pointer hover:border-primary/40 transition-colors">
          <input type="checkbox" className="mt-1 w-4 h-4 accent-primary" checked={v === true} onChange={() => set(f.key, v !== true)} />
          <span className="text-sm leading-relaxed">{f.label} {f.required && <span className="text-destructive">*</span>}</span>
        </label>
      );
    }

    if (f.type === "yesno" || f.type === "radio") {
      const opts = f.type === "yesno" ? ["כן", "לא"] : (f.options || []);
      return (
        <div key={f.key} className="sm:col-span-2">
          <p className="text-sm font-medium mb-2 leading-relaxed">{f.label} {f.required && <span className="text-destructive">*</span>}</p>
          <div className="flex gap-2">
            {opts.map((o) => (
              <button key={o} type="button" onClick={() => set(f.key, o)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                  v === o ? "bg-primary border-primary text-primary-foreground shadow-md" : "bg-card border-border hover:border-primary/40"
                }`}>
                {o}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (f.type === "checkboxGroup") {
      const arr = Array.isArray(v) ? v : [];
      const toggle = (o: string) => set(f.key, arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o]);
      return (
        <div key={f.key} className="sm:col-span-2">
          <p className="text-sm font-medium mb-2">{f.label}</p>
          <div className="flex flex-wrap gap-2">
            {(f.options || []).map((o) => (
              <button key={o} type="button" onClick={() => toggle(o)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  arr.includes(o) ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-muted-foreground hover:border-primary/40"
                }`}>
                {o}
              </button>
            ))}
          </div>
        </div>
      );
    }

    const label = (
      <label className="block text-sm font-medium mb-1.5">
        {f.label} {f.required && <span className="text-destructive">*</span>}
      </label>
    );

    if (f.type === "textarea") {
      return (
        <div key={f.key} className="sm:col-span-2">
          {label}
          <textarea className={`${inputCls} resize-none`} rows={3} maxLength={1500}
            value={(v as string) || ""} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
        </div>
      );
    }

    if (f.type === "select") {
      return (
        <div key={f.key} className={f.full ? "sm:col-span-2" : ""}>
          {label}
          <select className={inputCls} value={(v as string) || ""} onChange={(e) => set(f.key, e.target.value)}>
            <option value="">בחרו</option>
            {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      );
    }

    const isId = f.key.includes("id_number");
    return (
      <div key={f.key} className={f.full ? "sm:col-span-2" : ""}>
        {label}
        <input
          className={inputCls}
          type={f.type === "date" ? "date" : f.type === "email" ? "email" : "text"}
          inputMode={f.type === "tel" ? "tel" : isId ? "numeric" : undefined}
          maxLength={f.type === "tel" ? 20 : 150}
          value={(v as string) || ""}
          onChange={(e) => set(f.key, isId ? e.target.value.replace(/\D/g, "").slice(0, 9) : e.target.value)}
          placeholder={f.placeholder}
        />
      </div>
    );
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="intake-card-soft max-w-md w-full text-center py-10">
          <CheckCircle2 className="w-14 h-14 text-success mx-auto mb-4" />
          <h1 className="text-xl font-heading font-bold mb-2">הטופס נשלח בהצלחה</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            תודה רבה! טופס הקליטה התקבל במזכירות בית הספר.
            <br />ניצור אתכם קשר בהמשך לצורך השלמת התהליך.
          </p>
        </div>
      </div>
    );
  }

  const StepIcon = ICONS[currentStep.icon];

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <img src={logo} alt="מרום בית אקשטיין" className="h-10 rounded-xl shadow-sm" />
          <div>
            <h1 className="text-base sm:text-lg font-heading font-bold">טופס קליטה לתלמיד/ה חדש/ה</h1>
            <p className="text-[11px] text-muted-foreground">בית ספר מרום — בית אקשטיין יבנה</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-5">
        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
          {FORM_STEPS.map((s, i) => {
            const Icon = ICONS[s.icon];
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
            style={{ width: `${((step + 1) / FORM_STEPS.length) * 100}%` }} />
        </div>

        <div className="space-y-4 animate-fade-in">
          {currentStep.groups.map((group) => (
            <div key={group.key} className="intake-card-soft">
              <h2 className="flex items-center gap-2 text-base font-heading font-semibold mb-1">
                <StepIcon className="w-4 h-4 text-primary" /> {group.title}
              </h2>
              {group.description && (
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{group.description}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                {group.fields.map(renderField)}
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-destructive mt-3">{error}</p>}

        <div className="flex gap-3 mt-5">
          {step > 0 && (
            <button onClick={() => { setStep((s) => s - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="btn-intake bg-secondary text-secondary-foreground flex-1 flex items-center justify-center gap-1">
              <ChevronRight className="w-4 h-4" /> חזרה
            </button>
          )}
          {step < FORM_STEPS.length - 1 ? (
            <button onClick={() => { setStep((s) => s + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} disabled={!stepValid}
              className={`btn-intake flex-1 flex items-center justify-center gap-1 ${stepValid ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
              המשך <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={!stepValid || submitting}
              className={`btn-intake flex-1 flex items-center justify-center gap-2 ${stepValid && !submitting ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> שולח...</> : <><Send className="w-4 h-4" /> שליחת הטופס</>}
            </button>
          )}
        </div>

        {!stepValid && <p className="text-center text-xs text-muted-foreground mt-2">יש למלא את שדות החובה כדי להמשיך</p>}
        <p className="text-center text-[11px] text-muted-foreground mt-3">
          הפרטים נשמרים אצלכם במכשיר עד לשליחה, כך שניתן להשלים את הטופס בהמשך.
        </p>
      </div>
    </div>
  );
};

export default Enrollment;
