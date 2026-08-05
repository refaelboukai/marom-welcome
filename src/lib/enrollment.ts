import { supabase } from "@/integrations/supabase/client";

export interface EnrollmentForm {
  id: string;
  student_first_name: string;
  student_last_name: string;
  student_id_number: string;
  birth_date: string | null;
  gender: string | null;
  grade: string;
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
  consents: Record<string, boolean>;
  signature_name: string;
  signature_date: string | null;
  extra_notes: string;
  status: string;
  linked_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export type EnrollmentDraft = Partial<Omit<EnrollmentForm, "id" | "created_at" | "updated_at">>;

export const CONSENT_ITEMS: { key: string; label: string; required: boolean }[] = [
  { key: "rules", label: "קראנו ואנו מסכימים לתקנון בית הספר ולכללי ההתנהגות", required: true },
  { key: "photos", label: "אנו מאשרים צילום התלמיד/ה לצרכים חינוכיים ופרסום פנימי", required: false },
  { key: "trips", label: "אנו מאשרים השתתפות בטיולים ופעילויות מחוץ לבית הספר", required: false },
  { key: "medical_care", label: "אנו מאשרים מתן טיפול רפואי ראשוני במקרה חירום", required: true },
  { key: "info_sharing", label: "אנו מאשרים שיתוף מידע חינוכי-טיפולי בין אנשי הצוות הרלוונטיים", required: true },
  { key: "accuracy", label: "אנו מצהירים כי כל הפרטים שמסרנו נכונים ומלאים", required: true },
];

export async function submitEnrollmentForm(draft: EnrollmentDraft): Promise<{ ok: boolean; error?: string }> {
  const { error } = await (supabase as any).from("enrollment_forms").insert([
    { ...draft, status: "submitted", signature_date: new Date().toISOString() },
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
