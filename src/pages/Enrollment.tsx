import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import {
  Check, CheckCircle2, ChevronLeft, ChevronRight, Cloud, Download, HeartPulse,
  FileText, Loader2, PenLine, RotateCcw, Send, Shield, Stethoscope, Trash2, Upload, User, Users,
} from "lucide-react";
import logo from "@/assets/logo.jpeg";
import { FORM_STEPS, FormField, SCHOOL_RULES } from "@/data/enrollment-form";
import { FormValues, submitEnrollmentForm } from "@/lib/enrollment";
import { generateEnrollmentPDF } from "@/lib/enrollment-pdf";
import { MAX_UPLOAD_MB, fileNameFromPath, openEnrollmentDoc, uploadEnrollmentDoc } from "@/lib/enrollment-uploads";
import {
  EnrollmentInvite, PARENT_ROLE_LABELS, getInviteByToken, markInviteSubmitted, saveInviteDraft,
} from "@/lib/enrollment-invites";

const DRAFT_KEY = "enrollment_draft_v2";

const ICONS = {
  user: User, users: Users, stethoscope: Stethoscope,
  heart: HeartPulse, shield: Shield, signature: PenLine,
} as const;

const inputCls =
  "w-full bg-background border border-input rounded-xl p-2.5 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";

/* ---------- file upload field ---------- */
const SignatureField = ({
  field, value, onChange,
}: {
  field: FormField;
  value: string;
  onChange: (dataUrl: string) => void;
}) => {
  const ref = useRef<SignatureCanvas | null>(null);

  return (
    <div className="sm:col-span-2">
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium">
          {field.label} {field.required && <span className="text-destructive">*</span>}
        </label>
        <button type="button"
          onClick={() => { ref.current?.clear(); onChange(""); }}
          className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground">
          <RotateCcw className="w-3 h-3" /> נקה
        </button>
      </div>

      {value ? (
        <div className="border-2 border-border rounded-xl bg-card p-2">
          <img src={value} alt="חתימה" className="w-full h-[150px] object-contain" />
        </div>
      ) : (
        <div className="border-2 border-dashed border-border rounded-xl bg-card overflow-hidden" style={{ touchAction: "none" }}>
          <SignatureCanvas
            ref={ref}
            penColor="#1a1a2e"
            canvasProps={{ width: 500, height: 150, className: "w-full", style: { width: "100%", height: "150px" } }}
            onEnd={() => {
              const c = ref.current;
              if (c && !c.isEmpty()) onChange(c.toDataURL("image/png"));
            }}
          />
        </div>
      )}
      {value
        ? <p className="text-xs text-success flex items-center gap-1 mt-1.5"><Check className="w-3 h-3" /> חתימה התקבלה</p>
        : <p className="text-xs text-muted-foreground mt-1.5">חתמו באצבע או בעכבר בתוך המסגרת</p>}
    </div>
  );
};

