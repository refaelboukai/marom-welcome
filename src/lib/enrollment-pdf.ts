import { FORM_STEPS } from "@/data/enrollment-form";
import { EnrollmentForm, FormValues, flattenForm } from "@/lib/enrollment";
import { renderHTMLToPDF } from "@/lib/pdf-export";

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const displayValue = (v: unknown): string => {
  if (v === true) return "כן";
  if (v === false || v == null || v === "") return "—";
  if (Array.isArray(v)) {
    if (!v.length) return "—";
    return v.map((x) => (typeof x === "string" && x.includes("/") && /-\d{10,}-/.test(x)
      ? (x.split("/").pop() || x).replace(/^[\w-]+-\d{10,}-/, "")
      : x)).join(", ");
  }
  return String(v);
};

const HEAD = (title: string, subtitle: string) => `
  <div data-section style="border-bottom:3px solid #4a9a7a;padding-bottom:14px;margin-bottom:20px;">
    <h1 style="font-size:21px;font-weight:800;margin:0 0 6px 0;color:#1a1a2e;">${esc(title)}</h1>
    <p style="font-size:12px;color:#666;margin:0;">${esc(subtitle)}</p>
    <p style="font-size:11px;color:#888;margin:6px 0 0 0;">בית ספר מרום — בית אקשטיין יבנה &nbsp;|&nbsp; הופק בתאריך ${new Date().toLocaleDateString("he-IL")}</p>
  </div>`;

const WRAP = (inner: string) => `
  <div style="font-family:'Heebo','Rubik',Arial,sans-serif;direction:rtl;padding:36px;width:700px;box-sizing:border-box;color:#1a1a2e;line-height:1.55;background:#fff;">
    ${inner}
  </div>`;

function rowsHTML(values: FormValues): string {
  return FORM_STEPS.map((step) => `
    <div data-section style="margin-bottom:16px;">
      <h2 style="font-size:15px;font-weight:800;color:#2f6f58;margin:0 0 8px 0;border-right:4px solid #4a9a7a;padding-right:8px;">${esc(step.label)}</h2>
      ${step.groups.map((g) => `
        <div style="margin-bottom:10px;">
          <p style="font-size:12px;font-weight:700;color:#666;margin:0 0 4px 0;">${esc(g.title)}</p>
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            ${g.fields.filter((f) => f.type !== "note").map((f, i) => `
              <tr style="background:${i % 2 ? "#f7faf9" : "#fff"};">
                <td style="padding:5px 8px;color:#555;width:58%;border-bottom:1px solid #eef2f1;">${esc(f.label)}</td>
                <td style="padding:5px 8px;font-weight:600;border-bottom:1px solid #eef2f1;">${esc(displayValue(values[f.key]))}</td>
              </tr>`).join("")}
          </table>
        </div>`).join("")}
    </div>`).join("");
}

/** PDF of a single submitted form (or an in-progress draft). */
export async function generateEnrollmentPDF(values: FormValues, studentName: string, subtitle = "") {
  const html = WRAP(
    HEAD(`טופס קליטה — ${studentName}`, subtitle || "טופס קליטה לתלמיד/ה חדש/ה") + rowsHTML(values),
  );
  await renderHTMLToPDF(html, `טופס-קליטה-${studentName || "תלמיד"}.pdf`);
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

  const html = WRAP(
    HEAD(`טופס קליטה מאוחד — ${studentName}`, `שני הורים: ${nameA} · ${nameB}`) +
    diffTable +
    `<div data-section><h2 style="font-size:15px;font-weight:800;color:#2f6f58;margin:0 0 8px 0;">טופס מאוחד</h2></div>` +
    rowsHTML(mergeForms(a, b)),
  );
  await renderHTMLToPDF(html, `טופס-קליטה-מאוחד-${studentName || "תלמיד"}.pdf`);
}
