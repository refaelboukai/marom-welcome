import { useMemo, useState } from "react";
import { IntakeSession } from "@/lib/types";
import { buildStudentProfile, StudentProfileForAI } from "@/lib/class-aggregations";
import { HeartHandshake, AlertTriangle, Plus, X, Loader2, Users } from "lucide-react";

export interface PairSection {
  key: string;
  label: string;
  students: IntakeSession[];
}

export type RelationType = "prefer" | "avoid" | "none";

interface Suggestion {
  aId: string;
  bId: string;
  aName: string;
  bName: string;
  where: string;
  reason: string;
  kind: "match" | "risk";
}

const has = (v?: number) => typeof v === "number" && v > 0;

const wordsOf = (p: StudentProfileForAI) =>
  new Set(
    (p.openResponses?.interests || "")
      .split(/[\s,.;/־-]+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 3)
  );

function analyzePair(a: StudentProfileForAI, b: StudentProfileForAI, where: string): Suggestion | null {
  const ca = a.conductMetrics, cb = b.conductMetrics;
  const reasonsRisk: string[] = [];
  const reasonsMatch: string[] = [];

  if (ca && cb) {
    if (ca.average <= 2.7 && cb.average <= 2.7) reasonsRisk.push("שני התלמידים עם ממוצע התנהגות נמוך — סיכון להסלמה הדדית");
    if (has(ca.impulsivity) && has(cb.impulsivity) && ca.impulsivity <= 2.5 && cb.impulsivity <= 2.5)
      reasonsRisk.push("אימפולסיביות גבוהה אצל שניהם");
    if (has(ca.authority) && has(cb.authority) && ca.authority <= 2.5 && cb.authority <= 2.5)
      reasonsRisk.push("קושי משותף בקבלת סמכות");
    if ((ca.average >= 4 && cb.average <= 2.7) || (cb.average >= 4 && ca.average <= 2.7))
      reasonsMatch.push("עוגן מייצב לצד תלמיד הזקוק לתיווך התנהגותי");
    if (has(ca.cooperation) && has(cb.cooperation) && ca.cooperation >= 4 && cb.cooperation >= 4)
      reasonsMatch.push("שיתוף פעולה גבוה אצל שניהם");
  }

  const sa = a.sensorySensitivity ?? -1, sb = b.sensorySensitivity ?? -1;
  if (sa > 0 && sb > 0 && sa <= 2.5 && sb <= 2.5) reasonsRisk.push("רגישות חושית גבוהה אצל שניהם — עומס סביבתי");

  const qa = a.scores?.qualityOfLife ?? -1, qb = b.scores?.qualityOfLife ?? -1;
  if (qa > 0 && qb > 0 && qa < 2.5 && qb < 2.5) reasonsRisk.push("איכות חיים נמוכה אצל שניהם");
  const socA = a.qolSubdomains?.social ?? -1, socB = b.qolSubdomains?.social ?? -1;
  if (socA > 0 && socB > 0 && ((socA >= 4 && socB < 2.5) || (socB >= 4 && socA < 2.5)))
    reasonsMatch.push("תלמיד חברתי לצד תלמיד הזקוק לחיזוק חברתי");

  const wa = wordsOf(a), wb = wordsOf(b);
  const shared = [...wa].filter((w) => wb.has(w));
  if (shared.length >= 1) reasonsMatch.push(`תחומי עניין משותפים: ${shared.slice(0, 3).join(", ")}`);

  if (reasonsRisk.length) return { aId: a.id, bId: b.id, aName: a.name, bName: b.name, where, reason: reasonsRisk.join(" · "), kind: "risk" };
  if (reasonsMatch.length >= 1) return { aId: a.id, bId: b.id, aName: a.name, bName: b.name, where, reason: reasonsMatch.join(" · "), kind: "match" };
  return null;
}

