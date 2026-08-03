import { useMemo } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis,
  Radar, RadarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { IntakeSession } from "@/lib/types";
import { buildStudentProfile } from "@/lib/class-aggregations";
import { getStudentGender } from "@/lib/gender-utils";
import { AlertTriangle, CheckCircle2, HeartHandshake, Sparkles, TrendingUp } from "lucide-react";

export interface BoardSection {
  key: string;
  label: string;
  teacher?: string;
  students: IntakeSession[];
}

const PALETTE = ["#0e9488", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#10b981", "#ec4899", "#64748b"];

const CONDUCT_DIMS: { key: "authority" | "rules" | "frustration" | "impulsivity" | "temperament" | "cooperation"; label: string }[] = [
  { key: "authority", label: "קבלת סמכות" },
  { key: "rules", label: "שמירת כללים" },
  { key: "frustration", label: "התמודדות עם תסכול" },
  { key: "impulsivity", label: "ויסות אימפולסיביות" },
  { key: "temperament", label: "יציבות רגשית" },
  { key: "cooperation", label: "שיתוף פעולה" },
];

const DOMAIN_DIMS: { key: string; label: string }[] = [
  { key: "qualityOfLife", label: "איכות חיים" },
  { key: "selfEfficacy", label: "מסוגלות" },
  { key: "locusOfControl", label: "מיקוד שליטה" },
  { key: "cognitiveFlexibility", label: "גמישות" },
  { key: "learningCharacteristics", label: "מאפייני למידה" },
];

const genderOf = (s: IntakeSession): "male" | "female" | "unknown" => {
  if (s.gender === "female") return "female";
  if (s.gender === "male") return "male";
  const g = getStudentGender(s.studentName);
  return g === "male" || g === "female" ? g : "unknown";
};

const avg = (vals: number[]) => (vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : 0);

const Panel = ({ title, icon, children, className = "" }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-border bg-card p-4 shadow-sm ${className}`}>
    <h3 className="text-sm font-heading font-bold mb-3 flex items-center gap-1.5">{icon}{title}</h3>
    {children}
  </div>
);

const BoardAnalytics = ({ sections, unassigned }: { sections: BoardSection[]; unassigned: IntakeSession[] }) => {
  const data = useMemo(() => {
    const profilesByClass = sections.map((sec, i) => ({
      ...sec,
      color: PALETTE[i % PALETTE.length],
      profiles: sec.students.map((s) => buildStudentProfile(s)),
    }));

    const sizeData = profilesByClass.map((c) => {
      let male = 0, female = 0;
      c.students.forEach((s) => {
        const g = genderOf(s);
        if (g === "female") female++;
        else if (g === "male") male++;
      });
      return { name: c.label, בנים: male, בנות: female, "לא מוגדר": c.students.length - male - female, total: c.students.length };
    });
    const avgSize = sizeData.length ? sizeData.reduce((a, b) => a + b.total, 0) / sizeData.length : 0;

    const conductRadar = CONDUCT_DIMS.map((d) => {
      const row: Record<string, string | number> = { dim: d.label };
      profilesByClass.forEach((c) => {
        row[c.label] = avg(c.profiles.map((p) => p.conductMetrics?.[d.key] ?? 0).filter((v) => v > 0));
      });
      return row;
    });

    const domainBars = DOMAIN_DIMS.map((d) => {
      const row: Record<string, string | number> = { dim: d.label };
      profilesByClass.forEach((c) => {
        row[c.label] = avg(c.profiles.map((p) => p.scores?.[d.key] ?? 0).filter((v) => v > 0));
      });
      return row;
    });

    const riskData = profilesByClass.map((c) => ({
      name: c.label,
      "דגלי סיכון": avg(c.profiles.map((p) => p.riskFlags.length)),
      "רגישות חושית": avg(c.profiles.map((p) => p.sensorySensitivity ?? 0).filter((v) => v > 0)),
      "ממוצע התנהגות": avg(c.profiles.map((p) => p.conductMetrics?.average ?? 0).filter((v) => v > 0)),
    }));

    // ---- chemistry ----
    const classOf: Record<string, string> = {};
    const nameOf: Record<string, string> = {};
    sections.forEach((sec) => sec.students.forEach((s) => { classOf[s.id] = sec.key; nameOf[s.id] = s.studentName; }));
    unassigned.forEach((s) => { classOf[s.id] = ""; nameOf[s.id] = s.studentName; });

    const conflicts: { a: string; b: string; where: string }[] = [];
    const separated: { a: string; b: string }[] = [];
    const together: { a: string; b: string; where: string }[] = [];
    const seen = new Set<string>();
    const all = [...sections.flatMap((s) => s.students), ...unassigned];
    all.forEach((s) => {
      const rel = s.relationships;
      if (!rel) return;
      const labelFor = (k: string) => sections.find((x) => x.key === k)?.label || "ללא שיוך";
      (rel.avoid || []).forEach((oid) => {
        const pair = [s.id, oid].sort().join("|");
        if (seen.has(`a${pair}`) || !nameOf[oid]) return;
        seen.add(`a${pair}`);
        if (classOf[s.id] && classOf[s.id] === classOf[oid]) {
          conflicts.push({ a: s.studentName, b: nameOf[oid], where: labelFor(classOf[s.id]) });
        }
      });
      (rel.prefer || []).forEach((oid) => {
        const pair = [s.id, oid].sort().join("|");
        if (seen.has(`p${pair}`) || !nameOf[oid]) return;
        seen.add(`p${pair}`);
        if (classOf[s.id] && classOf[s.id] === classOf[oid]) together.push({ a: s.studentName, b: nameOf[oid], where: labelFor(classOf[s.id]) });
        else separated.push({ a: s.studentName, b: nameOf[oid] });
      });
    });

    // ---- balance score per class (0-100) ----
    const scored = profilesByClass.map((c) => {
      const n = c.students.length || 1;
      const sizePenalty = Math.min(30, Math.abs(n - avgSize) * 8);
      const males = c.students.filter((s) => genderOf(s) === "male").length;
      const females = c.students.filter((s) => genderOf(s) === "female").length;
      const ratio = males + females > 0 ? Math.max(males, females) / (males + females) : 0.5;
      const genderPenalty = Math.max(0, (ratio - 0.6)) * 75;
      const conductAvg = avg(c.profiles.map((p) => p.conductMetrics?.average ?? 0).filter((v) => v > 0));
      const conductPenalty = conductAvg > 0 ? Math.max(0, (3.2 - conductAvg)) * 20 : 0;
      const conflictPenalty = conflicts.filter((x) => x.where === c.label).length * 12;
      const score = Math.max(0, Math.min(100, Math.round(100 - sizePenalty - genderPenalty - conductPenalty - conflictPenalty)));
      return { key: c.key, label: c.label, color: c.color, score, conductAvg, size: n };
    });

    // ---- verbal narrative per class ----
    const narratives = profilesByClass.map((c) => {
      const sc = scored.find((s) => s.key === c.key)!;
      const males = c.students.filter((s) => genderOf(s) === "male").length;
      const females = c.students.filter((s) => genderOf(s) === "female").length;
      const sizeGap = Math.round((c.students.length - avgSize) * 10) / 10;
      const dims = CONDUCT_DIMS.map((d) => ({
        label: d.label,
        key: d.key,
        value: avg(c.profiles.map((p) => p.conductMetrics?.[d.key] ?? 0).filter((v) => v > 0)),
      })).filter((d) => d.value > 0).sort((a, b) => a.value - b.value);
      const weakest = dims.slice(0, 2);
      const strongest = [...dims].reverse().slice(0, 2);
      const sensory = avg(c.profiles.map((p) => p.sensorySensitivity ?? 0).filter((v) => v > 0));
      const flagged = c.profiles.filter((p) => p.riskFlags.length > 0).length;
      const classConflicts = conflicts.filter((x) => x.where === c.label).length;

      const paragraphs: string[] = [];
      paragraphs.push(
        `בכיתה ${c.label}${c.teacher ? ` בהובלת ${c.teacher}` : ""} משובצים כרגע ${c.students.length} תלמידים` +
        `${Math.abs(sizeGap) >= 1 ? `, ${sizeGap > 0 ? `${Math.abs(sizeGap)} מעל` : `${Math.abs(sizeGap)} מתחת ל`}ממוצע הכיתות` : ", בהתאמה לגודל הממוצע"}` +
        `. ההרכב המגדרי הוא ${males} בנים ו-${females} בנות` +
        `${males + females > 0 && Math.max(males, females) / (males + females) > 0.75 ? " — הרכב חד-צדדי שכדאי לאזן כדי לאפשר מגוון חברתי." : " — הרכב מאוזן דיו."}`
      );
      if (sc.conductAvg > 0) {
        paragraphs.push(
          `ממוצע המדדים ההתנהגותיים בכיתה עומד על ${sc.conductAvg} מתוך 5` +
          `${sc.conductAvg >= 3.6 ? ", כלומר קבוצה יציבה שמאפשרת עבודה לימודית רציפה." : sc.conductAvg >= 3 ? ", כלומר קבוצה תפקודית הזקוקה לשגרה ברורה ולגבולות עקביים." : ", כלומר קבוצה מאתגרת הדורשת מסגרת מובנית מאוד, נוכחות מבוגר משמעותית ותיווך יומיומי."}` +
          `${weakest.length ? ` הנקודות הרגישות ביותר הן ${weakest.map((d) => `${d.label} (${d.value})`).join(" ו-")}.` : ""}` +
          `${strongest.length ? ` לצד זאת, ${strongest.map((d) => `${d.label} (${d.value})`).join(" ו-")} מהווים בסיס חזק למינוף.` : ""}`
        );
      }
      paragraphs.push(
        `ציון האיזון הכיתתי הוא ${sc.score} מתוך 100` +
        `${sc.score >= 75 ? " — איזון טוב, אין צורך בשינויים מהותיים." : sc.score >= 55 ? " — איזון סביר, כדאי לבצע התאמות נקודתיות." : " — איזון נמוך, מומלץ לבחון מחדש את ההרכב."}` +
        `. הציון מורכב מארבעה רכיבים: פער מגודל הכיתה הממוצע, מידת האיזון המגדרי, הממוצע ההתנהגותי של הקבוצה, וכל התנגשות חברתית מוכרת (זוג שהוגדר "להפריד") שמופיעה בכיתה.` +
        `${classConflicts ? ` בכיתה זו קיימות ${classConflicts} התנגשויות חברתיות פתוחות.` : ""}` +
        `${flagged ? ` ${flagged} תלמידים נושאים דגלי תשומת לב מהשאלונים.` : ""}` +
        `${sensory > 0 && sensory < 2.8 ? ` ממוצע הוויסות החושי (${sensory}) נמוך, ולכן חשוב לתכנן סביבה עם פחות גירויים.` : ""}`
      );

      const recs: string[] = [];
      if (sc.conductAvg > 0 && sc.conductAvg < 3) recs.push("לפתוח את השנה עם חוזה כיתתי ברור, שגרות קבועות וחיזוקים חיוביים יומיים.");
      weakest.forEach((d) => {
        if (d.key === "authority") recs.push("לבסס קשר אישי עם כל תלמיד לפני אכיפת גבולות — קבלת סמכות בכיתה זו נבנית דרך יחס ולא דרך כוח.");
        if (d.key === "rules") recs.push("להציג את הכללים באופן חזותי בכיתה ולחזור עליהם בתחילת כל יום.");
        if (d.key === "frustration") recs.push("להנגיש טכניקות הרגעה ופינת רגיעה, ולתרגל התמודדות עם כישלון במצבים מוגנים.");
        if (d.key === "impulsivity") recs.push("לשלב סימני עצירה מוסכמים והפוגות תנועה יזומות במהלך היום.");
        if (d.key === "temperament") recs.push("לזהות מוקדם סימני מצוקה ולתאם מענה עם הצוות הרגשי.");
        if (d.key === "cooperation") recs.push("לבנות משימות זוגיות ותפקידים כיתתיים המחזקים תרומה הדדית.");
      });
      if (classConflicts) recs.push("לתכנן ישיבה נפרדת ותפקידים שונים לזוגות שסומנו כהתנגשות, ולעקוב אחריהם בשבועיים הראשונים.");
      if (sensory > 0 && sensory < 2.8) recs.push("להפחית גירויים בכיתה: מיקום ישיבה מותאם, תאורה רכה ואפשרות להפסקה חושית.");
      if (males + females > 0 && Math.max(males, females) / (males + females) > 0.75) recs.push("לשקול העברת תלמיד/ה כדי לאזן מגדרית ולמנוע בידוד של המיעוט בכיתה.");
      if (recs.length === 0) recs.push("הכיתה מאוזנת — מומלץ לשמר את ההרכב ולהתמקד בבניית אקלים ובחיזוק העוגנים החיוביים.");

      return { key: c.key, label: c.label, color: c.color, paragraphs, recs: recs.slice(0, 5) };
    });

    return { profilesByClass, sizeData, avgSize, conductRadar, domainBars, riskData, conflicts, separated, together, scored, narratives };
  }, [sections, unassigned]);

  const labels = sections.map((s) => s.label);
  if (sections.length === 0) return null;

  return (
    <div className="mb-5 grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Panel title="איך קוראים את הנתונים בלוח" icon={<Sparkles className="w-4 h-4 text-primary" />} className="xl:col-span-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] leading-relaxed text-muted-foreground">
          <p><b className="text-foreground">גודל והרכב מגדרי:</b> הקו המקווקו בגרף מסמן את הגודל הממוצע של הכיתות. ככל שכיתה רחוקה יותר מהקו, כך גדל הפער בעומס על המחנכת. הרכב מגדרי נחשב חד-צדדי כשקבוצה אחת עוברת 75%.</p>
          <p><b className="text-foreground">פרופיל התנהגותי (1–5):</b> ממוצע דירוגי הצוות בשישה מדדים. ערך 1 מציין קושי משמעותי ו-5 תפקוד מיטבי. ציר שנופל בבירור מתחת לשאר מצביע על התחום שבו הכיתה תזדקק לתמיכה.</p>
          <p><b className="text-foreground">ממוצעי תחומי השאלונים:</b> ממוצעי הדיווח העצמי של התלמידים (איכות חיים, מסוגלות, מיקוד שליטה, גמישות ומאפייני למידה). ממוצע מתחת ל-2.5 נחשב תחום בסיכון וממוצע מעל 3.5 מהווה חוזקה למינוף.</p>
          <p><b className="text-foreground">עומס, סיכון ורגישות חושית:</b> "דגלי סיכון" הוא מספר הסימונים הממוצע לתלמיד בכיתה; "רגישות חושית" מבוססת על אשכול העוררות והוויסות בשאלון מאפייני הלמידה.</p>
          <p className="md:col-span-2"><b className="text-foreground">מדד האיזון הכיתתי (0–100):</b> מתחיל מ-100 ומופחתים ממנו ארבעה קנסות — פער מגודל ממוצע (עד 30 נק'), חוסר איזון מגדרי מעל 60%, ממוצע התנהגותי מתחת ל-3.2, וכל התנגשות חברתית בכיתה (12 נק'). 75 ומעלה = איזון טוב, 55–74 = דורש התאמות, מתחת ל-55 = מומלץ לבחון מחדש את ההרכב.</p>
        </div>
      </Panel>

      <Panel title="גודל כיתות והרכב מגדרי" icon={<TrendingUp className="w-4 h-4 text-primary" />}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.sizeData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ direction: "rtl", fontSize: 12, borderRadius: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={data.avgSize} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: `ממוצע ${Math.round(data.avgSize * 10) / 10}`, fontSize: 10, position: "insideTopRight" }} />
              <Bar dataKey="בנים" stackId="g" fill="#38bdf8" radius={[0, 0, 0, 0]} />
              <Bar dataKey="בנות" stackId="g" fill="#f472b6" />
              <Bar dataKey="לא מוגדר" stackId="g" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="פרופיל התנהגותי משווה (1–5)" icon={<Sparkles className="w-4 h-4 text-primary" />}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data.conductRadar} outerRadius="72%">
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="dim" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 9 }} />
              <Tooltip contentStyle={{ direction: "rtl", fontSize: 12, borderRadius: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {data.profilesByClass.map((c) => (
                <Radar key={c.key} name={c.label} dataKey={c.label} stroke={c.color} fill={c.color} fillOpacity={0.12} />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="ממוצעי תחומי השאלונים לפי כיתה" icon={<TrendingUp className="w-4 h-4 text-primary" />}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.domainBars} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="dim" tick={{ fontSize: 10 }} interval={0} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ direction: "rtl", fontSize: 12, borderRadius: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {labels.map((l, i) => (
                <Bar key={l} dataKey={l} fill={PALETTE[i % PALETTE.length]} radius={[5, 5, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="עומס, סיכון ורגישות חושית" icon={<AlertTriangle className="w-4 h-4 text-warning" />}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.riskData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ direction: "rtl", fontSize: 12, borderRadius: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="ממוצע התנהגות" fill="#0e9488" radius={[5, 5, 0, 0]} />
              <Bar dataKey="רגישות חושית" fill="#8b5cf6" radius={[5, 5, 0, 0]} />
              <Bar dataKey="דגלי סיכון" fill="#ef4444" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="מדד איזון כיתתי" icon={<CheckCircle2 className="w-4 h-4 text-success" />}>
        <div className="space-y-2.5">
          {data.scored.map((c) => (
            <div key={c.key} className="flex items-center gap-3">
              <span className="text-xs font-semibold w-28 truncate">{c.label}</span>
              <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${c.score}%`, background: c.score >= 75 ? "#10b981" : c.score >= 55 ? "#f59e0b" : "#ef4444" }} />
              </div>
              <span className="text-xs font-bold w-9 text-left">{c.score}</span>
              <span className="text-[11px] text-muted-foreground w-24 shrink-0">{c.size} תלמידים{c.conductAvg ? ` · ${c.conductAvg}` : ""}</span>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground pt-1 border-t border-border">
            המדד משקלל: פער מגודל כיתה ממוצע, איזון מגדרי, ממוצע התנהגות והתנגשויות כימיה חברתית.
          </p>
        </div>
      </Panel>

      <Panel title="התאמות בין תלמידים" icon={<HeartHandshake className="w-4 h-4 text-primary" />}>
        <div className="space-y-3 text-xs">
          <div>
            <p className="font-semibold text-destructive mb-1.5 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> התנגשויות באותה כיתה ({data.conflicts.length})</p>
            {data.conflicts.length === 0 ? (
              <p className="text-muted-foreground">אין התנגשויות — כל זוגות ההרחקה מופרדים.</p>
            ) : (
              <ul className="space-y-1">
                {data.conflicts.map((c, i) => (
                  <li key={i} className="px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive">
                    {c.a} ↔ {c.b} — יחד ב{c.where}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="font-semibold text-success mb-1.5">זוגות מועדפים ששובצו יחד ({data.together.length})</p>
            {data.together.length === 0 ? (
              <p className="text-muted-foreground">אין כרגע זוגות מועדפים משובצים יחד.</p>
            ) : (
              <ul className="space-y-1">
                {data.together.map((c, i) => (
                  <li key={i} className="px-2.5 py-1.5 rounded-lg bg-success/10 text-success">{c.a} + {c.b} — {c.where}</li>
                ))}
              </ul>
            )}
          </div>
          {data.separated.length > 0 && (
            <div>
              <p className="font-semibold text-warning mb-1.5">זוגות מועדפים שהופרדו ({data.separated.length})</p>
              <ul className="space-y-1">
                {data.separated.map((c, i) => (
                  <li key={i} className="px-2.5 py-1.5 rounded-lg bg-warning/10 text-warning">{c.a} + {c.b}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Panel>

      <Panel title="פרשנות מילולית והמלצות למחנכת" icon={<HeartHandshake className="w-4 h-4 text-primary" />} className="xl:col-span-2">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {data.narratives.map((n) => (
            <div key={n.key} className="rounded-xl border border-border p-3">
              <p className="text-xs font-heading font-bold mb-1.5 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: n.color }} />
                {n.label}
              </p>
              <div className="space-y-1.5 text-[12px] leading-relaxed text-muted-foreground">
                {n.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
              </div>
              <p className="text-[11px] font-semibold mt-2.5 mb-1">המלצות מעשיות למחנכת</p>
              <ul className="space-y-1">
                {n.recs.map((r, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                    <span className="text-primary">•</span><span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
};

export default BoardAnalytics;
