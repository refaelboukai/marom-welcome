import { supabase } from "@/integrations/supabase/client";
import { renderPagedHTMLToPDF } from "@/lib/pdf-export";
import logo from "@/assets/logo.jpeg";
import moeEmblem from "@/assets/moe-emblem.png";

export const ACADEMIC_YEAR = 'תשפ"ז';
export const WEEK_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי"];

export interface ShortDayRequest {
  id: string;
  academic_year: string;
  request_date: string | null;
  student_name: string;
  student_id_number: string;
  grade: string;
  school_name: string;
  homeroom_teacher: string;
  principal_name: string;
  exit_time: string;
  days: string[];
  start_date: string | null;
  reason: string;
  mother_name: string;
  mother_signature: string;
  mother_sign_date: string | null;
  father_name: string;
  father_signature: string;
  father_sign_date: string | null;
  declarations_accepted: boolean;
  decision: string;
  decision_exit_time: string;
  decision_days: string[];
  decision_notes: string;
  decision_date: string | null;
  sig_teacher: string;
  sig_treatment_coordinator: string;
  sig_counselor: string;
  sig_principal: string;
  sig_supervisor: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const DECISION_LABELS: Record<string, string> = {
  pending: "ממתין להחלטה",
  approved: "אושר",
  rejected: "לא אושר",
};

export const DECLARATIONS = [
  "הבקשה תיבחן על ידי הנהלת בית הספר והגורמים המוסמכים בלבד, ואין בהגשתה כדי להוות אישור אוטומטי.",
  `אישור הבקשה, ככל שיינתן, יהיה תקף לשנת הלימודים ${ACADEMIC_YEAR} בלבד, אלא אם יוחלט אחרת.`,
  "קיצור יום הלימודים אינו מחייב את משרד החינוך, הרשות המקומית או כל גורם אחר במתן הסעה נוספת או בשינוי מערך ההסעות.",
  "האחריות לאיסוף התלמיד/ה במועד המבוקש תחול על ההורים/האפוטרופוסים בלבד.",
  "ככל שהבקשה תאושר, אנו מתחייבים להוציא את ילדנו באופן קבוע בשעה ובימים שאושרו, אלא אם התקבל אישור מראש ובכתב לשינוי.",
  "ידוע לנו כי לקיצור יום הלימודים עשויות להיות השלכות לימודיות, חברתיות, טיפוליות ורגשיות, ואנו מקבלים אחריות על כך.",
];

export type ShortDayInput = Partial<Omit<ShortDayRequest, "id" | "created_at" | "updated_at">>;

export async function submitShortDayRequest(input: ShortDayInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { data, error } = await (supabase as any)
    .from("short_day_requests")
    .insert([{ ...input, status: "submitted" }])
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data?.id };
}

export async function getShortDayRequests(): Promise<ShortDayRequest[]> {
  const { data, error } = await (supabase as any)
    .from("short_day_requests").select("*").order("created_at", { ascending: false });
  if (error) { console.error("getShortDayRequests", error); return []; }
  return (data || []) as ShortDayRequest[];
}

export async function updateShortDayRequest(id: string, patch: ShortDayInput): Promise<boolean> {
  const { error } = await (supabase as any).from("short_day_requests").update(patch).eq("id", id);
  if (error) console.error("updateShortDayRequest", error);
  return !error;
}

export async function deleteShortDayRequest(id: string): Promise<boolean> {
  const { error } = await (supabase as any).from("short_day_requests").delete().eq("id", id);
  return !error;
}

/* ---------------- PDF (official A4 look) ---------------- */

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

const heDate = (d?: string | null) => {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString("he-IL");
};

const line = (label: string, value: string, width = "auto") => `
  <div style="display:flex;align-items:flex-end;gap:6px;margin:0 0 8px 0;${width === "auto" ? "" : `width:${width};`}">
    <span style="font-size:12px;color:#333;white-space:nowrap;">${esc(label)}</span>
    <span style="flex:1;border-bottom:1px solid #99a;min-height:17px;font-size:12.5px;font-weight:700;padding:0 4px;">${esc(value) || "&nbsp;"}</span>
  </div>`;

