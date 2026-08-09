import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { FORM_STEPS, FieldType } from "@/data/enrollment-form";
import { DECLARATIONS } from "@/lib/short-day";
import {
  EMPTY_OVERRIDES, ExtraField, FormKey, FormOverrides,
  SHORT_DAY_FIELDS, loadFormOverrides, saveFormOverrides,
} from "@/lib/form-config";

const TYPES: { v: FieldType; l: string }[] = [
  { v: "text", l: "טקסט קצר" },
  { v: "textarea", l: "טקסט ארוך" },
  { v: "date", l: "תאריך" },
  { v: "tel", l: "טלפון" },
  { v: "email", l: "דוא״ל" },
  { v: "yesno", l: "כן / לא" },
  { v: "checkbox", l: "תיבת סימון" },
];

const Toggle = ({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) => (
  <button type="button" onClick={onClick}
    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
      on ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/40"}`}>
    {label}
  </button>
);

interface Row { key: string; label: string; groupKey: string; groupTitle: string; required: boolean; isExtra?: boolean }

const FormEditor = ({ form }: { form: FormKey }) => {
  const [ov, setOv] = useState<FormOverrides>(EMPTY_OVERRIDES);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newField, setNewField] = useState<ExtraField>({ key: "", label: "", type: "text", required: false, groupKey: "" });
  const [newDecl, setNewDecl] = useState("");

  useEffect(() => { loadFormOverrides(form).then((v) => { setOv(v); setLoading(false); }); }, [form]);

  const groups = useMemo(
    () => FORM_STEPS.flatMap((s) => s.groups.map((g) => ({ key: g.key, title: `${s.label} · ${g.title}` }))),
    [],
  );

  const rows: Row[] = useMemo(() => {
    if (form === "short-day") {
      return SHORT_DAY_FIELDS.map((f) => ({
        ...f, groupKey: "sd", groupTitle: "בקשה לקיצור יום לימודים",
        required: ov.required[f.key] ?? true,
      }));
    }
    return FORM_STEPS.flatMap((s) => s.groups.flatMap((g) =>
      g.fields.filter((f) => f.type !== "note").map((f) => ({
        key: f.key, label: ov.labels[f.key] ?? f.label, groupKey: g.key,
        groupTitle: `${s.label} · ${g.title}`, required: ov.required[f.key] ?? !!f.required,
      }))));
  }, [form, ov]);

  const extraRows: Row[] = ov.extra.map((e) => ({
    key: e.key, label: e.label, groupKey: e.groupKey || "sd",
    groupTitle: groups.find((g) => g.key === e.groupKey)?.title || "שאלות שנוספו",
    required: ov.required[e.key] ?? !!e.required, isExtra: true,
  }));

  const update = (patch: Partial<FormOverrides>) => { setOv((p) => ({ ...p, ...patch })); setSaved(false); };
  const toggleHidden = (key: string) =>
    update({ hidden: ov.hidden.includes(key) ? ov.hidden.filter((k) => k !== key) : [...ov.hidden, key] });
  const toggleRequired = (key: string, current: boolean) =>
    update({ required: { ...ov.required, [key]: !current } });
  const setLabel = (key: string, label: string) => update({ labels: { ...ov.labels, [key]: label } });

  const addField = () => {
    const label = newField.label.trim();
    if (!label) return;
    const key = `x_${Date.now().toString(36)}`;
    update({ extra: [...ov.extra, { ...newField, key, label, groupKey: form === "short-day" ? "sd" : (newField.groupKey || groups[0].key) }] });
    setNewField({ key: "", label: "", type: "text", required: false, groupKey: newField.groupKey });
  };
  const removeExtra = (key: string) => update({ extra: ov.extra.filter((e) => e.key !== key) });

  const save = async () => {
    setBusy(true);
    const ok = await saveFormOverrides(form, ov);
    setBusy(false); setSaved(ok);
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const byGroup = [...rows, ...extraRows].reduce<Record<string, Row[]>>((acc, r) => {
    (acc[r.groupTitle] ||= []).push(r); return acc;
  }, {});

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        כאן אפשר להסתיר שאלות, לסמן שאלות כחובה (לא ניתן לדלג עליהן), לשנות ניסוח ולהוסיף שאלות חדשות. השינויים נשמרים לכל ההורים.
      </p>

      {Object.entries(byGroup).map(([title, list]) => (
        <div key={title} className="intake-card-soft">
          <h4 className="font-heading font-semibold text-sm mb-3">{title}</h4>
          <div className="space-y-2">
            {list.map((r) => {
              const hidden = ov.hidden.includes(r.key);
              return (
                <div key={r.key}
                  className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 ${hidden ? "opacity-50 border-dashed" : "border-border"}`}>
                  <input
                    className="flex-1 min-w-[180px] bg-transparent text-sm focus:outline-none"
                    value={r.label}
                    onChange={(e) => (r.isExtra
                      ? update({ extra: ov.extra.map((x) => (x.key === r.key ? { ...x, label: e.target.value } : x)) })
                      : setLabel(r.key, e.target.value))}
                  />
                  <Toggle on={r.required} onClick={() => toggleRequired(r.key, r.required)} label={r.required ? "חובה ✓" : "רשות"} />
                  <Toggle on={!hidden} onClick={() => toggleHidden(r.key)} label={hidden ? "מוסתר" : "מוצג"} />
                  {r.isExtra && (
                    <button onClick={() => removeExtra(r.key)} className="p-1 rounded-lg text-destructive hover:bg-destructive/10" title="מחיקה">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {form === "short-day" && (
        <div className="intake-card-soft">
          <h4 className="font-heading font-semibold text-sm mb-3">סעיפי ההצהרה</h4>
          <div className="space-y-2">
            {DECLARATIONS.map((d, i) => {
              const off = ov.declarationsHidden.includes(i);
              return (
                <div key={i} className={`flex items-start gap-2 rounded-xl border px-3 py-2 ${off ? "opacity-50 border-dashed" : "border-border"}`}>
                  <p className="flex-1 text-xs leading-relaxed">{i + 1}. {d}</p>
                  <Toggle on={!off} label={off ? "מוסתר" : "מוצג"}
                    onClick={() => update({ declarationsHidden: off ? ov.declarationsHidden.filter((x) => x !== i) : [...ov.declarationsHidden, i] })} />
                </div>
              );
            })}
            {ov.declarationsExtra.map((d, i) => (
              <div key={`x${i}`} className="flex items-start gap-2 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2">
                <textarea className="flex-1 bg-transparent text-xs leading-relaxed resize-none focus:outline-none" rows={2} value={d}
                  onChange={(e) => update({ declarationsExtra: ov.declarationsExtra.map((x, j) => (j === i ? e.target.value : x)) })} />
                <button onClick={() => update({ declarationsExtra: ov.declarationsExtra.filter((_, j) => j !== i) })}
                  className="p-1 rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <input className="flex-1 bg-background border border-input rounded-xl p-2 text-sm" placeholder="סעיף הצהרה חדש"
              value={newDecl} onChange={(e) => setNewDecl(e.target.value)} />
            <button onClick={() => { if (newDecl.trim()) { update({ declarationsExtra: [...ov.declarationsExtra, newDecl.trim()] }); setNewDecl(""); } }}
              className="btn-intake bg-secondary text-secondary-foreground text-sm flex items-center gap-1"><Plus className="w-4 h-4" /> הוספה</button>
          </div>
        </div>
      )}

      <div className="intake-card-soft">
        <h4 className="font-heading font-semibold text-sm mb-3">הוספת שאלה חדשה</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className="bg-background border border-input rounded-xl p-2.5 text-sm sm:col-span-2" placeholder="ניסוח השאלה"
            value={newField.label} onChange={(e) => setNewField({ ...newField, label: e.target.value })} />
          <select className="bg-background border border-input rounded-xl p-2.5 text-sm"
            value={newField.type} onChange={(e) => setNewField({ ...newField, type: e.target.value as FieldType })}>
            {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
          {form === "enrollment" && (
            <select className="bg-background border border-input rounded-xl p-2.5 text-sm"
              value={newField.groupKey} onChange={(e) => setNewField({ ...newField, groupKey: e.target.value })}>
              <option value="">בחרו מיקום בטופס</option>
              {groups.map((g) => <option key={g.key} value={g.key}>{g.title}</option>)}
            </select>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="w-4 h-4 accent-primary" checked={!!newField.required}
              onChange={() => setNewField({ ...newField, required: !newField.required })} />
            שאלת חובה
          </label>
        </div>
        <button onClick={addField} disabled={!newField.label.trim()}
          className="btn-intake bg-primary text-primary-foreground mt-3 text-sm flex items-center gap-1.5 disabled:opacity-50">
          <Plus className="w-4 h-4" /> הוספה לטופס
        </button>
      </div>

      <div className="sticky bottom-3 flex items-center gap-3">
        <button onClick={save} disabled={busy}
          className="btn-intake bg-primary text-primary-foreground shadow-lg flex items-center gap-2 text-sm disabled:opacity-60">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} שמירת השינויים
        </button>
        {saved && <span className="text-xs text-success flex items-center gap-1"><Check className="w-3.5 h-3.5" /> נשמר</span>}
      </div>
    </div>
  );
};

export default FormEditor;
