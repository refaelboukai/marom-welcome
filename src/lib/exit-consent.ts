import { supabase } from "@/integrations/supabase/client";
import { renderPagedHTMLToPDF } from "@/lib/pdf-export";
import { APP_URL } from "@/lib/app-url";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import logo from "@/assets/logo.jpeg";

export interface ExitData {
  student_name?: string;
  student_id?: string;
  grade?: string;
  from_date?: string;
  mode_a?: boolean;
  mode_a_way?: string; // "public" | "walk"
  mode_b?: boolean;
  mode_c?: boolean;
  parent1_name?: string;
  parent1_id?: string;
  parent1_signature?: string;
  parent2_name?: string;
  parent2_id?: string;
  parent2_signature?: string;
  sign_date?: string;
}

export interface ExitConsent {
  id: string;
  token: string;
  student_name: string;
  grade: string;
  parent_phone: string;
  data: ExitData;
  status: string;
  submitted_at: string | null;
  created_at: string;
}

export const EXIT_STATUS: Record<string, string> = { sent: "נשלח", in_progress: "בתהליך מילוי", submitted: "הוגש" };
export const MODE_TEXT = {
  a: "על אף שילדנו זכאי להסעה מאורגנת לבית הספר \"בית אקשטיין\" יבנה וחזרה ממנו, ייסע לבדו בתחבורה ציבורית / ילך הביתה ברגל. ידוע ומוסכם עלינו כי אישור זה ניתן על ידינו ומהווה ויתור על הסעה מאורגנת.",
  b: "ילדנו ישתמש מידי פעם בתחבורה ציבורית / הליכה רגלית, במקום בהסעה, ע\"פ אישור כתוב שיינתן לצוות באותו היום.",
  c: "ילדנו רשאי לרדת מההסעה חזור הביתה ללא ליווי וללא אף אחד שממתין לו בתחנה.",
};
export const LIABILITY = "עוד ידוע ומוסכם עלינו כי במידה וילדנו מוותר על שירותי ההסעה עקב בקשתנו, האחריות להגעתו/ה לבית הספר וחזרה ממנו בסיום יום הלימודים תחול עלינו, ואנו נותנים את הסכמתנו לכך שיתנהל באופן עצמאי. לא תטען כל טענה בגין כך, בין במישרין ובין בעקיפין כלפי בית הספר ו/או משרד החינוך ו/או העירייה ו/או חברת ההסעות ו/או חברת הביטוח ומי מטעם.";

const T = () => (supabase as any).from("exit_consents");

function makeToken() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const arr = new Uint32Array(8); crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

export const exitLink = (token: string) => `${APP_URL}/forms/independent-exit?t=${token}`;
export const exitMessage = (r: ExitConsent) => `שלום,

מצורף קישור אישי למילוי "אישור לשחרור תלמיד מבית הספר ללא ליווי הורי וללא הסעה" עבור ${r.student_name}:

${exitLink(r.token)}

הטופס נשמר אוטומטית. לאחר החתימה יש להוריד את ה-PDF ולאמת את החתימות אצל עו"ד.

תודה,
צוות בית הספר`;
export const exitWhatsAppUrl = (r: ExitConsent) => buildWhatsAppUrl(r.parent_phone, exitMessage(r));

export async function createExitInvite(i: { student_name: string; grade: string; parent_phone: string }) {
  const { data, error } = await T().insert([{ ...i, token: makeToken(), data: { student_name: i.student_name, grade: i.grade } }]).select().maybeSingle();
  if (error) { console.error(error); return null; }
  return data as ExitConsent;
}
export async function getExitConsents(): Promise<ExitConsent[]> {
  const { data, error } = await T().select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}
export async function getExitByToken(token: string): Promise<ExitConsent | null> {
  const { data } = await T().select("*").eq("token", token.trim().toLowerCase()).maybeSingle();
  return data || null;
}
export async function saveExitDraft(token: string, d: ExitData) {
  await T().update({ data: d, student_name: d.student_name || "", status: "in_progress", updated_at: new Date().toISOString() }).eq("token", token).neq("status", "submitted");
}
export async function submitExit(token: string | null, d: ExitData): Promise<boolean> {
  const row = { data: d, student_name: d.student_name || "", grade: d.grade || "", status: "submitted", submitted_at: new Date().toISOString() };
  const { error } = token ? await T().update(row).eq("token", token) : await T().insert([{ ...row, token: makeToken() }]);
  return !error;
}
export async function deleteExit(id: string) { await T().delete().eq("id", id); }

