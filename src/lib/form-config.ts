/**
 * Editable overrides for the public digital forms (enrollment + short-day).
 * Stored in school_settings so every parent gets the up-to-date version.
 */
import { supabase } from "@/integrations/supabase/client";
import { FormStep, FormField, FieldType } from "@/data/enrollment-form";

export type FormKey = "enrollment" | "short-day";

export interface ExtraField {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  /** enrollment: target group key. short-day: ignored (rendered in its own card) */
  groupKey?: string;
}

export interface FormOverrides {
  /** field keys hidden from the public form */
  hidden: string[];
  /** field key -> required (true) / optional (false) */
  required: Record<string, boolean>;
  /** field key -> replacement label */
  labels: Record<string, string>;
  /** extra questions added by the school */
  extra: ExtraField[];
  /** declaration overrides (short-day) */
  declarationsHidden: number[];
  declarationsExtra: string[];
}

export const EMPTY_OVERRIDES: FormOverrides = {
  hidden: [], required: {}, labels: {}, extra: [],
  declarationsHidden: [], declarationsExtra: [],
};

const settingKey = (form: FormKey) => `form_overrides:${form}`;

export async function loadFormOverrides(form: FormKey): Promise<FormOverrides> {
  const { data, error } = await (supabase as any)
    .from("school_settings").select("value").eq("key", settingKey(form)).maybeSingle();
  if (error || !data?.value) return { ...EMPTY_OVERRIDES };
  return { ...EMPTY_OVERRIDES, ...(data.value as Partial<FormOverrides>) };
}

export async function saveFormOverrides(form: FormKey, value: FormOverrides): Promise<boolean> {
  const { error } = await (supabase as any)
    .from("school_settings")
    .upsert({ key: settingKey(form), value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) { console.error("saveFormOverrides", error); return false; }
  return true;
}

/** Apply hidden / required / label overrides + extra fields to the enrollment schema. */
export function applyOverridesToSteps(steps: FormStep[], ov: FormOverrides): FormStep[] {
  const hidden = new Set(ov.hidden);
  return steps.map((step) => ({
    ...step,
    groups: step.groups.map((group) => {
      const base: FormField[] = group.fields
        .filter((f) => !hidden.has(f.key))
        .map((f) => ({
          ...f,
          label: ov.labels[f.key] ?? f.label,
          required: ov.required[f.key] ?? f.required,
        }));
      const added = ov.extra
        .filter((e) => e.groupKey === group.key && !hidden.has(e.key))
        .map((e): FormField => ({
          key: e.key, label: e.label, type: e.type, options: e.options,
          required: ov.required[e.key] ?? e.required, full: true,
        }));
      return { ...group, fields: [...base, ...added] };
    }),
  }));
}

/** Field catalogue of the short-day form — used by the editor and the form itself. */
export const SHORT_DAY_FIELDS: { key: string; label: string }[] = [
  { key: "request_date", label: "תאריך" },
  { key: "student_name", label: "שם התלמיד/ה" },
  { key: "student_id_number", label: "ת.ז. התלמיד/ה" },
  { key: "grade", label: "כיתה" },
  { key: "school_name", label: "בית הספר" },
  { key: "homeroom_teacher", label: "מחנך/ת הכיתה" },
  { key: "principal_name", label: "מנהל/ת בית הספר" },
  { key: "exit_time", label: "שעת היציאה המבוקשת" },
  { key: "start_date", label: "החל מתאריך" },
  { key: "days", label: "הימים המבוקשים" },
  { key: "reason", label: "נימוק לבקשה" },
  { key: "declarations", label: "אישור ההצהרה" },
  { key: "joint_parents", label: "הצהרת שני ההורים (גרושים/פרודים)" },
  { key: "signatures", label: "חתימות ההורים" },
];

/** true when the field must be filled (defaults to mandatory on the short-day form). */
export const sdRequired = (ov: FormOverrides, key: string) => ov.required[key] ?? true;
export const sdHidden = (ov: FormOverrides, key: string) => ov.hidden.includes(key);
