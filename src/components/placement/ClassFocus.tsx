import { useMemo, useState } from "react";
import { IntakeSession, QOL_SUBDOMAIN_LABELS, LC_SUBDOMAIN_LABELS, SECTION_LABELS } from "@/lib/types";
import { buildStudentProfile } from "@/lib/class-aggregations";
import { Target, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

export interface FocusSection {
  key: string;
  label: string;
  teacher?: string;
  students: IntakeSession[];
}

const DOMAIN_LABELS: Record<string, string> = {
  qualityOfLife: SECTION_LABELS.quality_of_life,
  selfEfficacy: SECTION_LABELS.self_efficacy,
  locusOfControl: SECTION_LABELS.locus_of_control,
  cognitiveFlexibility: SECTION_LABELS.cognitive_flexibility,
  learningCharacteristics: SECTION_LABELS.learning_characteristics,
};

const CONDUCT_LABELS: Record<string, string> = {
  authority: "קבלת סמכות",
  rules: "שמירת כללים",
  frustration: "התמודדות עם תסכול",
  impulsivity: "ויסות אימפולסיביות",
  temperament: "יציבות רגשית",
  cooperation: "שיתוף פעולה",
};

const ACTIONS: Record<string, string> = {
  qualityOfLife: "שגרות מיטיבות: מעגל בוקר קצר, זמני שיח אישיים ומעקב רווחה שבועי.",
  selfEfficacy: "מטלות מדורגות עם הצלחה מובטחת, משוב מתאר ותיעוד הישגים אישי.",
  locusOfControl: "חיזוק אחריות אישית: בחירה מובנית, יעדים שבועיים והצגת קשר מאמץ–תוצאה.",
  cognitiveFlexibility: "תרגול מעברים, הכנה מראש לשינויים ופיתוח פתרונות חלופיים.",
  learningCharacteristics: "התאמות למידה: פירוק מטלות, הוראות קצרות ותזכורות חזותיות.",
  social: "עבודה קבוצתית מובנית, תפקידים חברתיים ומעגלי שיח.",
  emotional: "פינת רגיעה, שפה רגשית משותפת ותיווך רגשי יומי.",
  independence: "העברת אחריות הדרגתית ותפקידים כיתתיים קבועים.",
  academic: "התאמות הערכה, למידה בקצב אישי ותגבור ממוקד.",
  health_lifestyle: "שגרות שינה, תזונה והפסקות תנועה במהלך היום.",
  family_support: "קשר שוטף עם ההורים ושיתופם בהצלחות.",
  self_view: "חיזוק דימוי עצמי דרך חוזקות אישיות ותפקידי מנהיגות.",
  general_wellbeing: "אקלים כיתה בטוח, כללים ברורים וטקסי פתיחה וסיום.",
  working_memory: "הוראות בשלבים, כרטיסיות תזכורת והפחתת עומס סימולטני.",
  executive_functions: "לוחות זמנים חזותיים, רשימות משימות וליווי בהתארגנות.",
  emotional_regulation: "אסטרטגיות ויסות, הפוגות יזומות ותמיכה בזמן תסכול.",
  arousal_sensory: "הפחתת גירויים, ישיבה מותאמת ואפשרות להפסקה חושית.",
  authority: "כללים אחידים, גבולות עקביים ובניית קשר אישי עם המחנכת.",
  rules: "חוזה כיתתי, חיזוקים חיוביים ומעקב יומי אחר עמידה בכללים.",
  frustration: "אימון בהתמודדות עם כישלון וטכניקות הרגעה זמינות.",
  impulsivity: "עצירה לפני תגובה, סימני תיווך מוסכמים ותנועה מווסתת.",
  temperament: "מרחב מוגן, זיהוי מוקדם של סימני מצוקה ותיאום עם הצוות הרגשי.",
  cooperation: "משימות זוגיות, אחריות משותפת וחיזוק תרומה לכיתה.",
};

const avg = (vals: number[]) => (vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : -1);

const Bar = ({ v }: { v: number }) => (
  <div className="h-2 w-24 rounded-full bg-muted overflow-hidden shrink-0">
    <div className="h-full rounded-full" style={{ width: `${(v / 5) * 100}%`, background: v < 2.5 ? "#ef4444" : v < 3.2 ? "#f59e0b" : "#10b981" }} />
  </div>
);

const ClassFocus = ({ sections }: { sections: FocusSection[] }) => {
  const [open, setOpen] = useState<string | null>(sections[0]?.key ?? null);

  const data = useMemo(() => sections.map((sec) => {
    const profiles = sec.students.map(buildStudentProfile);
    const collect = (pick: (p: ReturnType<typeof buildStudentProfile>) => Record<string, number> | undefined, labels: Record<string, string>, group: string) => {
      const keys = Object.keys(labels);
      return keys.map((k) => ({
        key: k,
        group,
        label: labels[k],
        value: avg(profiles.map((p) => pick(p)?.[k] ?? -1).filter((v) => v > 0)),
        count: profiles.filter((p) => (pick(p)?.[k] ?? -1) > 0 && (pick(p)?.[k] as number) < 2.5).length,
      })).filter((x) => x.value > 0);
    };

    const all = [
      ...collect((p) => p.scores, DOMAIN_LABELS, "תחום ליבה"),
      ...collect((p) => p.qolSubdomains, QOL_SUBDOMAIN_LABELS, "איכות חיים"),
      ...collect((p) => p.learningSubdomains, LC_SUBDOMAIN_LABELS, "מאפייני למידה"),
      ...collect((p) => (p.conductMetrics as unknown as Record<string, number>) || undefined, CONDUCT_LABELS, "התנהגות"),
    ].sort((a, b) => a.value - b.value);

    const atRisk = profiles
      .filter((p) => p.riskFlags.length > 0 || (p.conductMetrics && p.conductMetrics.average > 0 && p.conductMetrics.average < 2.6))
      .map((p) => ({ name: p.name, flags: p.riskFlags.length, conduct: p.conductMetrics?.average ?? 0 }))
      .sort((a, b) => b.flags - a.flags);

    const sensory = avg(profiles.map((p) => p.sensorySensitivity ?? -1).filter((v) => v > 0));

    return { ...sec, count: sec.students.length, focus: all.slice(0, 5), strengths: [...all].reverse().slice(0, 3), atRisk, sensory, noData: all.length === 0 };
  }), [sections]);

  if (sections.length === 0) return null;

  return (
    <div className="mb-5 space-y-3">
      {data.map((c) => (
        <div key={c.key} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <button onClick={() => setOpen(open === c.key ? null : c.key)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
            <span className="flex items-center gap-2 text-sm font-heading font-bold">
              <Target className="w-4 h-4 text-primary" />
              {c.label}
              <span className="text-[11px] font-normal text-muted-foreground">
                {c.count} תלמידים{c.teacher ? ` · ${c.teacher}` : ""}
              </span>
            </span>
            <span className="flex items-center gap-2">
              {c.focus[0] && (
                <span className="text-[11px] px-2 py-1 rounded-lg bg-warning/10 text-warning">
                  אתגר מוביל: {c.focus[0].label} ({c.focus[0].value})
                </span>
              )}
              {open === c.key ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </button>

          {open === c.key && (
            <div className="px-4 pb-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold mb-2">חמשת מוקדי ההתמקדות המרכזיים</p>
                {c.noData ? (
                  <p className="text-xs text-muted-foreground">אין עדיין מספיק נתוני שאלונים לכיתה זו.</p>
                ) : (
                  <ul className="space-y-2">
                    {c.focus.map((f, i) => (
                      <li key={`${f.group}-${f.key}`} className="rounded-xl border border-border px-3 py-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                          <span className="text-xs font-semibold">{f.label}</span>
                          <span className="text-[10px] text-muted-foreground">{f.group}</span>
                          <Bar v={f.value} />
                          <span className="text-[11px] font-bold">{f.value}</span>
                          {f.count > 0 && <span className="text-[10px] text-destructive">{f.count} תלמידים מתחת ל-2.5</span>}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1.5">{ACTIONS[f.key] || "מומלץ לבנות מענה כיתתי ממוקד בתחום זה."}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold mb-2">חוזקות כיתתיות למינוף</p>
                  {c.strengths.length === 0 ? (
                    <p className="text-xs text-muted-foreground">—</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {c.strengths.map((s) => (
                        <span key={`${s.group}-${s.key}`} className="text-[11px] px-2 py-1 rounded-lg bg-success/10 text-success">{s.label} ({s.value})</span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-warning" /> תלמידים לתשומת לב ({c.atRisk.length})
                  </p>
                  {c.atRisk.length === 0 ? (
                    <p className="text-xs text-muted-foreground">אין תלמידים המסומנים לתשומת לב מיוחדת.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {c.atRisk.map((s) => (
                        <span key={s.name} className="text-[11px] px-2 py-1 rounded-lg bg-warning/10 text-warning">
                          {s.name}{s.flags ? ` · ${s.flags} דגלים` : ""}{s.conduct ? ` · התנהגות ${s.conduct}` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {c.sensory > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    ממוצע ויסות חושי בכיתה: <b>{c.sensory}</b> {c.sensory < 2.8 ? "— מומלץ להפחית גירויים ולהתאים את מרחב הכיתה." : "— בטווח תקין."}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ClassFocus;