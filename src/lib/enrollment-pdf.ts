import { FORM_STEPS, FormGroup } from "@/data/enrollment-form";
import { EnrollmentForm, FormValues, flattenForm } from "@/lib/enrollment";
import { renderPagedHTMLToPDF } from "@/lib/pdf-export";
import { getEnrollmentDocUrl, fileNameFromPath } from "@/lib/enrollment-uploads";
import logo from "@/assets/logo.jpeg";

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ---------- assets ---------- */
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

let logoCache: string | null | undefined;
async function logoData(): Promise<string | null> {
  if (logoCache === undefined) logoCache = await toDataUrl(logo);
  return logoCache;
}

const isImagePath = (p: string) => /\.(jpe?g|png|webp|heic|gif)$/i.test(p);

interface DocImage { label: string; src: string; name: string }

/** Shrink a data-URL image (used by the light/fast PDF) to keep the file small. */
async function shrinkDataUrl(data: string, maxSide = 900, quality = 0.55): Promise<string> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = data;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    if (scale >= 1) return data;
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    const ctx = c.getContext("2d");
    if (!ctx) return data;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", quality);
  } catch { return data; }
}

/** Resolve every uploaded document into an inline (colour) data-URL image. */
async function collectDocs(values: FormValues, compact = false): Promise<{ images: DocImage[]; others: string[] }> {
  const images: DocImage[] = [];
  const others: string[] = [];
  for (const step of FORM_STEPS) {
    for (const g of step.groups) {
      for (const f of g.fields) {
        if (f.type !== "file") continue;
        const raw = values[f.key];
        const paths = Array.isArray(raw) ? raw : typeof raw === "string" && raw ? [raw] : [];
        for (const p of paths as string[]) {
          const name = fileNameFromPath(p);
          if (!isImagePath(p)) { others.push(`${f.label} — ${name}`); continue; }
          const url = await getEnrollmentDocUrl(p, 600);
          const raw2 = url ? await toDataUrl(url) : null;
          const data = raw2 && compact ? await shrinkDataUrl(raw2) : raw2;
          if (data) images.push({ label: f.label, src: data, name });
          else others.push(`${f.label} — ${name}`);
        }
      }
    }
  }
  return { images, others };
}

export const displayValue = (v: unknown): string => {
  if (v === true) return "כן";
  if (v === false || v == null || v === "") return "—";
  if (typeof v === "string" && v.startsWith("data:image")) return "חתימה ידנית";
  if (Array.isArray(v)) {
    if (!v.length) return "—";
    return v.map((x) => (typeof x === "string" && x.includes("/") && /-\d{10,}-/.test(x)
      ? (x.split("/").pop() || x).replace(/^[\w-]+-\d{10,}-/, "")
      : x)).join(", ");
  }
  return String(v);
};

const dateStr = (values: FormValues) => {
  const raw = typeof values.filled_at === "string" ? values.filled_at : "";
  const d = raw ? new Date(raw) : new Date();
  return isNaN(d.getTime()) ? new Date().toLocaleDateString("he-IL") : d.toLocaleDateString("he-IL");
};

/** Every page carries the Beit Ekstein logo, the form type title and the fill date. */
const PAGE = (opts: {
  logoSrc: string | null; title: string; student: string; filled: string; subtitle?: string; body: string;
}) => `
  <div style="font-family:'Heebo','Rubik',Arial,sans-serif;direction:rtl;padding:34px;width:700px;box-sizing:border-box;color:#1a1a2e;line-height:1.55;background:#fff;">
    <div style="display:flex;align-items:center;gap:12px;border-bottom:3px solid #4a9a7a;padding-bottom:12px;margin-bottom:18px;">
      ${opts.logoSrc ? `<img src="${opts.logoSrc}" style="height:52px;width:auto;border-radius:8px;" />` : ""}
      <div style="flex:1;">
        <h1 style="font-size:19px;font-weight:800;margin:0;color:#1a1a2e;">${esc(opts.title)}</h1>
        <p style="font-size:11.5px;color:#666;margin:3px 0 0 0;">בית ספר מרום — בית אקשטיין יבנה${opts.subtitle ? ` &nbsp;|&nbsp; ${esc(opts.subtitle)}` : ""}</p>
      </div>
      <div style="text-align:left;font-size:10.5px;color:#666;line-height:1.5;">
        <div style="font-weight:700;color:#2f6f58;">${esc(opts.student || "—")}</div>
        <div>תאריך מילוי: ${esc(opts.filled)}</div>
      </div>
    </div>
    ${opts.body}
  </div>`;

const groupHTML = (g: FormGroup, values: FormValues) => {
  const fields = g.fields.filter((f) => f.type !== "note" && f.type !== "signature");
  if (!fields.length) return "";
  return `
    <div style="margin-bottom:14px;break-inside:avoid;">
      <p style="font-size:12.5px;font-weight:800;color:#2f6f58;margin:0 0 5px 0;border-right:4px solid #4a9a7a;padding-right:8px;">${esc(g.title)}</p>
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        ${fields.map((f, i) => `
          <tr style="background:${i % 2 ? "#f7faf9" : "#fff"};">
            <td style="padding:5px 8px;color:#555;width:58%;border-bottom:1px solid #eef2f1;">${esc(f.label)}</td>
            <td style="padding:5px 8px;font-weight:600;border-bottom:1px solid #eef2f1;">${esc(displayValue(values[f.key]))}</td>
          </tr>`).join("")}
      </table>
    </div>`;
};

const ROWS_PER_PAGE = 26;
const groupRows = (g: FormGroup) => g.fields.filter((f) => f.type !== "note" && f.type !== "signature").length + 2;

/** Split each form step into whole pages — groups are never cut in half. */
function stepPages(values: FormValues): { title: string; body: string }[] {
  const pages: { title: string; body: string }[] = [];
  for (const step of FORM_STEPS) {
    let buf = "";
    let rows = 0;
    let part = 1;
    const flush = () => {
      if (!buf) return;
      pages.push({ title: part === 1 ? step.label : `${step.label} (המשך)`, body: buf });
      buf = ""; rows = 0; part++;
    };
    for (const g of step.groups) {
      const html = groupHTML(g, values);
      if (!html) continue;
      const r = groupRows(g);
      if (rows + r > ROWS_PER_PAGE) flush();
      buf += html; rows += r;
    }
    flush();
  }
  return pages;
}

function signatureHTML(values: FormValues): string {
  const box = (label: string, name: string, img: unknown) => `
    <div style="flex:1;border:1px solid #dbe7e2;border-radius:10px;padding:12px;">
      <p style="font-size:11px;color:#666;margin:0 0 4px 0;">${esc(label)}</p>
      <p style="font-size:12.5px;font-weight:700;margin:0 0 8px 0;">${esc(name || "—")}</p>
      ${typeof img === "string" && img.startsWith("data:")
        ? `<img src="${img}" style="width:100%;height:110px;object-fit:contain;" />`
        : `<div style="height:110px;border-bottom:1px dashed #bbb;"></div>`}
    </div>`;
  return `
    <div style="display:flex;gap:14px;margin-bottom:16px;">
      ${box("חתימת הורה / אפוטרופוס", String(values.signature_name || ""), values.signature_draw)}
      ${box("חתימת התלמיד/ה", String(values.student_signature_name || ""), values.student_signature_draw)}
    </div>
    <p style="font-size:11px;color:#555;margin:0;">
      החתימות לעיל מהוות אישור לכל הפרטים, ההצהרות וההסכמות שמולאו בטופס זה.
      ת.ז. החותם/ת: ${esc(displayValue(values.signature_id_number))} &nbsp;|&nbsp; תאריך מילוי: ${esc(dateStr(values))}
    </p>`;
}

