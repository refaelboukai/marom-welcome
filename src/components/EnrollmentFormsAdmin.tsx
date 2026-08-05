import { useEffect, useState } from "react";
import { Copy, FileText, Loader2, Printer, Trash2, X } from "lucide-react";
import { FORM_STEPS } from "@/data/enrollment-form";
import {
  ENROLLMENT_STATUS_LABELS, EnrollmentForm, deleteEnrollmentForm,
  flattenForm, getEnrollmentForms, updateEnrollmentStatus,
} from "@/lib/enrollment";

const display = (v: unknown): string => {
  if (v === true) return "כן";
  if (v === false || v == null || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  return String(v);
};

const EnrollmentFormsAdmin = () => {
  const [forms, setForms] = useState<EnrollmentForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EnrollmentForm | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { getEnrollmentForms().then((d) => { setForms(d); setLoading(false); }); }, []);

  const link = `${window.location.origin}/enroll`;

  const handleStatus = async (f: EnrollmentForm, status: string) => {
    await updateEnrollmentStatus(f.id, status);
    setForms((prev) => prev.map((x) => (x.id === f.id ? { ...x, status } : x)));
    setSelected((s) => (s && s.id === f.id ? { ...s, status } : s));
  };

  const handleDelete = async (f: EnrollmentForm) => {
    if (!confirm(`למחוק את טופס הקליטה של ${f.student_first_name} ${f.student_last_name}?`)) return;
    await deleteEnrollmentForm(f.id);
    setForms((prev) => prev.filter((x) => x.id !== f.id));
    setSelected(null);
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const values = selected ? flattenForm(selected) : {};

  return (
    <div className="space-y-4">
      <div className="intake-card-soft flex flex-wrap items-center gap-3">
        <FileText className="w-5 h-5 text-primary" />
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-medium">קישור לטופס הקליטה הדיגיטלי</p>
          <p className="text-xs text-muted-foreground break-all">{link}</p>
        </div>
        <button onClick={() => { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="btn-intake bg-primary/10 text-primary text-xs px-3 py-2 gap-1 hover:bg-primary/20 inline-flex items-center">
          <Copy className="w-3.5 h-3.5" /> {copied ? "הועתק ✓" : "העתקת קישור"}
        </button>
      </div>

      {forms.length === 0 ? (
        <div className="intake-card-soft text-center py-10 text-sm text-muted-foreground">עדיין לא התקבלו טפסי קליטה.</div>
      ) : (
        <div className="intake-card-soft overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-right p-3">תלמיד/ה</th>
                <th className="text-right p-3">כיתה</th>
                <th className="text-right p-3">שנה"ל</th>
                <th className="text-right p-3">הורה</th>
                <th className="text-right p-3">טלפון</th>
                <th className="text-right p-3">תאריך</th>
                <th className="text-right p-3">סטטוס</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {forms.map((f) => (
                <tr key={f.id} className="border-t border-border/60 hover:bg-muted/20 cursor-pointer" onClick={() => setSelected(f)}>
                  <td className="p-3 font-medium">{f.student_first_name} {f.student_last_name}</td>
                  <td className="p-3">{f.grade || "—"}</td>
                  <td className="p-3">{f.academic_year || "—"}</td>
                  <td className="p-3">{f.parent1_name || "—"}</td>
                  <td className="p-3" dir="ltr">{f.parent1_phone || "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString("he-IL")}</td>
                  <td className="p-3">
                    <span className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary">
                      {ENROLLMENT_STATUS_LABELS[f.status] || f.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(f); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setSelected(null)}>
          <div className="bg-card rounded-2xl shadow-xl max-w-3xl w-full my-8 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-heading font-bold">
                טופס קליטה — {selected.student_first_name} {selected.student_last_name}
              </h3>
              <div className="flex items-center gap-1">
                <button onClick={() => window.print()} className="p-1.5 rounded-lg hover:bg-muted" title="הדפסה"><Printer className="w-4 h-4" /></button>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="space-y-5 max-h-[68vh] overflow-y-auto pl-1">
              {FORM_STEPS.map((s) => (
                <div key={s.key}>
                  <h4 className="text-sm font-heading font-bold text-primary mb-2">{s.label}</h4>
                  {s.groups.map((g) => (
                    <div key={g.key} className="mb-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">{g.title}</p>
                      {g.fields.filter((f) => f.type !== "note").map((f) => (
                        <div key={f.key} className="flex gap-2 text-sm py-1 border-b border-border/50">
                          <span className="text-muted-foreground w-64 flex-shrink-0 text-xs">{f.label}</span>
                          <span className="font-medium break-words">{display(values[f.key])}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
              <div className="flex gap-2 text-sm py-1">
                <span className="text-muted-foreground w-64 flex-shrink-0 text-xs">תאריך חתימה</span>
                <span className="font-medium">
                  {selected.signature_date ? new Date(selected.signature_date).toLocaleString("he-IL") : "—"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
              {Object.entries(ENROLLMENT_STATUS_LABELS).map(([key, label]) => (
                <button key={key} onClick={() => handleStatus(selected, key)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    selected.status === key ? "bg-primary text-primary-foreground shadow-md" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}>
                  {label}
                </button>
              ))}
              <button onClick={() => handleDelete(selected)}
                className="mr-auto btn-intake bg-destructive/10 text-destructive text-xs px-3 py-2 gap-1 hover:bg-destructive/20 inline-flex items-center">
                <Trash2 className="w-3.5 h-3.5" /> מחיקה
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnrollmentFormsAdmin;
