import { supabase } from "@/integrations/supabase/client";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { APP_URL } from "@/lib/app-url";
import { ACADEMIC_YEAR } from "@/lib/short-day";

export interface InclusionInvite {
  id: string;
  token: string;
  student_name: string;
  grade: string;
  parent_name: string;
  parent_phone: string;
  academic_year: string;
  draft_data: Record<string, unknown>;
  status: string; // sent | in_progress | submitted
  consent_id: string | null;
  sent_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export const INCLUSION_INVITE_STATUS: Record<string, string> = {
  sent: "נשלח",
  in_progress: "בתהליך מילוי",
  submitted: "הוגש",
};

function makeToken(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const arr = new Uint32Array(6);
  crypto.getRandomValues(arr);
  let out = "";
  arr.forEach((n) => { out += chars[n % chars.length]; });
  return out;
}

export const inclusionInviteCode = (token: string) => token.toUpperCase();
export const inclusionInviteLink = (token: string) => `${APP_URL}/forms/inclusion-consent?t=${token}`;

export function inclusionInviteMessage(inv: InclusionInvite): string {
  return `שלום ${inv.parent_name},

מצורף קישור אישי למילוי "אישור הורים — שילוב לימודי" עבור ${inv.student_name} בבית ספר מרום — בית אקשטיין, לשנת הלימודים ${inv.academic_year || ACADEMIC_YEAR}:

${inclusionInviteLink(inv.token)}

הטופס נשמר אוטומטית — אפשר לעצור באמצע ולהמשיך מאוחר יותר.
בסיום ניתן להוריד עותק PDF של האישור.

תודה,
צוות בית הספר`;
}

export function inclusionInviteWhatsAppUrl(inv: InclusionInvite): string | null {
  return buildWhatsAppUrl(inv.parent_phone, inclusionInviteMessage(inv));
}

export interface NewInclusionInvite {
  student_name: string;
  grade: string;
  parent_name: string;
  parent_phone: string;
}

export async function createInclusionInvite(input: NewInclusionInvite): Promise<InclusionInvite | null> {
  const row = {
    token: makeToken(),
    student_name: input.student_name,
    grade: input.grade,
    parent_name: input.parent_name,
    parent_phone: input.parent_phone,
    academic_year: ACADEMIC_YEAR,
    draft_data: { student_name: input.student_name, grade: input.grade },
    sent_at: new Date().toISOString(),
  };
  const { data, error } = await (supabase as any).from("inclusion_invites").insert([row]).select().maybeSingle();
  if (error) { console.error("createInclusionInvite", error); return null; }
  return data as InclusionInvite;
}

export async function getInclusionInvites(): Promise<InclusionInvite[]> {
  const { data, error } = await (supabase as any)
    .from("inclusion_invites").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("getInclusionInvites", error);
    throw new Error(error.message || "טעינת ההזמנות נכשלה");
  }
  return (data || []) as InclusionInvite[];
}

export async function getInclusionInviteByToken(token: string): Promise<InclusionInvite | null> {
  const { data, error } = await (supabase as any)
    .from("inclusion_invites").select("*").eq("token", token.trim().toLowerCase()).maybeSingle();
  if (error) { console.error("getInclusionInviteByToken", error); return null; }
  return (data as InclusionInvite) || null;
}

export async function saveInclusionDraft(token: string, draft: Record<string, unknown>): Promise<void> {
  await (supabase as any).from("inclusion_invites")
    .update({ draft_data: draft, status: "in_progress" })
    .eq("token", token).neq("status", "submitted");
}

export async function markInclusionInviteSubmitted(token: string, consentId: string | null): Promise<void> {
  await (supabase as any).from("inclusion_invites")
    .update({ status: "submitted", submitted_at: new Date().toISOString(), consent_id: consentId })
    .eq("token", token);
}

export async function deleteInclusionInvite(id: string): Promise<void> {
  await (supabase as any).from("inclusion_invites").delete().eq("id", id);
}