const PairSuggestions = ({
  sections,
  unassigned,
  onSetRelation,
}: {
  sections: PairSection[];
  unassigned: IntakeSession[];
  onSetRelation: (aId: string, bId: string, type: RelationType) => Promise<void>;
}) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [manualA, setManualA] = useState("");
  const [manualB, setManualB] = useState("");

  const all = useMemo(() => [...sections.flatMap((s) => s.students), ...unassigned], [sections, unassigned]);
  const nameOf = useMemo(() => Object.fromEntries(all.map((s) => [s.id, s.studentName])), [all]);

  const { matches, risks, existing } = useMemo(() => {
    const matches: Suggestion[] = [];
    const risks: Suggestion[] = [];
    sections.forEach((sec) => {
      const profiles = sec.students.map(buildStudentProfile);
      for (let i = 0; i < profiles.length; i++) {
        for (let j = i + 1; j < profiles.length; j++) {
          const rel = profiles[i].relationships;
          if (rel && (rel.prefer?.includes(profiles[j].id) || rel.avoid?.includes(profiles[j].id))) continue;
          const res = analyzePair(profiles[i], profiles[j], sec.label);
          if (!res) continue;
          (res.kind === "risk" ? risks : matches).push(res);
        }
      }
    });

    const existing: { aId: string; bId: string; aName: string; bName: string; type: "prefer" | "avoid" }[] = [];
    const seen = new Set<string>();
    all.forEach((s) => {
      const rel = (s as any).relationships as { avoid?: string[]; prefer?: string[] } | undefined;
      if (!rel) return;
      (["prefer", "avoid"] as const).forEach((type) => {
        (rel[type] || []).forEach((oid) => {
          if (!nameOf[oid]) return;
          const k = `${type}:${[s.id, oid].sort().join("|")}`;
          if (seen.has(k)) return;
          seen.add(k);
          existing.push({ aId: s.id, bId: oid, aName: s.studentName, bName: nameOf[oid], type });
        });
      });
    });

    return { matches: matches.slice(0, 12), risks: risks.slice(0, 12), existing };
  }, [sections, all, nameOf]);

  const act = async (aId: string, bId: string, type: RelationType) => {
    const k = `${aId}|${bId}|${type}`;
    setBusy(k);
    await onSetRelation(aId, bId, type);
    setBusy(null);
  };

  const sortedAll = useMemo(() => [...all].sort((a, b) => a.studentName.localeCompare(b.studentName, "he")), [all]);

  return (
    <div className="mb-5 grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-heading font-bold mb-3 flex items-center gap-1.5">
          <HeartHandshake className="w-4 h-4 text-success" /> זוגות מומלצים באותה כיתה ({matches.length})
        </h3>
        {matches.length === 0 ? (
          <p className="text-xs text-muted-foreground">לא נמצאו כרגע התאמות מובהקות בין תלמידים באותה כיתה.</p>
        ) : (
          <ul className="space-y-2">
            {matches.map((m) => (
              <li key={`${m.aId}-${m.bId}`} className="rounded-xl bg-success/5 border border-success/20 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-success">{m.aName} + {m.bName}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{m.reason} · {m.where}</p>
                  </div>
                  <button onClick={() => act(m.aId, m.bId, "prefer")}
                    className="shrink-0 px-2 py-1 rounded-lg text-[11px] bg-success/15 text-success hover:bg-success/25 flex items-center gap-1">
                    {busy === `${m.aId}|${m.bId}|prefer` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} סמן כהתאמה
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-heading font-bold mb-3 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-destructive" /> זוגות בסיכון באותה כיתה ({risks.length})
        </h3>
        {risks.length === 0 ? (
          <p className="text-xs text-muted-foreground">לא זוהו צירופים בעייתיים בין תלמידים באותה כיתה.</p>
        ) : (
          <ul className="space-y-2">
            {risks.map((m) => (
              <li key={`${m.aId}-${m.bId}`} className="rounded-xl bg-destructive/5 border border-destructive/20 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-destructive">{m.aName} ↔ {m.bName}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{m.reason} · {m.where}</p>
                  </div>
                  <button onClick={() => act(m.aId, m.bId, "avoid")}
                    className="shrink-0 px-2 py-1 rounded-lg text-[11px] bg-destructive/15 text-destructive hover:bg-destructive/25 flex items-center gap-1">
                    {busy === `${m.aId}|${m.bId}|avoid` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} סמן להרחקה
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm xl:col-span-2">
        <h3 className="text-sm font-heading font-bold mb-3 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-primary" /> הגדרה ידנית של התאמות
        </h3>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select value={manualA} onChange={(e) => setManualA(e.target.value)}
            className="text-sm border border-border rounded-xl py-2 px-3 bg-background min-w-[170px]">
            <option value="">בחר תלמיד…</option>
            {sortedAll.map((s) => <option key={s.id} value={s.id}>{s.studentName}</option>)}
          </select>
          <select value={manualB} onChange={(e) => setManualB(e.target.value)}
            className="text-sm border border-border rounded-xl py-2 px-3 bg-background min-w-[170px]">
            <option value="">בחר תלמיד נוסף…</option>
            {sortedAll.filter((s) => s.id !== manualA).map((s) => <option key={s.id} value={s.id}>{s.studentName}</option>)}
          </select>
          <button disabled={!manualA || !manualB} onClick={() => act(manualA, manualB, "prefer")}
            className="px-3 py-2 rounded-xl text-sm bg-success/15 text-success hover:bg-success/25 disabled:opacity-40">
            הוסף כהתאמה
          </button>
          <button disabled={!manualA || !manualB} onClick={() => act(manualA, manualB, "avoid")}
            className="px-3 py-2 rounded-xl text-sm bg-destructive/15 text-destructive hover:bg-destructive/25 disabled:opacity-40">
            הוסף להרחקה
          </button>
        </div>

        <p className="text-xs font-semibold mb-2">התאמות שהוגדרו ({existing.length})</p>
        {existing.length === 0 ? (
          <p className="text-xs text-muted-foreground">טרם הוגדרו התאמות ידניות.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {existing.map((e) => (
              <span key={`${e.type}-${e.aId}-${e.bId}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] ${
                  e.type === "prefer" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                }`}>
                {e.type === "prefer" ? "יחד" : "להרחיק"}: {e.aName} {e.type === "prefer" ? "+" : "↔"} {e.bName}
                <button onClick={() => act(e.aId, e.bId, "none")} title="הסר">
                  {busy === `${e.aId}|${e.bId}|none` ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PairSuggestions;