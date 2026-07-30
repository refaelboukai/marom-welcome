import { useMemo } from "react";
import { IntakeSession } from "@/lib/types";
import { OptClass, bestFit, toOptStudent } from "@/lib/placement-optimizer";
import { Sparkles, Wand2 } from "lucide-react";

interface Props {
  unassigned: IntakeSession[];
  classes: OptClass[];
  membersBySection: Record<string, IntakeSession[]>;
  onAssign: (studentId: string, classKey: string) => void;
}

const scoreColor = (s: number) => (s >= 70 ? "text-success bg-success/10" : s >= 50 ? "text-warning bg-warning/10" : "text-destructive bg-destructive/10");

const BestFitPanel = ({ unassigned, classes, membersBySection, onAssign }: Props) => {
  const members = useMemo(() => {
    const out: Record<string, ReturnType<typeof toOptStudent>[]> = {};
    classes.forEach((c) => { out[c.key] = (membersBySection[c.key] || []).map(toOptStudent); });
    return out;
  }, [classes, membersBySection]);

  const rows = useMemo(
    () => unassigned.map((s) => ({ session: s, fits: bestFit(toOptStudent(s), classes, members).slice(0, 3) })),
    [unassigned, classes, members]
  );

  return (
    <div className="mb-5 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-heading font-bold mb-3 flex items-center gap-1.5">
        <Wand2 className="w-4 h-4 text-primary" /> שיבוץ מיטבי לתלמידים ללא שיוך ({unassigned.length})
      </h3>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">כל התלמידים משובצים לכיתות.</p>
      ) : (
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pl-1">
          {rows.map(({ session, fits }) => (
            <div key={session.id} className="rounded-xl border border-border p-2.5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-semibold">{session.studentName}</span>
                {session.grade && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{session.grade}</span>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {fits.map((f, i) => (
                  <button
                    key={f.classKey}
                    onClick={() => onAssign(session.id, f.classKey)}
                    className="text-right rounded-lg border border-border p-2 hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {i === 0 && <Sparkles className="w-3 h-3 text-primary" />}
                      <span className="text-xs font-semibold truncate">{f.label}</span>
                      <span className={`mr-auto text-[10px] px-1.5 py-0.5 rounded-full font-bold ${scoreColor(f.score)}`}>{f.score}</span>
                    </div>
                    <ul className="text-[10px] text-muted-foreground space-y-0.5">
                      {f.reasons.length ? f.reasons.map((r, j) => <li key={j}>• {r}</li>) : <li>• התאמה כללית תקינה</li>}
                    </ul>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border">
        הציון משקלל התאמת שכבה למחנכת, כימיה חברתית, גודל הכיתה, איזון מגדרי, פרופיל התנהגותי ועומס חושי. לחיצה משבצת מיד (ניתן לבטל).
      </p>
    </div>
  );
};

export default BestFitPanel;