const checkbox = (checked: boolean, label: string) => `
  <span style="display:inline-flex;align-items:center;gap:5px;margin-left:14px;font-size:12px;">
    <span style="width:13px;height:13px;border:1.5px solid #333;display:inline-block;text-align:center;line-height:11px;font-size:11px;font-weight:800;color:#1a5e42;">${checked ? "✓" : ""}</span>
    ${esc(label)}
  </span>`;

const sigBox = (label: string, name: string, img: string, date?: string | null) => `
  <div style="flex:1;border:1px solid #cfd8d5;border-radius:8px;padding:10px;">
    <p style="font-size:11px;color:#666;margin:0 0 3px 0;">${esc(label)}</p>
    <p style="font-size:12.5px;font-weight:700;margin:0 0 6px 0;">${esc(name) || "—"}</p>
    ${img?.startsWith("data:")
      ? `<img src="${img}" style="width:100%;height:80px;object-fit:contain;" />`
      : `<div style="height:80px;border-bottom:1px dashed #aaa;"></div>`}
    <p style="font-size:10.5px;color:#666;margin:5px 0 0 0;">תאריך: ${esc(heDate(date))}</p>
  </div>`;

function header(logoSrc: string | null, moeSrc: string | null, subtitle: string) {
  return `
    <div style="display:flex;align-items:center;gap:12px;border-bottom:3px solid #4a9a7a;padding-bottom:10px;margin-bottom:16px;">
      ${logoSrc ? `<img src="${logoSrc}" style="height:52px;border-radius:8px;" />` : ""}
      <div style="flex:1;text-align:center;">
        <h1 style="font-size:18px;font-weight:800;margin:0;color:#14213d;">בקשת הורים לקיצור יום לימודים</h1>
        <p style="font-size:11.5px;color:#555;margin:3px 0 0 0;">בית ספר מרום — בית אקשטיין יבנה &nbsp;|&nbsp; שנת הלימודים ${esc(ACADEMIC_YEAR)}${subtitle ? ` &nbsp;|&nbsp; ${esc(subtitle)}` : ""}</p>
      </div>
      ${moeSrc ? `<div style="text-align:center;"><img src="${moeSrc}" style="height:46px;" /><p style="font-size:8.5px;color:#14213d;margin:2px 0 0 0;font-weight:700;">מדינת ישראל<br/>משרד החינוך</p></div>` : ""}
    </div>`;
}

