import { supabase } from "@/integrations/supabase/client";
import { renderPagedHTMLToPDF } from "@/lib/pdf-export";
import { APP_URL } from "@/lib/app-url";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import logo from "@/assets/logo.jpeg";

export interface TripDetails {
  id?: string;
  name: string;        // שם/יעד הטיול
  date: string;        // yyyy-mm-dd
  route: string;       // מסלול הטיול
  depart: string;      // שעת יציאה
  return_time: string; // שעת חזרה משוערת
  equipment: string;   // ציוד נדרש
  notes: string;       // התאמות / הערות נוספות לטיול
  teacher: string;     // למי מעבירים (מחנכת הכיתה)
}
export const DEFAULT_TRIP: TripDetails = {
  name: "", date: "", route: "", depart: "", return_time: "",
  equipment: "ארוחת בוקר הכוללת: 2 כריכים, ליטר וחצי מים, חטיף אחד בלבד.\nכובע, מכנסיים ארוכים, נעלי הליכה סגורות.\n(ארוחת צהריים תוגש בבית הספר)",
  notes: "", teacher: "מחנכת הכיתה",
};

export interface TripData {
  student_name?: string;
  grade?: string;
  parent_name?: string;
  health?: "fit" | "limited_ok" | "limited_no";
  remarks?: string;
  signature?: string;
  sign_date?: string;
}
export interface TripConsent {
  id: string; token: string; student_name: string; grade: string; parent_phone: string;
  trip: Partial<TripDetails>; data: TripData; status: string; submitted_at: string | null; created_at: string;
}

export const TRIP_STATUS: Record<string, string> = { sent: "נשלח", in_progress: "בתהליך מילוי", submitted: "הוגש" };
export const HEALTH_TEXT = {
  fit: "למיטב ידיעתי בני/בתי כשיר/ה מבחינה בריאותית ויכול/ה להשתתף בפעילות הנ\"ל ולא חל שום שינוי במצבו/ה הבריאותי לאחרונה.",
  limited_ok: "יש לבני/בתי מגבלות בריאותיות שאינן מונעות השתתפות בפעילות הנ\"ל — מצ\"ב אישור רפואי לכך.",
  limited_no: "לבני/בתי מגבלות בריאותיות המגבילות/מונעות את השתתפותו/ה בפעילות הנ\"ל — מצ\"ב אישור רפואי.",
};

const SKEY = "trips";
export async function loadTrips(): Promise<TripDetails[]> {
  const { data } = await (supabase as any).from("school_settings").select("value").eq("key", SKEY).maybeSingle();
  return Array.isArray(data?.value) ? data.value.map((t: TripDetails) => ({ ...DEFAULT_TRIP, ...t })) : [];
}
export async function saveTrip(t: TripDetails): Promise<TripDetails | null> {
  const list = await loadTrips();
  const trip = { ...t, id: t.id || crypto.randomUUID() };
  const i = list.findIndex((x) => x.id === trip.id);
  if (i >= 0) list[i] = trip; else list.unshift(trip);
  const { error } = await (supabase as any).from("school_settings").upsert({ key: SKEY, value: list, updated_at: new Date().toISOString() }, { onConflict: "key" });
  return error ? null : trip;
}
export async function deleteTripDetails(id: string) {
  const list = (await loadTrips()).filter((x) => x.id !== id);
  await (supabase as any).from("school_settings").upsert({ key: SKEY, value: list, updated_at: new Date().toISOString() }, { onConflict: "key" });
}
/** Trip by id, or the most recent trip when no id is given. */
export async function loadTripDetails(id?: string | null): Promise<TripDetails> {
  const list = await loadTrips();
  return (id ? list.find((x) => x.id === id) : list[0]) || DEFAULT_TRIP;
}

const T = () => (supabase as any).from("trip_consents");
function makeToken() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const arr = new Uint32Array(8); crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

export const heDate = (d?: string) => { if (!d) return ""; const x = new Date(d); return isNaN(x.getTime()) ? d : x.toLocaleDateString("he-IL"); };
export const heDay = (d?: string) => { if (!d) return ""; const x = new Date(d); return isNaN(x.getTime()) ? "" : x.toLocaleDateString("he-IL", { weekday: "long" }); };

export const tripLink = (token?: string) => `${APP_URL}/forms/trip-consent${token ? `?t=${token}` : ""}`;
export const tripPublicLink = (tripId: string) => `${APP_URL}/forms/trip-consent?trip=${tripId}`;
export const tripMessage = (r: TripConsent) => `שלום,

מצורף קישור אישי למילוי "אישור הורים להשתתפות בטיול"${r.trip?.name ? ` — ${r.trip.name}` : ""}${r.trip?.date ? ` (${heDay(r.trip.date)} ${heDate(r.trip.date)})` : ""} עבור ${r.student_name}:

${tripLink(r.token)}

תודה,
צוות בית הספר`;
export const tripWhatsAppUrl = (r: TripConsent) => buildWhatsAppUrl(r.parent_phone, tripMessage(r));

export async function createTripInvite(i: { student_name: string; grade: string; parent_phone: string }, trip: TripDetails) {
  const { data, error } = await T().insert([{ ...i, trip, token: makeToken(), data: { student_name: i.student_name, grade: i.grade } }]).select().maybeSingle();
  if (error) { console.error(error); return null; }
  return data as TripConsent;
}
export async function getTripConsents(): Promise<TripConsent[]> {
  const { data, error } = await T().select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}
