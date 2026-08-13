import { useMemo, useState } from "react";
import { X, Eye, Download, Loader2 } from "lucide-react";
import { questionnaireItems, likertLabels, likertLabelsCharacterizes } from "@/data/questionnaires";
import { SECTION_LABELS, IntakeSession, QuestionnaireSection } from "@/lib/types";
import { renderHTMLToPDF } from "@/lib/pdf-export";

interface Props {
  session: IntakeSession;
  open: boolean;
  onClose: () => void;
}

type Respondent = "student" | "parent" | "staff" | "compare";

/** Normalized positive value (1-5), higher = better. */
function positiveOf(value: number | undefined, isReverse: boolean): number | null {
  if (value == null) return null;
  return isReverse ? 6 - value : value;
}

/** Map raw response (1-5) + isReverse → tone: green (strength), yellow (average), red (complex). */
function toneFor(value: number | undefined, isReverse: boolean): "green" | "yellow" | "red" | "empty" {
  if (value == null) return "empty";
  const positive = isReverse ? 6 - value : value;
  if (positive >= 4) return "green";
  if (positive === 3) return "yellow";
  return "red";
}

const TONE_CLASSES: Record<string, string> = {
  green: "bg-success/10 border-success/30 text-black",
  yellow: "bg-warning/10 border-warning/30 text-foreground",
  red: "bg-destructive/10 border-destructive/30 text-foreground",
  empty: "bg-muted/40 border-border text-muted-foreground",
};

const TONE_DOT: Record<string, string> = {
  green: "bg-success",
  yellow: "bg-warning",
  red: "bg-destructive",
  empty: "bg-muted-foreground/40",
};

const TONE_LABEL: Record<string, string> = {
  green: "חוזק",
  yellow: "ממוצע — לחיזוק",
  red: "לתשומת לב",
  empty: "לא נענה",
};

