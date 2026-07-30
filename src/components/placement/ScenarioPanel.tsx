import { useEffect, useMemo, useState } from "react";
import { Layers, Save, Trash2, Upload, GitCompare, Check, X } from "lucide-react";

export interface Scenario {
  id: string;
  name: string;
  createdAt: string;
  score: number;
  assign: Record<string, string>;
}

const KEY = "board_scenarios";

export const loadScenarios = (): Scenario[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Scenario[]) : [];
  } catch {
    return [];
  }
};

const persist = (list: Scenario[]) => {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
};

interface Props {
  currentAssign: Record<string, string>;
  currentScore: number;
  classLabels: Record<string, string>;
  namesById: Record<string, string>;
  onLoad: (assign: Record<string, string>) => void;
}

/** Save, compare and restore alternative placement scenarios (A/B). */
const ScenarioPanel = ({ currentAssign, currentScore, classLabels, namesById, onLoad }: Props) => {
  const [list, setList] = useState<Scenario[]>([]);
  const [name, setName] = useState("");
  const [compareId, setCompareId] = useState<string | null>(null);

  useEffect(() => { setList(loadScenarios()); }, []);

  const save = () => {
    const clean = name.trim() || `תרחיש ${list.length + 1}`;
    const next: Scenario[] = [
      ...list,
      { id: `sc_${Date.now().toString(36)}`, name: clean, createdAt: new Date().toISOString(), score: currentScore, assign: { ...currentAssign } },
    ].slice(-8);
    setList(next);
    persist(next);
    setName("");
  };

  const remove = (id: string) => {
    const next = list.filter((s) => s.id !== id);
    setList(next);
    persist(next);
    if (compareId === id) setCompareId(null);
  };

  const label = (k: string) => (k ? classLabels[k] || k : "ללא שיוך");

  const diff = useMemo(() => {
    const sc = list.find((s) => s.id === compareId);
    if (!sc) return null;
    const ids = Array.from(new Set([...Object.keys(currentAssign), ...Object.keys(sc.assign)]));
    const moves = ids
      .filter((id) => (currentAssign[id] || "") !== (sc.assign[id] || "") && namesById[id])
      .map((id) => ({ id, name: namesById[id], from: label(sc.assign[id] || ""), to: label(currentAssign[id] || "") }));
    const sizes: Record<string, { now: number; then: number }> = {};
    Object.keys(classLabels).forEach((k) => { sizes[k] = { now: 0, then: 0 }; });
    ids.forEach((id) => {
      if (!namesById[id]) return;
      const a = currentAssign[id] || "";
      const b = sc.assign[id] || "";
      if (sizes[a]) sizes[a].now++;
      if (sizes[b]) sizes[b].then++;
    });
    return { sc, moves, sizes };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareId, list, currentAssign, classLabels, namesById]);

  return (
    <div className="mb-5 rounded-2xl border border-border bg-card p-4">
      <h3 className="text-sm font-heading font-bold mb-3 flex items-center gap-1.5">
        <Layers className="w-4 h-4 text-primary" /> תרחישי שיבוץ (השוואה בין חלופות)
      </h3>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="שם התרחיש (למשל: חלופה א׳)"
          className="text-sm border border-border rounded-xl py-2 px-3 bg-background w-56"
        />
        <button onClick={save} className="px-3.5 py-2 rounded-xl text-sm bg-primary text-primary-foreground flex items-center gap-1.5 hover:opacity-90">
          <Save className="w-4 h-4" /> שמור את המצב הנוכחי
        </button>
        <span className="text-xs text-muted-foreground">ציון נוכחי: <strong className="text-foreground">{currentScore}</strong></span>
      </div>

      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground">אין עדיין תרחישים שמורים. שמרו מצב לפני שינויים גדולים כדי שתוכלו להשוות ולחזור אליו.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {list.map((s) => (
            <div key={s.id} className={`rounded-xl border px-3 py-2.5 ${compareId === s.id ? "border-primary bg-primary/5" : "border-border bg-background"}`}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold truncate flex-1">{s.name}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                  s.score >= currentScore ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                }`}>
                  ציון {s.score} ({s.score - currentScore > 0 ? "+" : ""}{s.score - currentScore})
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                נשמר ב-{new Date(s.createdAt).toLocaleDateString("he-IL")} {new Date(s.createdAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <button onClick={() => onLoad(s.assign)} className="px-2.5 py-1 rounded-lg text-xs border border-border hover:bg-muted flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" /> טען
                </button>
                <button onClick={() => setCompareId(compareId === s.id ? null : s.id)}
                  className="px-2.5 py-1 rounded-lg text-xs border border-border hover:bg-muted flex items-center gap-1">
                  {compareId === s.id ? <X className="w-3.5 h-3.5" /> : <GitCompare className="w-3.5 h-3.5" />} {compareId === s.id ? "סגור" : "השווה"}
                </button>
                <button onClick={() => remove(s.id)} className="mr-auto p-1.5 rounded-lg text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {diff && (
        <div className="mt-4 border-t border-border pt-3">
          <h4 className="text-xs font-bold mb-2">השוואה מול «{diff.sc.name}»</h4>
          <div className="flex flex-wrap gap-1.5 mb-2 text-[11px]">
            {Object.entries(diff.sizes).map(([k, v]) => (
              <span key={k} className={`px-2 py-1 rounded-lg ${v.now === v.then ? "bg-muted text-muted-foreground" : "bg-warning/15 text-warning"}`}>
                {classLabels[k]}: {v.then} ← {v.now}
              </span>
            ))}
          </div>
          {diff.moves.length === 0 ? (
            <p className="text-xs text-success flex items-center gap-1"><Check className="w-3.5 h-3.5" /> אין הבדלים בין התרחישים.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1.5">
              {diff.moves.map((m) => (
                <div key={m.id} className="text-xs rounded-lg bg-muted/50 px-2.5 py-1.5 flex items-center gap-2">
                  <span className="font-semibold truncate">{m.name}</span>
                  <span className="text-muted-foreground truncate">{m.from} ← {m.to}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScenarioPanel;