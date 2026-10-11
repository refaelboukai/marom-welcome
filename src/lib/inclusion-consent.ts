import { supabase } from "@/integrations/supabase/client";
import { renderPagedHTMLToPDF } from "@/lib/pdf-export";
import moeState from "@/assets/moe-state.png";
import moeDistrict from "@/assets/moe-district.png";
import { ACADEMIC_YEAR } from "@/lib/short-day";

export interface InclusionConsent {
  id: string;
  academic_year: string;
  request_date: string | null;
  student_name: string;
  birth_date: string | null;
  student_id_number: string;
  grade: string;
  school_name: string;
  receiving_school: string;
  inclusion_day: string;
  inclusion_hours: string;
  start_date: string | null;
  arrival_notes: string;
  return_destination: string; // "home" | "marom"
  parent1_name: string;
  parent1_phone: string;
  parent1_signature: string;
  parent1_sign_date: string | null;
  parent2_name: string;
  parent2_phone: string;
  parent2_signature: string;
  parent2_sign_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export const RETURN_DESTINATIONS: Record<string, string> = {
  home: "חזרה עצמאית הביתה",
  marom: "חזרה עצמאית לבית ספר מרום",
};

export type InclusionConsentInput = Partial<Omit<InclusionConsent, "id" | "created_at" | "updated_at">>;

export async function submitInclusionConsent(input: InclusionConsentInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { data, error } = await (supabase as any)
    .from("inclusion_consents")
    .insert([{ ...input, status: "submitted" }])
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data?.id };
}

export async function getInclusionConsents(): Promise<InclusionConsent[]> {
  const { data, error } = await (supabase as any)
    .from("inclusion_consents").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("getInclusionConsents", error);
    throw new Error(error.message || "טעינת הטפסים נכשלה");
  }
  return (data || []) as InclusionConsent[];
}

