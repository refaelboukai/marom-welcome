import { useMemo, useState } from "react";
import { X, Eye } from "lucide-react";
import { questionnaireItems, likertLabels, likertLabelsCharacterizes } from "@/data/questionnaires";
import { SECTION_LABELS, IntakeSession, QuestionnaireSection } from "@/lib/types";

interface Props {
  session: IntakeSession;
  open: boolean;
  onClose: () => void;
}

type Respondent = "student" | "parent";

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

  const sections = useMemo(() => {
    const groups = new Map<QuestionnaireSection, typeof questionnaireItems>();
    for (const it of questionnaireItems) {
      if (!groups.has(it.section)) groups.set(it.section, [] as any);
      groups.get(it.section)!.push(it);
    }
    return Array.from(groups.entries());
  }, []);

  if (!open) return null;

  const responses = respondent === "student" ? session.studentResponses : session.parentResponses;
  const answeredCount = Object.values(responses || {}).filter((v) => v != null).length;

  const counts = { green: 0, yellow: 0, red: 0, empty: 0 };
  for (const it of questionnaireItems) {
    counts[toneFor(responses?.[it.id], it.isReverse)]++;
  }

  const labelFor = (value: number, scaleType?: "agreement" | "characterizes") => {
    const list = scaleType === "characterizes" ? likertLabelsCharacterizes : likertLabels;
    return list.find((l) => l.value === value)?.label ?? String(value);
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
              תצוגה בלבד. אדום — לתשומת לב, צהוב — לחיזוק, ירוק — חוזק.
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
          </div>
          <span className="text-xs text-muted-foreground">נענו {answeredCount} מתוך {questionnaireItems.length}</span>
          <div className="flex items-center gap-3 mr-auto text-xs">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-success" /> {counts.green}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-warning" /> {counts.yellow}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-destructive" /> {counts.red}</span>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-5">
          {sections.map(([section, items]) => (
            <div key={section}>
              <h4 className="font-heading font-semibold text-sm mb-2 sticky top-0 bg-card py-1">
                {SECTION_LABELS[section]}
              </h4>
              <div className="space-y-1.5">
                {items.map((it, idx) => {
                  const value = responses?.[it.id];
                  const tone = toneFor(value, it.isReverse);
                  const text = respondent === "student" ? it.studentText : it.parentText;
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