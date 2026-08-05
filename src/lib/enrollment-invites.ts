import { supabase } from "@/integrations/supabase/client";
import { FormValues } from "@/lib/enrollment";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { APP_URL } from "@/lib/app-url";

export type ParentRole = "parent1" | "parent2";

export interface EnrollmentInvite {
  id: string;
  token: string;
  pair_id: string;
  student_name: string;
  grade: string;
  academic_year: string;
  parent_name: string;
  parent_phone: string;
  parent_role: ParentRole;
  family_status: string;
  draft_data: FormValues;
  current_step: number;
  status: string; // sent | in_progress | submitted
  form_id: string | null;
  sent_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export const PARENT_ROLE_LABELS: Record<ParentRole, string> = {
  parent1: "הורה 1",
  parent2: "הורה 2",
};

export const INVITE_STATUS_LABELS: Record<string, string> = {
  sent: "נשלח",
  in_progress: "בתהליך מילוי",
  submitted: "הושלם",
};

function makeToken(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  const arr = new Uint32Array(6);
  crypto.getRandomValues(arr);
  arr.forEach((n) => { out += chars[n % chars.length]; });
  return out;
}

export function inviteLink(token: string): string {
  return `${APP_URL}/?code=${token.toUpperCase()}`;
}

/** The access code parents type manually on the login screen. */
export function inviteCode(token: string): string {
  return token.toUpperCase();
}

export function inviteWhatsAppMessage(inv: EnrollmentInvite): string {
  return `שלום ${inv.parent_name},

לקראת קליטת ${inv.student_name} בבית הספר מרום — בית אקשטיין, נשמח שתמלאו את טופס הקליטה הדיגיטלי בקישור האישי הבא:

קוד גישה: ${inviteCode(inv.token)}
כניסה ישירה: ${inviteLink(inv.token)}

הטופס נשמר אוטומטית — אפשר לעצור באמצע ולהמשיך מאוחר יותר מאותה נקודה.
בסיום ניתן להוריד עותק PDF של הטופס.

תודה,
צוות בית הספר`;
}

export function inviteWhatsAppUrl(inv: EnrollmentInvite): string | null {
  return buildWhatsAppUrl(inv.parent_phone, inviteWhatsAppMessage(inv));
}

export interface NewInviteInput {
  student_name: string;
  grade: string;
  academic_year: string;
  family_status: string;
  parents: { name: string; phone: string; role: ParentRole }[];
}

export async function createInvites(input: NewInviteInput): Promise<EnrollmentInvite[]> {
  const pairId = crypto.randomUUID();
  const rows = input.parents.map((p) => ({
    token: makeToken(),
    pair_id: pairId,
    student_name: input.student_name,
    grade: input.grade,
    academic_year: input.academic_year,
    parent_name: p.name,
    parent_phone: p.phone,
    parent_role: p.role,
    family_status: input.family_status,
    draft_data: {
      student_first_name: input.student_name.split(" ")[0] || "",
      student_last_name: input.student_name.split(" ").slice(1).join(" "),
      grade: input.grade,
      academic_year: input.academic_year,
      family_status: input.family_status === "divorced" ? "גרושים" : "",
      [`${p.role}_name`]: p.name,
      [`${p.role}_phone`]: p.phone,
    },
    sent_at: new Date().toISOString(),
  }));
  const { data, error } = await (supabase as any).from("enrollment_invites").insert(rows).select();
  if (error) { console.error("createInvites", error); return []; }
  return (data || []) as EnrollmentInvite[];
}

export async function getInvites(): Promise<EnrollmentInvite[]> {
  const { data, error } = await (supabase as any)
    .from("enrollment_invites").select("*").order("created_at", { ascending: false });
  if (error) { console.error("getInvites", error); return []; }
  return (data || []) as EnrollmentInvite[];
}

export async function getInviteByToken(token: string): Promise<EnrollmentInvite | null> {
  const { data, error } = await (supabase as any)
    .from("enrollment_invites").select("*").eq("token", token.trim().toLowerCase()).maybeSingle();
  if (error) { console.error("getInviteByToken", error); return null; }
  return (data as EnrollmentInvite) || null;
}

export async function saveInviteDraft(token: string, draft: FormValues, step: number): Promise<void> {
  await (supabase as any).from("enrollment_invites")
    .update({ draft_data: draft, current_step: step, status: "in_progress" })
    .eq("token", token).neq("status", "submitted");
}

export async function markInviteSubmitted(token: string, formId: string | null): Promise<void> {
  await (supabase as any).from("enrollment_invites")
    .update({ status: "submitted", submitted_at: new Date().toISOString(), form_id: formId })
    .eq("token", token);
}

export async function deleteInvite(id: string): Promise<void> {
  await (supabase as any).from("enrollment_invites").delete().eq("id", id);
}