export async function getTripByToken(token: string): Promise<TripConsent | null> {
  const { data } = await T().select("*").eq("token", token.trim().toLowerCase()).maybeSingle();
  return data || null;
}
export async function saveTripDraft(token: string, d: TripData) {
  await T().update({ data: d, student_name: d.student_name || "", status: "in_progress", updated_at: new Date().toISOString() }).eq("token", token).neq("status", "submitted");
}
export async function submitTrip(token: string | null, d: TripData, trip: TripDetails): Promise<boolean> {
  const row = { data: d, student_name: d.student_name || "", grade: d.grade || "", status: "submitted", submitted_at: new Date().toISOString() };
  const { error } = token ? await T().update(row).eq("token", token) : await T().insert([{ ...row, trip, token: makeToken() }]);
  return !error;
}
export async function deleteTrip(id: string) { await T().delete().eq("id", id); }

/* PDF */
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
async function toDataUrl(url: string) {
  try { const b = await (await fetch(url)).blob(); return await new Promise<string>((r) => { const f = new FileReader(); f.onload = () => r(String(f.result)); f.readAsDataURL(b); }); } catch { return ""; }
}
const box = (c?: boolean) => `<span style="display:inline-flex;width:14px;height:14px;border:1.5px solid #333;align-items:center;justify-content:center;font-weight:800;color:#1a5e42;margin-left:6px;vertical-align:middle;">${c ? "X" : ""}</span>`;
const td = "border:1px solid #888;padding:6px;text-align:center;";

export async function generateTripPDF(d: TripData, tripIn: Partial<TripDetails>) {
  const t = { ...DEFAULT_TRIP, ...tripIn };
  const lg = await toDataUrl(logo);
  const head = `<div style="text-align:right;margin-bottom:12px;">${lg ? `<img src="${lg}" style="height:55px;"/>` : ""}</div>`;
  const wrap = (inner: string) => `<div style="font-family:'Heebo',Arial,sans-serif;direction:rtl;padding:28px 34px;width:700px;box-sizing:border-box;color:#1a1a2e;line-height:1.7;background:#fff;font-size:13px;">${head}${inner}</div>`;
  const page1 = wrap(`
    <p style="display:flex;justify-content:space-between;margin:0;"><span>להורים שלום,</span></p>
    <p style="text-align:center;font-weight:800;text-decoration:underline;margin:12px 0;">הנדון: יציאה לטיול במסגרת הלימודים${t.name ? ` — ${esc(t.name)}` : ""}</p>
    <table style="width:100%;border-collapse:collapse;margin:10px 0;"><tr>
      <th style="${td}">יום</th><th style="${td}">תאריך</th><th style="${td}">מסלול הטיול</th><th style="${td}">שעת יציאה משוערת</th><th style="${td}">שעת חזרה משוערת</th></tr>
      <tr><td style="${td}">${esc(heDay(t.date))}</td><td style="${td}">${esc(heDate(t.date))}</td><td style="${td}">${esc(t.route)}</td><td style="${td}">${esc(t.depart)}</td><td style="${td}">${esc(t.return_time)}</td></tr></table>
    <p><b style="text-decoration:underline;">ציוד נדרש:</b><br/>${esc(t.equipment).replace(/\n/g, "<br/>")}</p>
    ${t.notes ? `<p><b style="text-decoration:underline;">התאמות והערות:</b><br/>${esc(t.notes).replace(/\n/g, "<br/>")}</p>` : ""}
    <p style="font-weight:700;">* יש להעביר את אישור היציאה החתום ל${esc(t.teacher || "מחנכת הכיתה")}.</p>
    <p style="font-weight:700;">** במידה ומזג האוויר לא יאפשר יציאה לטיול במועד הנ"ל, הטיול יידחה למועד חדש שיפורסם.</p>
    <p style="text-align:center;margin-top:20px;"><b>בברכה,</b><br/>רפאל בוקעי<br/>מנהל בית-הספר</p>`);
  const page2 = wrap(`
    <p style="text-align:center;font-weight:800;text-decoration:underline;margin:0 0 12px;">הנדון: אישור הורים על השתתפות בנכם/בתכם בטיול</p>
    <p>לכבוד: מנהל ביה"ס בית אקשטיין 'מרום' – נצר יבנה</p>
    <p>מאת: הורי התלמיד/ה: <b>${esc(d.student_name)}</b>${d.grade ? ` · כיתה ${esc(d.grade)}` : ""}</p>
    <p>הריני לאשר יציאת בני/בתי לטיול שיתקיים ב: <b>${esc(t.route || t.name)}</b><br/>ביום: <b>${esc(heDay(t.date))}</b> &nbsp; תאריך: <b>${esc(heDate(t.date))}</b> &nbsp; בין השעות: <b>${esc(t.depart)}–${esc(t.return_time)}</b></p>
    <p style="font-weight:800;">נא לסמן X במקום המתאים:</p>
    <p>${box(d.health === "fit")}${esc(HEALTH_TEXT.fit)}</p>
    <p>${box(d.health === "limited_ok")}${esc(HEALTH_TEXT.limited_ok)}</p>
    <p>${box(d.health === "limited_no")}${esc(HEALTH_TEXT.limited_no)}</p>
    <p>הערות: ${esc(d.remarks) || "—"}</p>
    <div style="display:flex;gap:16px;align-items:flex-end;margin-top:14px;">
      <p style="flex:1;margin:0;">שם האם/האב: <b>${esc(d.parent_name)}</b><br/>תאריך: ${esc(heDate(d.sign_date))}</p>
      <div style="flex:1;border-bottom:1px solid #888;">${d.signature?.startsWith("data:") ? `<img src="${d.signature}" style="width:100%;height:60px;object-fit:contain;"/>` : ""}<p style="margin:0;font-size:11px;">חתימה</p></div>
    </div>`);
  await renderPagedHTMLToPDF([page1, page2], `אישור-טיול-${d.student_name || "תלמיד"}.pdf`);
}