export async function deleteInclusionConsent(id: string): Promise<boolean> {
  const { error } = await (supabase as any).from("inclusion_consents").delete().eq("id", id);
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

const sigBox = (label: string, name: string, phone: string, img: string, date?: string | null) => `
  <div style="flex:1;border:1px solid #cfd8d5;border-radius:8px;padding:10px;">
    <p style="font-size:11px;color:#666;margin:0 0 3px 0;">${esc(label)}</p>
    <p style="font-size:12.5px;font-weight:700;margin:0 0 2px 0;">${esc(name) || "—"}</p>
    <p style="font-size:10.5px;color:#555;margin:0 0 6px 0;">טלפון: ${esc(phone) || "—"}</p>
    ${img?.startsWith("data:")
      ? `<img src="${img}" style="width:100%;height:58px;object-fit:contain;" />`
      : `<div style="height:58px;border-bottom:1px dashed #aaa;"></div>`}
    <p style="font-size:10.5px;color:#666;margin:5px 0 0 0;">תאריך: ${esc(heDate(date))}</p>
  </div>`;

export async function generateInclusionConsentPDF(r: InclusionConsent, opts?: { targetWindow?: Window | null; compact?: boolean }) {
  const [moeSrc, districtSrc] = await Promise.all([toDataUrl(moeState), toDataUrl(moeDistrict)]);

  const header = `
    <div style="display:flex;align-items:center;gap:12px;border-bottom:3px solid #4a9a7a;padding-bottom:10px;margin-bottom:14px;">
      ${districtSrc ? `<img src="${districtSrc}" style="height:40px;object-fit:contain;" />` : ""}
      <div style="flex:1;text-align:center;">
        <h1 style="font-size:17px;font-weight:800;margin:0;color:#14213d;">בקשה לאישור הורים — שילוב לימודי בבית ספר ${esc(r.receiving_school)}</h1>
        <p style="font-size:12px;font-weight:700;color:#14213d;margin:3px 0 0 0;">בית ספר מרום – בית אקשטיין, יבנה</p>
        <p style="font-size:11px;color:#555;margin:2px 0 0 0;">שנת הלימודים ${esc(r.academic_year || ACADEMIC_YEAR)} &nbsp;|&nbsp; תאריך: ${esc(heDate(r.request_date))}</p>
      </div>
      ${moeSrc ? `<div style="text-align:center;"><img src="${moeSrc}" style="height:60px;object-fit:contain;" /></div>` : ""}
    </div>`;

  const body = `
    <p style="font-size:12px;font-weight:800;margin:0 0 6px 0;">הורים יקרים,</p>
    <p style="font-size:11.5px;margin:0 0 6px 0;line-height:1.55;">
      כחלק מרצוננו לקדם את ${esc(r.student_name)}, לטפח את יכולותיו/ה ולהרחיב את הזדמנויותיו/ה הלימודיות והחברתיות, אנו מבקשים את הסכמתכם להתחלת תהליך שילוב לימודי בבית ספר ${esc(r.receiving_school)}, במסגרת החינוך הרגיל.
    </p>
    <p style="font-size:11.5px;margin:0 0 12px 0;line-height:1.55;">
      התהליך נועד לאפשר לתלמיד/ה להתנסות בסביבה לימודית נוספת, לחזק את העצמאות ואת תחושת המסוגלות ולעודד את ההתפתחות האישית. השילוב ילווה בקשר בין צוותי בתי הספר ובשיתוף עמכם, תוך מעקב אחר ההשתלבות והתאמת התהליך לצרכי התלמיד/ה.
    </p>

    <p style="font-size:12px;font-weight:800;color:#2f6f58;margin:0 0 6px 0;">פרטי התלמיד/ה</p>
    <div style="display:flex;gap:14px;">${line("שם מלא:", r.student_name, "40%")}${line("תאריך לידה:", heDate(r.birth_date), "28%")}${line("ת.ז.:", r.student_id_number, "28%")}</div>
    <div style="display:flex;gap:14px;">${line("כיתה:", r.grade, "30%")}${line("בית הספר:", r.school_name, "64%")}</div>

    <p style="font-size:12px;font-weight:800;color:#2f6f58;margin:8px 0 6px 0;">פרטי השילוב</p>
    <div style="display:flex;gap:14px;">${line("בית הספר הקולט:", r.receiving_school, "44%")}${line("מועד השילוב:", `אחת לשבוע, ביום ${r.inclusion_day}, בשעות ${r.inclusion_hours}`, "52%")}</div>
    <div style="display:flex;gap:14px;">${line("תאריך תחילת השילוב:", heDate(r.start_date), "44%")}${line("הגעה:", r.arrival_notes || "התלמיד/ה יגיע/תגיע באופן עצמאי", "52%")}</div>

    <p style="font-size:12px;font-weight:800;color:#2f6f58;margin:10px 0 6px 0;">אישור הורים / אפוטרופוסים</p>
    <p style="font-size:11.5px;margin:0 0 6px 0;line-height:1.55;">
      אנו, הורי התלמיד/ה ${esc(r.student_name)} / האפוטרופוסים שלו/ה, מאשרים כי קראנו את פרטי תכנית השילוב ומסכימים להשתתפותו/ה בשילוב הלימודי בבית ספר ${esc(r.receiving_school)}, אחת לשבוע, בימי ${esc(r.inclusion_day)}, בשעות ${esc(r.inclusion_hours)}.
    </p>
    <p style="font-size:11.5px;margin:0 0 6px 0;line-height:1.55;">
      אנו מאשרים את הגעתו/ה העצמאית לבית הספר הקולט ואת יציאתו/ה העצמאית ממנו בתום הפעילות, ליעד המסומן להלן (סומנה אפשרות אחת):
    </p>
    <div style="margin:0 0 8px 0;">
      ${checkbox(r.return_destination === "home", RETURN_DESTINATIONS.home)}
      ${checkbox(r.return_destination === "marom", RETURN_DESTINATIONS.marom)}
    </div>
    <p style="font-size:10.5px;color:#444;margin:0 0 12px 0;line-height:1.5;">
      כל שינוי ביעד החזרה או בהסדרי ההגעה והיציאה יימסר בכתב לצוות בית ספר מרום ויתואם עמו מראש.
    </p>

    <div style="display:flex;gap:12px;">
      ${sigBox("הורה / אפוטרופוס", r.parent1_name, r.parent1_phone, r.parent1_signature, r.parent1_sign_date)}
      ${sigBox("הורה / אפוטרופוס נוסף", r.parent2_name, r.parent2_phone, r.parent2_signature, r.parent2_sign_date)}
    </div>

    <div style="margin-top:16px;text-align:left;">
      <p style="font-size:11.5px;margin:0;">בברכה,</p>
      <p style="font-size:12px;font-weight:800;margin:2px 0 0 0;">רפאל בוקעי — מנהל בית הספר</p>
      <p style="font-size:10.5px;color:#555;margin:1px 0 0 0;">מרום – בית אקשטיין, יבנה</p>
    </div>`;

  const page = `
    <div style="font-family:'Heebo','Rubik',Arial,sans-serif;direction:rtl;padding:26px 30px;width:700px;box-sizing:border-box;color:#1a1a2e;line-height:1.5;background:#fff;">
      ${header}${body}
    </div>`;

  await renderPagedHTMLToPDF(
    [page],
    `אישור-הורים-שילוב-${r.student_name || "תלמיד"}.pdf`,
    opts,
  );
}