export async function generateShortDayPDF(r: ShortDayRequest, opts?: { targetWindow?: Window | null; compact?: boolean }) {
  const [logoSrc, moeSrc] = await Promise.all([toDataUrl(logo), toDataUrl(moeEmblem)]);
  const wrap = (body: string, subtitle = "") => `
    <div style="font-family:'Heebo','Rubik',Arial,sans-serif;direction:rtl;padding:32px;width:700px;box-sizing:border-box;color:#1a1a2e;line-height:1.6;background:#fff;">
      ${header(logoSrc, moeSrc, subtitle)}${body}
    </div>`;

  const page1 = `
    ${line("תאריך:", heDate(r.request_date), "45%")}
    ${line("לכבוד מחנך/ת הכיתה:", r.homeroom_teacher)}
    ${line("מנהל/ת בית הספר:", r.principal_name)}
    <p style="font-size:13px;font-weight:800;margin:14px 0 8px 0;">הנדון: בקשת הורים לקיצור יום הלימודים</p>
    <p style="font-size:12.5px;margin:0 0 8px 0;">אנו, הורי/אפוטרופסי התלמיד/ה:</p>
    ${line("שם התלמיד/ה:", r.student_name)}
    <div style="display:flex;gap:16px;">${line("ת.ז.:", r.student_id_number, "48%")}${line("כיתה:", r.grade, "48%")}</div>
    ${line("בבית הספר:", r.school_name)}
    <p style="font-size:12.5px;margin:10px 0;">מבקשים לאשר קיצור קבוע של יום הלימודים עבור בננו/בתנו במהלך שנת הלימודים ${esc(ACADEMIC_YEAR)}.</p>
    <div style="display:flex;gap:16px;">${line("שעת היציאה המבוקשת:", r.exit_time, "48%")}${line("החל מתאריך:", heDate(r.start_date), "48%")}</div>
    <p style="font-size:12px;margin:6px 0 4px 0;font-weight:700;">הימים המבוקשים:</p>
    <div style="margin-bottom:12px;">${WEEK_DAYS.map((d) => checkbox((r.days || []).includes(d), d)).join("")}</div>
    <p style="font-size:12.5px;font-weight:800;color:#2f6f58;margin:0 0 4px 0;">נימוק לבקשה</p>
    <div style="border:1px solid #cfd8d5;border-radius:8px;min-height:120px;padding:10px;font-size:12px;white-space:pre-wrap;">${esc(r.reason)}</div>`;

  const page2 = `
    <p style="font-size:13.5px;font-weight:800;margin:0 0 6px 0;">הצהרת ההורים</p>
    <p style="font-size:12px;margin:0 0 6px 0;">ידוע לנו כי:</p>
    <ol style="font-size:11.8px;padding-right:18px;margin:0 0 16px 0;">
      ${DECLARATIONS.map((d) => `<li style="margin-bottom:5px;">${esc(d)}</li>`).join("")}
    </ol>
    <div style="display:flex;gap:14px;">
      ${sigBox("שם האם/האפוטרופוס וחתימה", r.mother_name, r.mother_signature, r.mother_sign_date)}
      ${sigBox("שם האב/האפוטרופוס וחתימה", r.father_name, r.father_signature, r.father_sign_date)}
    </div>`;

  const page3 = `
    <p style="font-size:13.5px;font-weight:800;margin:0 0 8px 0;">החלטת בית הספר</p>
    ${line("שם התלמיד/ה:", r.student_name)}
    <p style="font-size:12px;margin:8px 0 6px 0;">לאחר בחינת הבקשה הוחלט:</p>
    <div style="margin-bottom:12px;">
      ${checkbox(r.decision === "approved", "לאשר את הבקשה")}
      ${checkbox(r.decision === "rejected", "לא לאשר את הבקשה")}
    </div>
    ${line("שעת היציאה שאושרה (במידה ואושר):", r.decision_exit_time)}
    ${line("ימים שאושרו:", (r.decision_days || []).join(", "))}
    <p style="font-size:12px;font-weight:700;margin:10px 0 4px 0;">הערות / נימוקים:</p>
    <div style="border:1px solid #cfd8d5;border-radius:8px;min-height:90px;padding:10px;font-size:12px;white-space:pre-wrap;margin-bottom:14px;">${esc(r.decision_notes)}</div>
    ${[["מחנך/ת הכיתה", r.sig_teacher], ["רכז/ת טיפול", r.sig_treatment_coordinator], ["יועץ/ת בית הספר", r.sig_counselor], ["מנהל/ת בית הספר", r.sig_principal], ["מפקח/ת חינוך מיוחד", r.sig_supervisor]]
      .map(([l, v]) => `<div style="display:flex;gap:16px;">${line(`${l}:`, String(v || ""), "58%")}${line("חתימה:", "", "38%")}</div>`).join("")}
    ${line("תאריך ההחלטה:", heDate(r.decision_date), "45%")}`;

  await renderPagedHTMLToPDF(
    [wrap(page1), wrap(page2, "הצהרות וחתימות"), wrap(page3, "החלטת בית הספר")],
    `בקשה-לקיצור-יום-לימודים-${r.student_name || "תלמיד"}.pdf`,
    opts,
  );
}