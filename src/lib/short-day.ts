import { supabase } from "@/integrations/supabase/client";
import { renderPagedHTMLToPDF } from "@/lib/pdf-export";
import moeLogo from "@/assets/moe-logo.jpeg";

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
  "ידוע לנו כי ככל שתצורף לבקשה חוות דעת או אישור מרופא/ה פסיכיאטר/ית, הממליצים על קיצור יום הלימודים מטעמים רפואיים, תפקודיים או נפשיים, רשאית הרשות המקומית לבחון את התאמת מערך ההסעות בהתאם להוראות משרד החינוך, לנהליה ולסמכויותיה. מובהר כי כל החלטה בעניין ההסעה נתונה לשיקול דעתה של הרשות המקומית והגורמים המוסמכים, ובכפוף לקבלת כלל האישורים הנדרשים.",
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
  <div style="display:flex;align-items:flex-end;gap:6px;margin:0 0 10px 0;${width === "auto" ? "" : `width:${width};`}">
    <span style="font-size:11.5px;color:#4a5568;white-space:nowrap;line-height:20px;">${esc(label)}</span>
    <span style="flex:1;min-width:0;border-bottom:1px solid #b6c2c0;line-height:20px;font-size:12.5px;font-weight:700;color:#14213d;padding:0 4px 2px 4px;text-align:center;white-space:nowrap;">${esc(value) || "&nbsp;"}</span>
  </div>`;

const checkbox = (checked: boolean, label: string) => `
  <span style="display:inline-flex;align-items:center;gap:5px;margin-left:14px;font-size:12px;line-height:16px;vertical-align:middle;">
    <span style="width:14px;height:14px;box-sizing:border-box;border:1.5px solid #333;display:inline-flex;align-items:center;justify-content:center;font-size:11px;line-height:1;font-weight:800;color:#1a5e42;flex:none;">${checked ? "✓" : ""}</span>
    <span>${esc(label)}</span>
  </span>`;

const sigBox = (label: string, name: string, img: string, date?: string | null) => `
  <div style="flex:1;border:1px solid #cfd8d5;border-radius:8px;padding:10px;">
    <p style="font-size:11px;color:#666;margin:0 0 3px 0;">${esc(label)}</p>
    <p style="font-size:12.5px;font-weight:700;margin:0 0 6px 0;">${esc(name) || "—"}</p>
    ${img?.startsWith("data:")
      ? `<img src="${img}" style="width:100%;height:58px;object-fit:contain;" />`
      : `<div style="height:58px;border-bottom:1px dashed #aaa;"></div>`}
    <p style="font-size:10.5px;color:#666;margin:5px 0 0 0;">תאריך: ${esc(heDate(date))}</p>
  </div>`;

function header(logoSrc: string | null, moeSrc: string | null, subtitle: string) {
  return `
    <div style="display:flex;align-items:center;gap:12px;border-bottom:3px solid #4a9a7a;padding-bottom:10px;margin-bottom:16px;">
      <div style="flex:1;text-align:center;">
        <h1 style="font-size:18px;font-weight:800;margin:0;color:#14213d;">בקשה לקיצור יום לימודים — בית ספר חינוך מיוחד</h1>
        <p style="font-size:12.5px;font-weight:700;color:#14213d;margin:3px 0 0 0;">משרד החינוך — מחוז מרכז</p>
        <p style="font-size:11.5px;color:#555;margin:2px 0 0 0;">שנת הלימודים ${esc(ACADEMIC_YEAR)}${subtitle ? ` &nbsp;|&nbsp; ${esc(subtitle)}` : ""}</p>
      </div>
      ${moeSrc ? `<div style="text-align:center;"><img src="${moeSrc}" style="height:62px;object-fit:contain;" /></div>` : ""}
    </div>`;
}

export async function generateShortDayPDF(r: ShortDayRequest, opts?: { targetWindow?: Window | null; compact?: boolean }) {
  const moeSrc = await toDataUrl(moeLogo);
  const decided = r.decision === "approved" || r.decision === "rejected";

  const decisionBlock = decided ? `
    <div style="border:1px solid #cfd8d5;border-radius:8px;padding:8px 10px;margin-top:8px;background:#f7faf9;">
      <p style="font-size:11.5px;font-weight:800;margin:0 0 4px 0;color:#2f6f58;">החלטת בית הספר</p>
      <div style="margin-bottom:4px;">
        ${checkbox(r.decision === "approved", "לאשר את הבקשה")}
        ${checkbox(r.decision === "rejected", "לא לאשר את הבקשה")}
        <span style="font-size:10.5px;color:#555;">תאריך: ${esc(heDate(r.decision_date))}</span>
      </div>
      <div style="display:flex;gap:12px;">
        ${line("שעה שאושרה:", r.decision_exit_time, "48%")}
        ${line("ימים שאושרו:", (r.decision_days || []).join(", "), "48%")}
      </div>
      ${r.decision_notes ? `<p style="font-size:10.8px;margin:2px 0 4px 0;white-space:pre-wrap;"><b>הערות:</b> ${esc(r.decision_notes)}</p>` : ""}
      <div style="display:flex;flex-wrap:wrap;gap:10px;">
        ${[["מחנך/ת", r.sig_teacher], ["רכז/ת טיפול", r.sig_treatment_coordinator], ["יועץ/ת", r.sig_counselor], ["מנהל/ת", r.sig_principal], ["מפקח/ת", r.sig_supervisor]]
          .filter(([, v]) => String(v || "").trim())
          .map(([l, v]) => `<span style="font-size:10.5px;">${esc(l)}: <b>${esc(v)}</b></span>`).join("")}
      </div>
    </div>` : "";

  const body = `
    <div style="display:flex;gap:14px;">${line("תאריך:", heDate(r.request_date), "34%")}${line("מחנך/ת הכיתה:", r.homeroom_teacher, "32%")}${line("מנהל/ת בית הספר:", r.principal_name, "32%")}</div>
    <p style="font-size:12px;font-weight:800;margin:4px 0 6px 0;">הנדון: בקשת הורים לקיצור יום הלימודים</p>
    <div style="display:flex;gap:14px;">${line("שם התלמיד/ה:", r.student_name, "40%")}${line("ת.ז.:", r.student_id_number, "30%")}${line("כיתה:", r.grade, "26%")}</div>
    <div style="display:flex;gap:14px;">${line("בית הספר:", r.school_name, "44%")}${line("שעת היציאה המבוקשת:", r.exit_time, "28%")}${line("החל מתאריך:", heDate(r.start_date), "26%")}</div>
    <div style="display:flex;align-items:center;gap:6px;margin:2px 0 8px 0;">
      <span style="font-size:11.5px;font-weight:700;white-space:nowrap;">הימים המבוקשים:</span>
      <span>${WEEK_DAYS.map((d) => checkbox((r.days || []).includes(d), d)).join("")}</span>
    </div>
    <p style="font-size:11.5px;font-weight:800;color:#2f6f58;margin:0 0 3px 0;">נימוק לבקשה</p>
    <div style="border:1px solid #cfd8d5;border-radius:8px;min-height:62px;padding:8px;font-size:11px;white-space:pre-wrap;line-height:1.45;">${esc(r.reason)}</div>
    <p style="font-size:11.5px;font-weight:800;margin:10px 0 2px 0;">הצהרת ההורים — ידוע לנו כי:</p>
    <ol style="font-size:9.4px;padding-right:15px;margin:0 0 8px 0;line-height:1.4;">
      ${DECLARATIONS.map((d) => `<li style="margin-bottom:2px;">${esc(d)}</li>`).join("")}
    </ol>
    <div style="display:flex;gap:12px;">
      ${sigBox("שם האם/האפוטרופוס וחתימה", r.mother_name, r.mother_signature, r.mother_sign_date)}
      ${sigBox("שם האב/האפוטרופוס וחתימה", r.father_name, r.father_signature, r.father_sign_date)}
    </div>
    ${decisionBlock}`;

  const page = `
    <div style="font-family:'Heebo','Rubik',Arial,sans-serif;direction:rtl;padding:26px 30px;width:700px;box-sizing:border-box;color:#1a1a2e;line-height:1.5;background:#fff;">
      ${header(null, moeSrc, "")}${body}
    </div>`;

  await renderPagedHTMLToPDF(
    [page],
    `בקשה-לקיצור-יום-לימודים-${r.student_name || "תלמיד"}.pdf`,
    opts,
  );
}
