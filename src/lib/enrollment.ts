import { supabase } from "@/integrations/supabase/client";
import { COLUMN_KEYS } from "@/data/enrollment-form";

export type FormValue = string | boolean | string[] | null;
export type FormValues = Record<string, FormValue>;

export interface EnrollmentForm {
  id: string;
  student_first_name: string;
  student_last_name: string;
  student_id_number: string;
  birth_date: string | null;
  gender: string | null;
  grade: string;
  academic_year: string;
  address: string;
  city: string;
  student_phone: string;
  previous_school: string;
  parent1_name: string;
  parent1_phone: string;
  parent1_email: string;
  parent1_id_number: string;
  parent2_name: string;
  parent2_phone: string;
  parent2_email: string;
  family_status: string;
  siblings: string;
  medical_allergies: string;
  medical_medications: string;
  medical_conditions: string;
  medical_diagnoses: string;
  medical_treatments: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  health_fund: string;
  signature_name: string;
  signature_id_number: string;
  student_signature_name: string;
  signature_date: string | null;
  extra_notes: string;
  form_data: FormValues;
  status: string;
  created_at: string;
  updated_at: string;
}

const DATE_KEYS = new Set(["birth_date"]);

/** Split flat form values into real columns + the jsonb bag. */
export function splitValues(values: FormValues) {
  const columns: Record<string, unknown> = {};
  const formData: FormValues = {};
  const columnSet = new Set<string>(COLUMN_KEYS as readonly string[]);
  for (const [key, value] of Object.entries(values)) {
    if (columnSet.has(key)) {
      if (DATE_KEYS.has(key)) columns[key] = value || null;
      else columns[key] = typeof value === "string" ? value : Array.isArray(value) ? value.join(", ") : value ? "כן" : "";
    } else {
      formData[key] = value;
    }
  }
  return { columns, formData };
}

export async function submitEnrollmentForm(values: FormValues): Promise<{ ok: boolean; error?: string }> {
  const { columns, formData } = splitValues(values);
  const { error } = await (supabase as any).from("enrollment_forms").insert([
    { ...columns, form_data: formData, status: "submitted", signature_date: new Date().toISOString() },
  ]);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getEnrollmentForms(): Promise<EnrollmentForm[]> {
  const { data, error } = await (supabase as any)
    .from("enrollment_forms")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error("Error loading enrollment forms:", error); return []; }
  return (data || []) as EnrollmentForm[];
}

export async function updateEnrollmentStatus(id: string, status: string): Promise<boolean> {
  const { error } = await (supabase as any)
    .from("enrollment_forms")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  return !error;
}

export async function deleteEnrollmentForm(id: string): Promise<boolean> {
  const { error } = await (supabase as any).from("enrollment_forms").delete().eq("id", id);
  return !error;
}

export const ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  submitted: "התקבל",
  reviewed: "נבדק",
  approved: "אושר",
};

/** Merge columns + form_data back into one flat record for display. */
export function flattenForm(form: EnrollmentForm): FormValues {
  const { form_data, ...rest } = form;
  return { ...(rest as unknown as FormValues), ...(form_data || {}) };
}
