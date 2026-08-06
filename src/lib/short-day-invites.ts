import { supabase } from "@/integrations/supabase/client";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { APP_URL } from "@/lib/app-url";
import { ACADEMIC_YEAR } from "@/lib/short-day";

export interface ShortDayInvite {
  id: string;
  token: string;
  student_name: string;
  grade: string;
  parent_name: string;
  parent_phone: string;
  academic_year: string;
  draft_data: Record<string, unknown>;
  status: string; // sent | in_progress | submitted
  request_id: string | null;
  sent_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export const SHORT_DAY_INVITE_STATUS: Record<string, string> = {
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

export const shortDayInviteCode = (token: string) => token.toUpperCase();
export const shortDayInviteLink = (token: string) => `${APP_URL}/?code=${token.toUpperCase()}`;

export function shortDayInviteMessage(inv: ShortDayInvite): string {
  return `שלום ${inv.parent_name},

מצורף קישור אישי למילוי "בקשה לקיצור יום לימודים" עבור ${inv.student_name} בבית ספר מרום — בית אקשטיין, לשנת הלימודים ${inv.academic_year || ACADEMIC_YEAR}:

קוד גישה: ${shortDayInviteCode(inv.token)}
כניסה ישירה: ${shortDayInviteLink(inv.token)}

הטופס נשמר אוטומטית — אפשר לעצור באמצע ולהמשיך מאוחר יותר.
בסיום ניתן להוריד עותק PDF של הבקשה.

תודה,
צוות בית הספר`;
}

export function shortDayInviteWhatsAppUrl(inv: ShortDayInvite): string | null {
  return buildWhatsAppUrl(inv.parent_phone, shortDayInviteMessage(inv));
}

export interface NewShortDayInvite {
  student_name: string;
  grade: string;
  parent_name: string;
  parent_phone: string;
}

export async function createShortDayInvite(input: NewShortDayInvite): Promise<ShortDayInvite | null> {
  const row = {
    token: makeToken(),
    student_name: input.student_name,
    grade: input.grade,
    parent_name: input.parent_name,
    parent_phone: input.parent_phone,
    academic_year: ACADEMIC_YEAR,
    draft_data: {
      student_name: input.student_name,
      grade: input.grade,
    },
    sent_at: new Date().toISOString(),
  };
  const { data, error } = await (supabase as any).from("short_day_invites").insert([row]).select().maybeSingle();
  if (error) { console.error("createShortDayInvite", error); return null; }
  return data as ShortDayInvite;
}

export async function getShortDayInvites(): Promise<ShortDayInvite[]> {
  const { data, error } = await (supabase as any)
    .from("short_day_invites").select("*").order("created_at", { ascending: false });
  if (error) { console.error("getShortDayInvites", error); return []; }
  return (data || []) as ShortDayInvite[];
}

export async function getShortDayInviteByToken(token: string): Promise<ShortDayInvite | null> {
  const { data, error } = await (supabase as any)
    .from("short_day_invites").select("*").eq("token", token.trim().toLowerCase()).maybeSingle();
  if (error) { console.error("getShortDayInviteByToken", error); return null; }
  return (data as ShortDayInvite) || null;
}

export async function saveShortDayDraft(token: string, draft: Record<string, unknown>): Promise<void> {
  await (supabase as any).from("short_day_invites")
    .update({ draft_data: draft, status: "in_progress" })
    .eq("token", token).neq("status", "submitted");
}

export async function markShortDayInviteSubmitted(token: string, requestId: string | null): Promise<void> {
  await (supabase as any).from("short_day_invites")
    .update({ status: "submitted", submitted_at: new Date().toISOString(), request_id: requestId })
    .eq("token", token);
}

export async function deleteShortDayInvite(id: string): Promise<void> {
  await (supabase as any).from("short_day_invites").delete().eq("id", id);
}