const ResponsesViewer = ({ session, open, onClose }: Props) => {
  const [respondent, setRespondent] = useState<Respondent>("student");
  const [exporting, setExporting] = useState(false);

  const sections = useMemo(() => {
    const groups = new Map<QuestionnaireSection, typeof questionnaireItems>();
    for (const it of questionnaireItems) {
      if (!groups.has(it.section)) groups.set(it.section, [] as any);
      groups.get(it.section)!.push(it);
    }
    return Array.from(groups.entries());
  }, []);

  if (!open) return null;

  const responsesFor = (r: Exclude<Respondent, "compare">) =>
    r === "student" ? session.studentResponses : r === "parent" ? session.parentResponses : session.staffResponses;

  const isCompare = respondent === "compare";
  const responses = isCompare ? {} : responsesFor(respondent as Exclude<Respondent, "compare">);
  const answeredCount = Object.values(responses || {}).filter((v) => v != null).length;

  const counts = { green: 0, yellow: 0, red: 0, empty: 0 };
  for (const it of questionnaireItems) {
    counts[toneFor(responses?.[it.id], it.isReverse)]++;
  }

  const labelFor = (value: number, scaleType?: "agreement" | "characterizes") => {
    const list = scaleType === "characterizes" ? likertLabelsCharacterizes : likertLabels;
    return list.find((l) => l.value === value)?.label ?? String(value);
  };

  /** Rows for the integration (comparison) view. */
  const compareRows = questionnaireItems.map((it) => {
    const s = positiveOf(session.studentResponses?.[it.id], it.isReverse);
    const p = positiveOf(session.parentResponses?.[it.id], it.isReverse);
    const t = positiveOf(session.staffResponses?.[it.id], it.isReverse);
    const vals = [s, p, t].filter((v): v is number => v != null);
    const gap = vals.length >= 2 ? Math.max(...vals) - Math.min(...vals) : null;
    return { it, s, p, t, gap };
  });

  const gapLevel = (gap: number | null) => (gap == null ? "none" : gap >= 2 ? "high" : gap === 1 ? "mid" : "low");
  const bigGaps = compareRows.filter((r) => (r.gap ?? 0) >= 2);

  const respondentLabel: Record<Exclude<Respondent, "compare">, string> = {
    student: "תלמיד/ה",
    parent: "הורה",
    staff: "מחנכת",
  };

  const handleExportBW = async () => {
    setExporting(true);
    try {
      if (isCompare) {
        const sectionsHtml = sections
          .map(([section, items]) => {
            const rows = items
              .map((it) => {
                const r = compareRows.find((c) => c.it.id === it.id)!;
                const cell = (v: number | null) => (v == null ? "—" : String(v));
                const gapTxt = r.gap == null ? "—" : String(r.gap);
                const strong = (r.gap ?? 0) >= 2;
                return `<tr style="border-bottom:1px solid #ddd;${strong ? "background:#eee;" : ""}">
                <td style="padding:5px 6px;font-size:11px;text-align:right;">${it.studentText}${it.isReverse ? " (הפוך)" : ""}</td>
                <td style="padding:5px 6px;font-size:11px;text-align:center;">${cell(r.s)}</td>
                <td style="padding:5px 6px;font-size:11px;text-align:center;">${cell(r.p)}</td>
                <td style="padding:5px 6px;font-size:11px;text-align:center;">${cell(r.t)}</td>
                <td style="padding:5px 6px;font-size:11px;text-align:center;font-weight:${strong ? 700 : 400};">${gapTxt}</td>
              </tr>`;
              })
              .join("");
            return `<div data-section style="margin-bottom:16px;">
            <h3 style="font-size:13px;font-weight:700;margin:0 0 6px 0;border-bottom:2px solid #333;padding-bottom:3px;">${SECTION_LABELS[section]}</h3>
            <table style="width:100%;border-collapse:collapse;">
              <thead><tr style="background:#333;color:#fff;">
                <th style="padding:5px 6px;font-size:11px;text-align:right;">היגד</th>
                <th style="padding:5px 6px;font-size:11px;width:52px;">תלמיד/ה</th>
                <th style="padding:5px 6px;font-size:11px;width:52px;">הורה</th>
                <th style="padding:5px 6px;font-size:11px;width:52px;">מחנכת</th>
                <th style="padding:5px 6px;font-size:11px;width:44px;">פער</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`;
          })
          .join("");

        const html = `<div style="direction:rtl;font-family:'Assistant',Arial,sans-serif;color:#111;padding:24px;background:#fff;">
        <div data-section style="margin-bottom:16px;">
          <h1 style="font-size:20px;margin:0;">מיפוי משולב — תלמיד/ה · הורה · מחנכת</h1>
          <p style="font-size:12px;margin:4px 0 0 0;">${session.studentName} · כיתה ${session.grade || "—"} · ${new Date().toLocaleDateString("he-IL")}</p>
          <p style="font-size:11px;margin:6px 0 0 0;">כל הערכים מוצגים בסולם חיובי 1–5 (5 = מיטבי). פריטים הפוכים הוסבו בהתאם. "פער" = ההפרש בין הדיווח הגבוה לנמוך; פער של 2 ומעלה מודגש.</p>
          <p style="font-size:12px;margin:8px 0 0 0;font-weight:700;">סה"כ פריטים עם פער משמעותי: ${bigGaps.length}</p>
        </div>
        ${sectionsHtml}
      </div>`;

        await renderHTMLToPDF(html, `מיפוי_משולב_${session.studentName}.pdf`, { grayscale: true });
      } else {
        const r = respondent as Exclude<Respondent, "compare">;
        const resp = responsesFor(r);
        const sectionsHtml = sections
          .map(([section, items]) => {
            const rows = items
              .map((it, idx) => {
                const raw = resp?.[it.id];
                const pos = positiveOf(raw, it.isReverse);
                const cell = pos == null ? "—" : String(pos);
                const tone = pos == null ? "" : pos >= 4 ? "רקע:#fff;border-left:4px solid #555;" : pos === 3 ? "רקע:#f5f5f5;border-left:4px solid #999;" : "רקע:#eee;border-left:4px solid #333;font-weight:700;";
                const text = r === "parent" ? it.parentText : it.studentText;
                return `<tr style="border-bottom:1px solid #ddd;${tone}">
                <td style="padding:5px 6px;font-size:11px;text-align:right;">${idx + 1}. ${text}${it.isReverse ? " (הפוך)" : ""}</td>
                <td style="padding:5px 6px;font-size:12px;text-align:center;font-weight:600;width:52px;">${cell}</td>
              </tr>`;
              })
              .join("");
            return `<div data-section style="margin-bottom:16px;">
            <h3 style="font-size:13px;font-weight:700;margin:0 0 6px 0;border-bottom:2px solid #333;padding-bottom:3px;">${SECTION_LABELS[section]}</h3>
            <table style="width:100%;border-collapse:collapse;">
              <thead><tr style="background:#333;color:#fff;">
                <th style="padding:5px 6px;font-size:11px;text-align:right;">היגד</th>
                <th style="padding:5px 6px;font-size:11px;width:52px;">ערך (1–5)</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`;
          })
          .join("");

        const html = `<div style="direction:rtl;font-family:'Assistant',Arial,sans-serif;color:#111;padding:24px;background:#fff;">
        <div data-section style="margin-bottom:16px;">
          <h1 style="font-size:20px;margin:0;">שאלון ${respondentLabel[r]} — ${session.studentName}</h1>
          <p style="font-size:12px;margin:4px 0 0 0;">${session.studentName} · כיתה ${session.grade || "—"} · ${new Date().toLocaleDateString("he-IL")}</p>
          <p style="font-size:11px;margin:6px 0 0 0;">כל הערכים מוצגים בסולם חיובי 1–5 (5 = מיטבי). פריטים הפוכים הוסבו בהתאם. נענו ${answeredCount} מתוך ${questionnaireItems.length} פריטים.</p>
        </div>
        ${sectionsHtml}
      </div>`;

        const filePrefix = r === "parent" ? "שאלון_הורה" : r === "staff" ? "שאלון_מחנכת" : "שאלון_תלמיד";
        await renderHTMLToPDF(html, `${filePrefix}_${session.studentName}.pdf`, { grayscale: true });
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 print:hidden"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-start justify-between gap-2">
          <div>
            <h3 className="font-heading font-bold text-lg flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              צפייה בתשובות — {session.studentName}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {isCompare
                ? "השוואה בין המדווחים בסולם חיובי 1–5. פער 2 ומעלה = פער תפיסתי משמעותי."
                : "תצוגה בלבד. אדום — לתשומת לב, צהוב — לחיזוק, ירוק — חוזק."}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="px-4 sm:px-5 pt-3 flex flex-wrap items-center gap-2 border-b border-border pb-3">
          <div className="inline-flex rounded-lg border border-border overflow-hidden text-sm">
            <button
              onClick={() => setRespondent("student")}
              className={`px-3 py-1.5 ${respondent === "student" ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted"}`}
            >
              תלמיד/ה
            </button>
            <button
              onClick={() => setRespondent("parent")}
              className={`px-3 py-1.5 ${respondent === "parent" ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted"}`}
            >
              הורה
            </button>
            <button
              onClick={() => setRespondent("staff")}
              className={`px-3 py-1.5 ${respondent === "staff" ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted"}`}
            >
              מחנכת
            </button>
            <button
              onClick={() => setRespondent("compare")}
              className={`px-3 py-1.5 ${isCompare ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted"}`}
            >
              מיפוי משולב
            </button>
          </div>
          {isCompare ? (
            <span className="text-xs text-muted-foreground">פערים משמעותיים: {bigGaps.length}</span>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">נענו {answeredCount} מתוך {questionnaireItems.length}</span>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-success" /> {counts.green}</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-warning" /> {counts.yellow}</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-destructive" /> {counts.red}</span>
              </div>
            </>
          )}
          <button
            onClick={handleExportBW}
            disabled={exporting}
            className="mr-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-60"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            הורדת מיפוי משולב (שחור־לבן)
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-5">
          {isCompare && sections.map(([section, items]) => (
            <div key={section}>
              <h4 className="font-heading font-semibold text-sm mb-2 sticky top-0 bg-card py-1">
                {SECTION_LABELS[section]}
              </h4>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 px-2.5 text-[10px] text-muted-foreground">
                  <span className="flex-1">היגד</span>
                  <span className="w-10 text-center">תלמיד/ה</span>
                  <span className="w-10 text-center">הורה</span>
                  <span className="w-10 text-center">מחנכת</span>
                  <span className="w-10 text-center">פער</span>
                </div>
                {items.map((it) => {
                  const r = compareRows.find((c) => c.it.id === it.id)!;
                  const level = gapLevel(r.gap);
                  const cls =
                    level === "high"
                      ? "bg-destructive/10 border-destructive/30"
                      : level === "mid"
                      ? "bg-warning/10 border-warning/30"
                      : level === "low"
                      ? "bg-success/10 border-success/30"
                      : "bg-muted/40 border-border";
                  const cell = (v: number | null) => (
                    <span className="w-10 text-center text-sm font-semibold">{v == null ? "—" : v}</span>
                  );
                  return (
                    <div key={it.id} className={`flex items-center gap-2 p-2.5 rounded-lg border ${cls}`}>
                      <p className="flex-1 text-xs leading-relaxed">
                        {it.studentText}
                        {it.isReverse && <span className="text-[10px] text-muted-foreground mr-1">(הפוך)</span>}
                      </p>
                      {cell(r.s)}
                      {cell(r.p)}
                      {cell(r.t)}
                      <span className="w-10 text-center text-sm font-bold">{r.gap == null ? "—" : r.gap}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {!isCompare && sections.map(([section, items]) => (
            <div key={section}>
              <h4 className="font-heading font-semibold text-sm mb-2 sticky top-0 bg-card py-1">
                {SECTION_LABELS[section]}
              </h4>
              <div className="space-y-1.5">
                {items.map((it, idx) => {
                  const value = responses?.[it.id];
                  const tone = toneFor(value, it.isReverse);
                  const text = respondent === "parent" ? it.parentText : it.studentText;
                  return (
                    <div
                      key={it.id}
                      className={`flex items-start gap-3 p-2.5 rounded-lg border ${TONE_CLASSES[tone]}`}
                    >
                      <span className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${TONE_DOT[tone]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-relaxed">
                          <span className="text-xs text-muted-foreground ml-1">{idx + 1}.</span>
                          {text}
                          {it.isReverse && (
                            <span className="text-[10px] text-muted-foreground mr-2">(פריט הפוך)</span>
                          )}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-left">
                        {value != null ? (
                          <>
                            <div className="text-sm font-semibold">{value}</div>
                            <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {labelFor(value, it.scaleType)}
                            </div>
                          </>
                        ) : (
                          <div className="text-[10px] text-muted-foreground">—</div>
                        )}
                        <div className="text-[10px] mt-0.5 font-medium opacity-70">{TONE_LABEL[tone]}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border p-3 flex justify-end">
          <button onClick={onClose} className="btn-intake bg-muted text-foreground text-sm">סגירה</button>
        </div>
      </div>
    </div>
  );
};

export default ResponsesViewer;