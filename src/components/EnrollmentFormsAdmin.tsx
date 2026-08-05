import { APP_URL } from "@/lib/app-url";
import { useEffect, useMemo, useState } from "react";
import {
  Copy, Download, FileText, GitCompare, Link2, Loader2, Plus, Printer,
  Send, Trash2, UserPlus, X,
} from "lucide-react";
import { FORM_STEPS, GRADES } from "@/data/enrollment-form";
import { fileNameFromPath, openEnrollmentDoc } from "@/lib/enrollment-uploads";
import {
  ENROLLMENT_STATUS_LABELS, EnrollmentForm, deleteEnrollmentForm,
  flattenForm, getEnrollmentForms, updateEnrollmentStatus,
} from "@/lib/enrollment";
import {
  EnrollmentInvite, INVITE_STATUS_LABELS, PARENT_ROLE_LABELS, createInvites,
  deleteInvite, getInvites, inviteLink, inviteWhatsAppUrl,
} from "@/lib/enrollment-invites";
import {
  compareForms, displayValue, generateCombinedEnrollmentPDF, generateEnrollmentPDF,
} from "@/lib/enrollment-pdf";

const EnrollmentFormsAdmin = () => {
  const [forms, setForms] = useState<EnrollmentForm[]>([]);
  const [invites, setInvites] = useState<EnrollmentInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EnrollmentForm | null>(null);
  const [comparePair, setComparePair] = useState<string | null>(null);
  const [copied, setCopied] = useState("");
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [draft, setDraft] = useState({
    student_name: "", grade: "", academic_year: 'תשפ"ז', divorced: false,
    p1_name: "", p1_phone: "", p2_name: "", p2_phone: "",
  });

  const reload = async () => {
    const [f, i] = await Promise.all([getEnrollmentForms(), getInvites()]);
    setForms(f); setInvites(i); setLoading(false);
  };
  useEffect(() => { reload(); }, []);

  const openLink = `${APP_URL}/enroll`;
  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(""), 1500);
  };

  const handleCreate = async () => {
    if (!draft.student_name.trim() || !draft.p1_name.trim()) return;
    setCreating(true);
    const parents: { name: string; phone: string; role: "parent1" | "parent2" }[] = [
      { name: draft.p1_name.trim(), phone: draft.p1_phone.trim(), role: "parent1" },
    ];
    if (draft.divorced && draft.p2_name.trim()) {
      parents.push({ name: draft.p2_name.trim(), phone: draft.p2_phone.trim(), role: "parent2" });
    }
    const created = await createInvites({
      student_name: draft.student_name.trim(),
      grade: draft.grade,
      academic_year: draft.academic_year,
      family_status: draft.divorced ? "divorced" : "married",
      parents,
    });
    setCreating(false);
    if (created.length) {
      setDraft({ student_name: "", grade: "", academic_year: 'תשפ"ז', divorced: false, p1_name: "", p1_phone: "", p2_name: "", p2_phone: "" });
      setShowNew(false);
      reload();
    }
  };

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

  /** pairs with two submitted forms → integration available */
  const pairs = useMemo(() => {
    const map = new Map<string, EnrollmentForm[]>();
    forms.forEach((f) => {
      if (!f.pair_id) return;
      map.set(f.pair_id, [...(map.get(f.pair_id) || []), f]);
    });
    return map;
  }, [forms]);

  const compareData = useMemo(() => {
    if (!comparePair) return null;
    const [a, b] = pairs.get(comparePair) || [];
    if (!a || !b) return null;
    return { a, b, diffs: compareForms(flattenForm(a), flattenForm(b)) };
  }, [comparePair, pairs]);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const values = selected ? flattenForm(selected) : {};

  return (
    <div className="space-y-4">
      {/* open link */}
      <div className="intake-card-soft flex flex-wrap items-center gap-3">
        <Link2 className="w-5 h-5 text-primary" />
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-medium">קישור כללי לטופס הקליטה</p>
          <p className="text-xs text-muted-foreground break-all">{openLink}</p>
        </div>
        <button onClick={() => copy(openLink, "open")}
          className="btn-intake bg-primary/10 text-primary text-xs px-3 py-2 gap-1 hover:bg-primary/20 inline-flex items-center">
          <Copy className="w-3.5 h-3.5" /> {copied === "open" ? "הועתק ✓" : "העתקה"}
        </button>
      </div>

      {/* new invite */}
      <div className="intake-card-soft">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-heading font-bold">
            <UserPlus className="w-4 h-4 text-primary" /> שליחת טופס אישי להורים בוואטסאפ
          </h3>
          <button onClick={() => setShowNew((s) => !s)}
            className="btn-intake bg-primary text-primary-foreground text-xs px-3 py-2 gap-1 inline-flex items-center shadow-md">
            <Plus className="w-3.5 h-3.5" /> {showNew ? "סגירה" : "הזמנה חדשה"}
          </button>
        </div>

        {showNew && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">שם התלמיד/ה *</label>
              <input className="w-full bg-background border border-input rounded-xl p-2.5 text-sm"
                value={draft.student_name} onChange={(e) => setDraft({ ...draft, student_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">כיתה</label>
              <select className="w-full bg-background border border-input rounded-xl p-2.5 text-sm"
                value={draft.grade} onChange={(e) => setDraft({ ...draft, grade: e.target.value })}>
                <option value="">בחרו</option>
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">שנת לימודים</label>
              <input className="w-full bg-background border border-input rounded-xl p-2.5 text-sm"
                value={draft.academic_year} onChange={(e) => setDraft({ ...draft, academic_year: e.target.value })} />
            </div>

            <label className="sm:col-span-2 flex items-center gap-2 text-sm p-2.5 rounded-xl border border-border bg-muted/30 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-primary" checked={draft.divorced}
                onChange={(e) => setDraft({ ...draft, divorced: e.target.checked })} />
              הורים גרושים / פרודים — שליחת טופס נפרד לכל הורה ואינטגרציה בין השניים
            </label>

            <div>
              <label className="block text-xs font-medium mb-1">שם הורה 1 *</label>
              <input className="w-full bg-background border border-input rounded-xl p-2.5 text-sm"
                value={draft.p1_name} onChange={(e) => setDraft({ ...draft, p1_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">נייד הורה 1</label>
              <input dir="ltr" inputMode="tel" className="w-full bg-background border border-input rounded-xl p-2.5 text-sm"
                value={draft.p1_phone} onChange={(e) => setDraft({ ...draft, p1_phone: e.target.value })} />
            </div>

            {draft.divorced && (
              <>
                <div>
                  <label className="block text-xs font-medium mb-1">שם הורה 2</label>
                  <input className="w-full bg-background border border-input rounded-xl p-2.5 text-sm"
                    value={draft.p2_name} onChange={(e) => setDraft({ ...draft, p2_name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">נייד הורה 2</label>
                  <input dir="ltr" inputMode="tel" className="w-full bg-background border border-input rounded-xl p-2.5 text-sm"
                    value={draft.p2_phone} onChange={(e) => setDraft({ ...draft, p2_phone: e.target.value })} />
                </div>
              </>
            )}

            <button onClick={handleCreate} disabled={creating || !draft.student_name.trim() || !draft.p1_name.trim()}
              className={`sm:col-span-2 btn-intake inline-flex items-center justify-center gap-2 ${
                creating || !draft.student_name.trim() || !draft.p1_name.trim()
                  ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground shadow-md"}`}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} יצירת קישורים אישיים
            </button>
          </div>
        )}
      </div>

      {/* invites list */}
      {invites.length > 0 && (
        <div className="intake-card-soft p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-right p-3">תלמיד/ה</th>
                <th className="text-right p-3">הורה</th>
                <th className="text-right p-3">טלפון</th>
                <th className="text-right p-3">התקדמות</th>
                <th className="text-right p-3">סטטוס</th>
                <th className="p-3">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => {
                const wa = inviteWhatsAppUrl(inv);
                const pct = inv.status === "submitted" ? 100 : Math.round(((inv.current_step || 0) / FORM_STEPS.length) * 100);
                return (
                  <tr key={inv.id} className="border-t border-border/60 hover:bg-muted/20">
                    <td className="p-3 font-medium">
                      {inv.student_name}
                      {inv.family_status === "divorced" && <span className="mr-1 text-[10px] text-accent-foreground">· גרושים</span>}
                    </td>
                    <td className="p-3">{inv.parent_name} <span className="text-xs text-muted-foreground">({PARENT_ROLE_LABELS[inv.parent_role]})</span></td>
                    <td className="p-3" dir="ltr">{inv.parent_phone || "—"}</td>
                    <td className="p-3 w-32">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{pct}%</span>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded-lg ${inv.status === "submitted" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
                        {INVITE_STATUS_LABELS[inv.status] || inv.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 justify-end">
                        {wa && (
                          <a href={wa} target="_blank" rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-success/10 text-success text-xs font-medium hover:bg-success/20 inline-flex items-center gap-1">
                            <Send className="w-3 h-3" /> וואטסאפ
                          </a>
                        )}
                        <button onClick={() => copy(inviteLink(inv.token), inv.id)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" title="העתקת קישור">
                          {copied === inv.id ? <span className="text-[10px] text-success">✓</span> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={async () => { if (confirm("למחוק את ההזמנה?")) { await deleteInvite(inv.id); reload(); } }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* submitted forms */}
      <h3 className="flex items-center gap-2 text-sm font-heading font-bold pt-2">
        <FileText className="w-4 h-4 text-primary" /> טפסים שהתקבלו
      </h3>

      {forms.length === 0 ? (
        <div className="intake-card-soft text-center py-10 text-sm text-muted-foreground">עדיין לא התקבלו טפסי קליטה.</div>
      ) : (
        <div className="intake-card-soft overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-right p-3">תלמיד/ה</th>
                <th className="text-right p-3">כיתה</th>
                <th className="text-right p-3">מולא ע"י</th>
                <th className="text-right p-3">תאריך</th>
                <th className="text-right p-3">סטטוס</th>
                <th className="p-3">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((f) => {
                const pairForms = f.pair_id ? pairs.get(f.pair_id) || [] : [];
                return (
                  <tr key={f.id} className="border-t border-border/60 hover:bg-muted/20">
                    <td className="p-3 font-medium cursor-pointer" onClick={() => setSelected(f)}>
                      {f.student_first_name} {f.student_last_name}
                    </td>
                    <td className="p-3">{f.grade || "—"}</td>
                    <td className="p-3">{f.parent1_name || f.parent2_name || "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString("he-IL")}</td>
                    <td className="p-3">
                      <span className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary">
                        {ENROLLMENT_STATUS_LABELS[f.status] || f.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 justify-end">
                        {pairForms.length > 1 && (
                          <button onClick={() => setComparePair(f.pair_id)}
                            className="px-2.5 py-1.5 rounded-lg bg-accent/15 text-xs font-medium hover:bg-accent/25 inline-flex items-center gap-1">
                            <GitCompare className="w-3 h-3" /> אינטגרציה
                          </button>
                        )}
                        <button onClick={() => generateEnrollmentPDF(flattenForm(f), `${f.student_first_name} ${f.student_last_name}`, `מולא על ידי ${f.parent1_name || f.parent2_name || ""}`, { compact: true })}
                          className="px-2 py-1.5 rounded-lg hover:bg-muted text-muted-foreground text-[11px] font-medium inline-flex items-center gap-1" title="הורדת PDF מוקטן ומהיר">
                          <Download className="w-3.5 h-3.5" /> מוקטן
                        </button>
                        <button onClick={() => generateEnrollmentPDF(flattenForm(f), `${f.student_first_name} ${f.student_last_name}`, `מולא על ידי ${f.parent1_name || f.parent2_name || ""}`)}
                          className="px-2 py-1.5 rounded-lg hover:bg-muted text-muted-foreground text-[11px] font-medium inline-flex items-center gap-1" title="הורדת PDF מלא באיכות גבוהה">
                          <Download className="w-3.5 h-3.5" /> מלא
                        </button>
                        <button onClick={() => handleDelete(f)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* single form modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setSelected(null)}>
          <div className="bg-card rounded-2xl shadow-xl max-w-3xl w-full my-8 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-heading font-bold">
                טופס קליטה — {selected.student_first_name} {selected.student_last_name}
              </h3>
              <div className="flex items-center gap-1">
                <button onClick={() => generateEnrollmentPDF(values, `${selected.student_first_name} ${selected.student_last_name}`, "", { compact: true })}
                  className="px-2 py-1.5 rounded-lg hover:bg-muted text-[11px] font-medium inline-flex items-center gap-1" title="הורדת PDF מוקטן ומהיר"><Download className="w-3.5 h-3.5" /> מוקטן</button>
                <button onClick={() => generateEnrollmentPDF(values, `${selected.student_first_name} ${selected.student_last_name}`)}
                  className="px-2 py-1.5 rounded-lg hover:bg-muted text-[11px] font-medium inline-flex items-center gap-1" title="הורדת PDF מלא"><Download className="w-3.5 h-3.5" /> מלא</button>
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
                          {f.type === "signature" ? (
                            typeof values[f.key] === "string" && String(values[f.key]).startsWith("data:") ? (
                              <img src={String(values[f.key])} alt={f.label}
                                className="h-16 bg-card border border-border rounded-lg object-contain" />
                            ) : <span className="text-xs text-muted-foreground">—</span>
                          ) : f.type === "file" ? (
                            <span className="flex flex-wrap gap-2">
                              {(Array.isArray(values[f.key]) ? values[f.key] as string[] : values[f.key] ? [values[f.key] as string] : []).map((p) => (
                                <button key={p} onClick={() => openEnrollmentDoc(p)}
                                  className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20">
                                  {fileNameFromPath(p)}
                                </button>
                              ))}
                              {!values[f.key] && <span className="text-xs text-muted-foreground">—</span>}
                            </span>
                          ) : (
                            <span className="font-medium break-words">{displayValue(values[f.key])}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
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
            </div>
          </div>
        </div>
      )}

      {/* two-parent integration modal */}
      {compareData && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setComparePair(null)}>
          <div className="bg-card rounded-2xl shadow-xl max-w-3xl w-full my-8 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-heading font-bold">
                אינטגרציה בין שני ההורים — {compareData.a.student_first_name} {compareData.a.student_last_name}
              </h3>
              <button onClick={() => setComparePair(null)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>

            <p className="text-xs text-muted-foreground mb-3">
              להלן הסעיפים שבהם התשובות שונות. שאר הסעיפים זהים ומופיעים בטופס המאוחד.
            </p>

            <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 sticky top-0">
                  <tr>
                    <th className="text-right p-2">סעיף</th>
                    <th className="text-right p-2">{compareData.a.parent1_name || compareData.a.parent2_name || "הורה א׳"}</th>
                    <th className="text-right p-2">{compareData.b.parent1_name || compareData.b.parent2_name || "הורה ב׳"}</th>
                  </tr>
                </thead>
                <tbody>
                  {compareData.diffs.length === 0 ? (
                    <tr><td colSpan={3} className="p-4 text-center text-success font-medium">אין פערים — שני ההורים מילאו תשובות זהות.</td></tr>
                  ) : compareData.diffs.map((d, i) => (
                    <tr key={i} className="border-t border-border/60">
                      <td className="p-2">{d.label}<div className="text-[10px] text-muted-foreground">{d.stepLabel}</div></td>
                      <td className="p-2 font-medium">{d.a}</td>
                      <td className="p-2 font-medium">{d.b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={() => generateCombinedEnrollmentPDF(compareData.a, compareData.b)}
              className="btn-intake bg-primary text-primary-foreground shadow-md w-full mt-4 inline-flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> הורדת PDF מאוחד לשני ההורים
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnrollmentFormsAdmin;