function docsPages(images: DocImage[], others: string[]): string[] {
  const pages: string[] = [];
  for (let i = 0; i < images.length; i += 2) {
    const chunk = images.slice(i, i + 2);
    pages.push(chunk.map((im) => `
      <div style="margin-bottom:16px;">
        <p style="font-size:12.5px;font-weight:800;color:#2f6f58;margin:0 0 6px 0;">${esc(im.label)}</p>
        <div style="border:1px solid #dbe7e2;border-radius:10px;padding:8px;text-align:center;">
          <img src="${im.src}" style="max-width:100%;max-height:330px;object-fit:contain;" />
        </div>
        <p style="font-size:9.5px;color:#999;margin:4px 0 0 0;">${esc(im.name)}</p>
      </div>`).join(""));
  }
  if (others.length) {
    pages.push(`<p style="font-size:12.5px;font-weight:800;color:#2f6f58;margin:0 0 6px 0;">קבצים נוספים שצורפו</p>
      <ul style="font-size:11.5px;padding-right:18px;margin:0;">${others.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>`);
  }
  return pages;
}

/** PDF of a single submitted form (or an in-progress draft). */
export async function generateEnrollmentPDF(
  values: FormValues,
  studentName: string,
  subtitle = "",
  opts?: { targetWindow?: Window | null },
) {
  const src = await logoData();
  const filled = dateStr(values);
  const { images, others } = await collectDocs(values);
  const name = studentName || `${values.student_first_name || ""} ${values.student_last_name || ""}`.trim();

  const pages: string[] = [];
  const push = (title: string, body: string) =>
    pages.push(PAGE({ logoSrc: src, title, student: name, filled, subtitle, body }));

  push("טופס קליטה לתלמיד/ה חדש/ה", `
    <div style="text-align:center;padding:40px 0;">
      <h2 style="font-size:26px;font-weight:800;margin:0 0 10px 0;">טופס קליטה לתלמיד/ה חדש/ה</h2>
      <p style="font-size:16px;font-weight:700;color:#2f6f58;margin:0 0 6px 0;">${esc(name || "—")}</p>
      <p style="font-size:12.5px;color:#666;margin:0 0 4px 0;">כיתה: ${esc(displayValue(values.grade))} &nbsp;|&nbsp; ת.ז.: ${esc(displayValue(values.student_id_number))}</p>
      <p style="font-size:12.5px;color:#666;margin:0;">תאריך מילוי הטופס: ${esc(filled)}</p>
      ${subtitle ? `<p style="font-size:12px;color:#888;margin:8px 0 0 0;">${esc(subtitle)}</p>` : ""}
      <p style="font-size:11px;color:#999;margin:26px 0 0 0;">מסמך חסוי — לשימוש מזכירות וצוות בית הספר בלבד</p>
    </div>`);

  for (const p of stepPages(values)) push(p.title, p.body);
  push("חתימות", signatureHTML(values));
  for (const body of docsPages(images, others)) push("מסמכים שצורפו", body);

  await renderPagedHTMLToPDF(pages, `טופס-קליטה-${name || "תלמיד"}.pdf`, opts);
}

export interface FieldDiff {
  stepLabel: string;
  label: string;
  a: string;
  b: string;
}

/** Compare the two parents' submissions and return conflicting answers. */
export function compareForms(a: FormValues, b: FormValues): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  for (const step of FORM_STEPS) {
    for (const g of step.groups) {
      for (const f of g.fields) {
        if (f.type === "note") continue;
        const av = displayValue(a[f.key]);
        const bv = displayValue(b[f.key]);
        if (av === bv) continue;
        if (av === "—" && bv === "—") continue;
        diffs.push({ stepLabel: step.label, label: f.label, a: av, b: bv });
      }
    }
  }
  return diffs;
}

/** Merge: parent A is the base, parent B fills the gaps. */
export function mergeForms(a: FormValues, b: FormValues): FormValues {
  const merged: FormValues = { ...b };
  for (const [k, v] of Object.entries(a)) {
    const empty = v == null || v === "" || v === false || (Array.isArray(v) && v.length === 0);
    if (!empty) merged[k] = v;
  }
  return merged;
}

/** Combined PDF for two parents: merged record + a conflicts table. */
export async function generateCombinedEnrollmentPDF(
  formA: EnrollmentForm,
  formB: EnrollmentForm,
) {
  const a = flattenForm(formA);
  const b = flattenForm(formB);
  const diffs = compareForms(a, b);
  const studentName = `${formA.student_first_name} ${formA.student_last_name}`.trim();
  const nameA = formA.parent1_name || formA.parent2_name || "הורה א׳";
  const nameB = formB.parent1_name || formB.parent2_name || "הורה ב׳";

  const diffTable = `
    <div data-section style="margin-bottom:18px;">
      <h2 style="font-size:15px;font-weight:800;color:#2f6f58;margin:0 0 6px 0;">השוואה בין שני ההורים</h2>
      <p style="font-size:11px;color:#777;margin:0 0 8px 0;">
        להלן הסעיפים שבהם התשובות של שני ההורים אינן זהות. יתר הסעיפים תואמים ומופיעים בטופס המאוחד שלהלן.
      </p>
      ${diffs.length === 0
        ? `<p style="font-size:12px;color:#276749;font-weight:700;">אין פערים — שני ההורים מילאו תשובות זהות.</p>`
        : `<table style="width:100%;border-collapse:collapse;font-size:11px;">
            <tr style="background:#eef5f2;font-weight:700;">
              <td style="padding:6px 8px;">סעיף</td>
              <td style="padding:6px 8px;">${esc(nameA)}</td>
              <td style="padding:6px 8px;">${esc(nameB)}</td>
            </tr>
            ${diffs.map((d, i) => `
              <tr style="background:${i % 2 ? "#fdf9f2" : "#fff"};">
                <td style="padding:5px 8px;border-bottom:1px solid #eee;">${esc(d.label)}<br><span style="color:#999;font-size:9px;">${esc(d.stepLabel)}</span></td>
                <td style="padding:5px 8px;border-bottom:1px solid #eee;font-weight:600;">${esc(d.a)}</td>
                <td style="padding:5px 8px;border-bottom:1px solid #eee;font-weight:600;">${esc(d.b)}</td>
              </tr>`).join("")}
          </table>`}
    </div>`;

  const merged = mergeForms(a, b);
  const src = await logoData();
  const filled = dateStr(merged);
  const subtitle = `שני הורים: ${nameA} · ${nameB}`;
  const { images, others } = await collectDocs(merged);

  const pages: string[] = [];
  const push = (title: string, body: string) =>
    pages.push(PAGE({ logoSrc: src, title, student: studentName, filled, subtitle, body }));

  push("טופס קליטה מאוחד", `
    <div style="text-align:center;padding:36px 0;">
      <h2 style="font-size:25px;font-weight:800;margin:0 0 10px 0;">טופס קליטה מאוחד — שני הורים</h2>
      <p style="font-size:16px;font-weight:700;color:#2f6f58;margin:0 0 6px 0;">${esc(studentName || "—")}</p>
      <p style="font-size:12.5px;color:#666;margin:0;">${esc(subtitle)}</p>
      <p style="font-size:12.5px;color:#666;margin:4px 0 0 0;">תאריך מילוי הטופס: ${esc(filled)}</p>
    </div>`);
  push("השוואה בין שני ההורים", diffTable);
  for (const p of stepPages(merged)) push(p.title, p.body);
  push("חתימות", signatureHTML(merged));
  for (const body of docsPages(images, others)) push("מסמכים שצורפו", body);

  await renderPagedHTMLToPDF(pages, `טופס-קליטה-מאוחד-${studentName || "תלמיד"}.pdf`);
}