const FileUploadField = ({
  field, paths, folder, onChange,
}: {
  field: FormField;
  paths: string[];
  folder: string;
  onChange: (paths: string[]) => void;
}) => {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); setErr("");
    const next = [...paths];
    for (const file of Array.from(files)) {
      const res = await uploadEnrollmentDoc(file, field.key, folder);
      if (res.ok && res.path) {
        if (field.multiple) next.push(res.path);
        else next.splice(0, next.length, res.path);
      } else setErr(res.error || "העלאת הקובץ נכשלה");
    }
    onChange(next);
    setBusy(false);
  };

  return (
    <div className="sm:col-span-2">
      <label className="block text-sm font-medium mb-1.5">
        {field.label} {field.required && <span className="text-destructive">*</span>}
      </label>

      <label className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-input bg-muted/20 text-sm text-muted-foreground cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
        {busy ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Upload className="w-4 h-4 text-primary" />}
        <span>{busy ? "מעלה…" : `לחצו לצילום או בחירת קובץ (עד ${MAX_UPLOAD_MB}MB)`}</span>
        <input type="file" className="sr-only" accept={field.accept} multiple={field.multiple}
          disabled={busy} onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
      </label>

      {err && <p className="text-xs text-destructive mt-1.5">{err}</p>}

      {paths.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {paths.map((p) => (
            <li key={p} className="flex items-center gap-2 text-xs bg-card border border-border rounded-xl px-3 py-2">
              <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <button type="button" onClick={() => openEnrollmentDoc(p)} className="flex-1 text-right truncate hover:underline">
                {fileNameFromPath(p)}
              </button>
              <span className="text-success flex items-center gap-1"><Check className="w-3 h-3" /> הועלה</span>
              <button type="button" onClick={() => onChange(paths.filter((x) => x !== p))}
                className="p-1 rounded-lg hover:bg-destructive/10 text-destructive" title="הסרה">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const Enrollment = () => {
  const [params] = useSearchParams();
  const token = params.get("t") || "";

  const [loading, setLoading] = useState(!!token);
  const [invite, setInvite] = useState<EnrollmentInvite | null>(null);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FormValues>(() => {
    if (token) return {};
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return {};
  });
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const hydrated = useRef(!token);

  /* ---------- load personal invite ---------- */
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getInviteByToken(token).then((inv) => {
      if (cancelled) return;
      if (inv) {
        setInvite(inv);
        setValues(inv.draft_data || {});
        setStep(Math.min(inv.current_step || 0, FORM_STEPS.length - 1));
        if (inv.status === "submitted") setDone(true);
      }
      hydrated.current = true;
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [token]);

  /* ---------- autosave ---------- */
  useEffect(() => {
    if (!hydrated.current || done) return;
    try { localStorage.setItem(token ? `${DRAFT_KEY}_${token}` : DRAFT_KEY, JSON.stringify(values)); } catch { /* ignore */ }
    if (!token) return;
    setSaving("saving");
    const id = setTimeout(async () => {
      await saveInviteDraft(token, values, step);
      setSaving("saved");
    }, 700);
    return () => clearTimeout(id);
  }, [values, step, token, done]);

  const set = (key: string, value: FormValues[string]) => setValues((v) => ({ ...v, [key]: value }));

  const visible = useCallback((f: FormField) => {
    if (!f.showIf) return true;
    return values[f.showIf.key] === f.showIf.equals;
  }, [values]);

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
  }, [currentStep, values, visible]);

  const studentName = `${values.student_first_name || ""} ${values.student_last_name || ""}`.trim() || invite?.student_name || "";

  const goTo = (i: number) => { setStep(i); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const handleSubmit = async () => {
    setSubmitting(true); setError("");
    const filled: FormValues = { ...values, filled_at: new Date().toISOString() };
    setValues(filled);
    const res = await submitEnrollmentForm(filled, {
      invite_token: token,
      pair_id: invite?.pair_id || null,
      parent_role: invite?.parent_role || "parent1",
    });
    if (!res.ok) { setSubmitting(false); setError("אירעה שגיאה בשליחת הטופס. נסו שוב בעוד רגע."); return; }
    if (token) await markInviteSubmitted(token, res.id || null);
    localStorage.removeItem(token ? `${DRAFT_KEY}_${token}` : DRAFT_KEY);
    setSubmitting(false);
    setDone(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ---------- field renderer ---------- */
  const renderField = (f: FormField) => {
    if (!visible(f)) return null;
    const v = values[f.key];

    if (f.type === "note") {
      return (
        <div key={f.key} className="sm:col-span-2 rounded-2xl bg-muted/40 border border-border p-4">
          <ol className="list-decimal pr-5 space-y-2 text-sm leading-relaxed">
            {SCHOOL_RULES.map((r, i) => <li key={i}>{r}</li>)}
          </ol>
        </div>
      );
    }

    if (f.type === "signature") {
      return (
        <SignatureField key={f.key} field={f} value={typeof v === "string" ? v : ""}
          onChange={(d) => set(f.key, d)} />
      );
    }

    if (f.type === "file") {
      const paths = Array.isArray(v) ? v : typeof v === "string" && v ? [v] : [];
      return (
        <FileUploadField key={f.key} field={f} paths={paths}
          folder={token || values.student_id_number as string || "public"}
          onChange={(next) => set(f.key, next)} />
      );
    }

    if (f.type === "checkbox") {
      const on = v === true;
      return (
        <label key={f.key}
          className={`sm:col-span-2 flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
            on ? "border-primary/60 bg-primary/5" : "border-border bg-card hover:border-primary/30"
          }`}>
          <span className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border-2 transition-all ${
            on ? "bg-primary border-primary text-primary-foreground" : "border-input bg-background"
          }`}>{on && <Check className="w-3.5 h-3.5" />}</span>
          <input type="checkbox" className="sr-only" checked={on} onChange={() => set(f.key, !on)} />
          <span className="text-sm leading-relaxed">{f.label} {f.required && <span className="text-destructive">*</span>}</span>
        </label>
      );
    }

    if (f.type === "yesno" || f.type === "radio") {
      const opts = f.type === "yesno" ? ["כן", "לא"] : (f.options || []);
      return (
        <div key={f.key} className="sm:col-span-2">
          <p className="text-sm font-medium mb-2 leading-relaxed">{f.label} {f.required && <span className="text-destructive">*</span>}</p>
          <div className="flex flex-wrap gap-2">
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

  /* ---------- states ---------- */
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center px-4">
        <div className="intake-card-soft max-w-md w-full text-center py-10">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-success" />
          </div>
          <h1 className="text-xl font-heading font-bold mb-2">הטופס נשלח בהצלחה</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            תודה רבה! טופס הקליטה של {studentName || "התלמיד/ה"} התקבל במזכירות בית הספר.
            <br />ניצור אתכם קשר בהמשך להשלמת התהליך.
          </p>
          <button onClick={() => generateEnrollmentPDF(values, studentName, invite ? `מולא על ידי ${invite.parent_name}` : "")}
            className="btn-intake bg-primary text-primary-foreground shadow-md inline-flex items-center gap-2 mx-auto">
            <Download className="w-4 h-4" /> הורדת עותק PDF
          </button>
        </div>
      </div>
    );
  }

  const StepIcon = ICONS[currentStep.icon];
  const pct = ((step + 1) / FORM_STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background pb-14">
      {/* header */}
      <div className="bg-card/95 backdrop-blur border-b border-border px-4 py-3 sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <img src={logo} alt="מרום בית אקשטיין" className="h-10 rounded-xl shadow-sm" />
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-heading font-bold truncate">טופס קליטה לתלמיד/ה חדש/ה</h1>
            <p className="text-[11px] text-muted-foreground truncate">
              בית ספר מרום — בית אקשטיין יבנה
              {invite && ` · ${invite.parent_name} (${PARENT_ROLE_LABELS[invite.parent_role]})`}
            </p>
          </div>
          {token && (
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground">
              {saving === "saving" ? <><Loader2 className="w-3 h-3 animate-spin" /> שומר…</> : <><Cloud className="w-3 h-3 text-success" /> נשמר</>}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-5">
        {invite && (
          <div className="intake-card-soft mb-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="font-semibold text-sm">{invite.student_name}</span>
            {invite.grade && <span className="text-muted-foreground">כיתה {invite.grade}</span>}
            {invite.family_status === "divorced" && (
              <span className="px-2 py-0.5 rounded-lg bg-accent/15 text-accent-foreground">טופס נפרד לכל הורה</span>
            )}
            <span className="text-muted-foreground mr-auto">התשובות נשמרות אוטומטית — אפשר לעצור ולחזור בהמשך</span>
          </div>
        )}

        {/* progress tracker */}
        <div className="intake-card-soft mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">עמוד {step + 1} מתוך {FORM_STEPS.length} — {currentStep.label}</p>
            <span className="text-xs font-bold text-primary">{Math.round(pct)}%</span>
          </div>

          <div className="relative">
            <div className="absolute top-4 right-4 left-4 h-1 bg-muted rounded-full" />
            <div className="absolute top-4 right-4 h-1 bg-primary rounded-full transition-all duration-500"
              style={{ width: `calc((100% - 2rem) * ${step / (FORM_STEPS.length - 1)})` }} />
            <div className="relative flex justify-between">
              {FORM_STEPS.map((s, i) => {
                const Icon = ICONS[s.icon];
                const state = i < step ? "done" : i === step ? "active" : "todo";
                return (
                  <button key={s.key} onClick={() => i < step && goTo(i)} disabled={i > step}
                    className="flex flex-col items-center gap-1.5 w-[16%]">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                      state === "done" ? "bg-success text-success-foreground border-success"
                        : state === "active" ? "bg-primary text-primary-foreground border-primary scale-110 shadow-md"
                        : "bg-card text-muted-foreground border-border"
                    }`}>
                      {state === "done" ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </span>
                    <span className={`text-[10px] leading-tight text-center ${
                      state === "active" ? "text-primary font-bold" : "text-muted-foreground"
                    }`}>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* step content */}
        <div className="space-y-4 animate-fade-in" key={currentStep.key}>
          {currentStep.groups.map((group) => (
            <div key={group.key} className="intake-card-soft">
              <h2 className="flex items-center gap-2 text-base font-heading font-semibold mb-1">
                <span className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center">
                  <StepIcon className="w-4 h-4 text-primary" />
                </span>
                {group.title}
              </h2>
              {group.description && (
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{group.description}</p>
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
            <button onClick={() => goTo(step - 1)}
              className="btn-intake bg-secondary text-secondary-foreground flex-1 flex items-center justify-center gap-1">
              <ChevronRight className="w-4 h-4" /> חזרה
            </button>
          )}
          {step < FORM_STEPS.length - 1 ? (
            <button onClick={() => goTo(step + 1)} disabled={!stepValid}
              className={`btn-intake flex-[2] flex items-center justify-center gap-1 ${stepValid ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
              המשך <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={!stepValid || submitting}
              className={`btn-intake flex-[2] flex items-center justify-center gap-2 ${stepValid && !submitting ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> שולח...</> : <><Send className="w-4 h-4" /> שליחת הטופס</>}
            </button>
          )}
        </div>

        {!stepValid && <p className="text-center text-xs text-muted-foreground mt-2">יש למלא את שדות החובה כדי להמשיך</p>}
        <p className="text-center text-[11px] text-muted-foreground mt-3">
          {token ? "הטופס נשמר בענן — אפשר לסגור ולחזור מאוחר יותר מאותו קישור ומכל מכשיר."
                 : "הפרטים נשמרים במכשיר עד לשליחה, כך שניתן להשלים את הטופס בהמשך."}
        </p>
      </div>
    </div>
  );
};

export default Enrollment;
