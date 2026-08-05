import { useEffect, useState } from "react";
import { Copy, FileText, Loader2, Trash2, X } from "lucide-react";
import {
  CONSENT_ITEMS, ENROLLMENT_STATUS_LABELS, EnrollmentForm,
  deleteEnrollmentForm, getEnrollmentForms, updateEnrollmentStatus,
} from "@/lib/enrollment";

const Row = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="flex gap-2 text-sm py-1 border-b border-border/50">
    <span className="text-muted-foreground w-44 flex-shrink-0">{label}</span>
    <span className="font-medium break-words">{value?.trim() ? value : "—"}</span>
  </div>
);

const EnrollmentFormsAdmin = () => {
  const [forms, setForms] = useState<EnrollmentForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EnrollmentForm | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => { setForms(await getEnrollmentForms()); setLoading(false); };
  useEffect(() => { load(); }, []);

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
        <div className="intake-card-soft text-center py-10 text-sm text-muted-foreground">
          עדיין לא התקבלו טפסי קליטה.
        </div>
      ) : (
        <div className="intake-card-soft overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-right p-3">תלמיד/ה</th>
                <th className="text-right p-3">כיתה</th>
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
          <div className="bg-card rounded-2xl shadow-xl max-w-2xl w-full my-8 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-heading font-bold">
                טופס קליטה — {selected.student_first_name} {selected.student_last_name}
              </h3>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-4 max-h-[65vh] overflow-y-auto pl-1">
              <section>
                <h4 className="text-sm font-semibold text-primary mb-1">פרטי התלמיד/ה</h4>
                <Row label="תעודת זהות" value={selected.student_id_number} />
                <Row label="תאריך לידה" value={selected.birth_date} />
                <Row label="מין" value={selected.gender === "female" ? "בת" : selected.gender === "male" ? "בן" : ""} />
                <Row label="כיתה" value={selected.grade} />
                <Row label="כתובת" value={[selected.address, selected.city].filter(Boolean).join(", ")} />
                <Row label="טלפון התלמיד/ה" value={selected.student_phone} />
                <Row label="בית ספר קודם" value={selected.previous_school} />
              </section>

              <section>
                <h4 className="text-sm font-semibold text-primary mb-1">פרטי ההורים</h4>
                <Row label="הורה 1" value={selected.parent1_name} />
                <Row label="טלפון הורה 1" value={selected.parent1_phone} />
                <Row label="דוא״ל הורה 1" value={selected.parent1_email} />
                <Row label="ת״ז הורה 1" value={selected.parent1_id_number} />
                <Row label="הורה 2" value={selected.parent2_name} />
                <Row label="טלפון הורה 2" value={selected.parent2_phone} />
                <Row label="דוא״ל הורה 2" value={selected.parent2_email} />
                <Row label="מצב משפחתי" value={selected.family_status} />
                <Row label="אחים ואחיות" value={selected.siblings} />
              </section>

              <section>
                <h4 className="text-sm font-semibold text-primary mb-1">רקע רפואי</h4>
                <Row label="אלרגיות" value={selected.medical_allergies} />
                <Row label="תרופות" value={selected.medical_medications} />
                <Row label="מצבים רפואיים" value={selected.medical_conditions} />
                <Row label="אבחונים" value={selected.medical_diagnoses} />
                <Row label="טיפולים" value={selected.medical_treatments} />
                <Row label="איש קשר לחירום" value={`${selected.emergency_contact_name} ${selected.emergency_contact_phone}`} />
                <Row label="קופת חולים" value={selected.health_fund} />
              </section>

              <section>
                <h4 className="text-sm font-semibold text-primary mb-1">הצהרות והסכמות</h4>
                {CONSENT_ITEMS.map((c) => (
                  <div key={c.key} className="flex gap-2 text-sm py-1 border-b border-border/50">
                    <span className={(selected.consents || {})[c.key] ? "text-success" : "text-muted-foreground"}>
                      {(selected.consents || {})[c.key] ? "✓" : "✗"}
                    </span>
                    <span>{c.label}</span>
                  </div>
                ))}
                <Row label="חתימה" value={selected.signature_name} />
                <Row label="תאריך חתימה" value={selected.signature_date ? new Date(selected.signature_date).toLocaleString("he-IL") : ""} />
                <Row label="הערות" value={selected.extra_notes} />
              </section>
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