/* PDF */
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const heDate = (d?: string) => { if (!d) return ""; const x = new Date(d); return isNaN(x.getTime()) ? d : x.toLocaleDateString("he-IL"); };
async function toDataUrl(url: string) {
  try { const b = await (await fetch(url)).blob(); return await new Promise<string>((r) => { const f = new FileReader(); f.onload = () => r(String(f.result)); f.readAsDataURL(b); }); } catch { return ""; }
}
const box = (c?: boolean) => `<span style="display:inline-flex;width:14px;height:14px;border:1.5px solid #333;align-items:center;justify-content:center;font-weight:800;color:#1a5e42;margin-left:6px;vertical-align:middle;">${c ? "✓" : ""}</span>`;
const u = (v?: string) => `<span style="border-bottom:1px solid #888;padding:0 8px;font-weight:700;">${esc(v) || "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"}</span>`;
const sig = (n?: string, id?: string, s?: string) => `<div style="flex:1;border:1px solid #cfd8d5;border-radius:8px;padding:8px;">
  ${s?.startsWith("data:") ? `<img src="${s}" style="width:100%;height:55px;object-fit:contain;"/>` : `<div style="height:55px;"></div>`}
  <p style="font-size:11.5px;margin:4px 0 0;border-top:1px solid #aaa;padding-top:3px;">${esc(n) || "—"} · ת.ז. ${esc(id) || "—"}</p></div>`;

export async function generateExitPDF(d: ExitData) {
  const lg = await toDataUrl(logo);
  const way = d.mode_a_way === "walk" ? "ילך הביתה ברגל" : d.mode_a_way === "public" ? "ייסע לבדו בתחבורה ציבורית" : "";
  const html = `<div style="font-family:'Heebo',Arial,sans-serif;direction:rtl;padding:28px 34px;width:700px;box-sizing:border-box;color:#1a1a2e;line-height:1.6;background:#fff;font-size:12.5px;">
    <div style="text-align:center;margin-bottom:14px;">${lg ? `<img src="${lg}" style="height:60px;"/>` : ""}</div>
    <p style="margin:0;font-weight:700;">לכבוד: מחלקת היסעים<br/>הנהלת בית ספר בית אקשטיין<br/>יבנה</p>
    <p style="text-align:center;font-weight:800;text-decoration:underline;margin:12px 0;">הנדון: אישור לשחרור תלמיד מבית הספר ללא ליווי הורי וללא הסעה לחזרה הביתה בהסעה או ברגל</p>
    <p>אנו הח"מ, הורי התלמיד ${u(d.student_name)} ת.ז. ${u(d.student_id)}, נותנים את הסכמתנו המפורשת לכך כי ילדנו ישוחרר מבית הספר ללא ליווי הורי וללא הסעה או השגחה, ע"פ המודל הבא:</p>
    <p>${box(d.mode_a)}<b>א.</b> ${esc(MODE_TEXT.a)} ${way ? `(<b>${way}</b>)` : ""} מיום ${u(heDate(d.from_date))}.</p>
    <p>${box(d.mode_b)}<b>ב.</b> ${esc(MODE_TEXT.b)}</p>
    <p>${box(d.mode_c)}<b>ג.</b> ${esc(MODE_TEXT.c)}</p>
    <p>${esc(LIABILITY)}</p>
    <p style="font-weight:800;margin:10px 0 6px;">על החתום (הורי התלמיד) — תאריך: ${esc(heDate(d.sign_date))}</p>
    <div style="display:flex;gap:12px;">${sig(d.parent1_name, d.parent1_id, d.parent1_signature)}${sig(d.parent2_name, d.parent2_id, d.parent2_signature)}</div>
    <div style="margin-top:18px;border:1px dashed #888;border-radius:8px;padding:10px;">
      <p style="font-weight:800;margin:0 0 6px;">אימות חתימה</p>
      <p style="margin:0 0 8px;">אני הח"מ ____________________ עו"ד, מאשר כי מר/גב' ____________________ נושא/ת ת.ז. מספר ____________________ אשר הזדהה/הזדהתה בפני באמצעות תעודה מזהה, חתם/מה על מסמך זה בפני בתאריך: ______________.</p>
      <p style="margin:14px 0 0;">חתימת עו"ד: ______________________</p>
    </div>
    <p style="font-size:10.5px;color:#555;margin-top:10px;">• למען הסר ספק, מדובר אך ורק באימות חתימה ולא בייעוץ משפטי כזה או אחר.</p>
  </div>`;
  await renderPagedHTMLToPDF([html], `אישור-יציאה-עצמאית-${d.student_name || "תלמיד"}.pdf`);
}
