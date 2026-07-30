import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer,
  Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from "recharts";
import { IntakeSession, QOL_SUBDOMAIN_LABELS, LC_SUBDOMAIN_LABELS, SECTION_LABELS } from "@/lib/types";
import { buildStudentProfile } from "@/lib/class-aggregations";
import { questionnaireItems } from "@/data/questionnaires";
import { getStudentGender } from "@/lib/gender-utils";
import { BarChart3, Check, Download, Search, Sliders, Table2, X } from "lucide-react";

export interface StudioSection {
  key: string;
  label: string;
  teacher?: string;
  students: IntakeSession[];
}

const PALETTE = ["#0e9488", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#10b981", "#ec4899", "#64748b", "#14b8a6", "#a855f7"];

type Source = "both" | "student" | "parent";
type Agg = "mean" | "median" | "min" | "max" | "lowShare" | "count";
type GroupBy = "class" | "gender" | "grade" | "all";
type ChartKind = "bar" | "line" | "radar" | "pie" | "scatter" | "table";

interface Metric {
  id: string;
  label: string;
  group: string;
  /** returns value 1..5 (or raw) — null when no data */
  get: (ctx: MetricCtx) => number | null;
}

interface MetricCtx {
  session: IntakeSession;
  profile: ReturnType<typeof buildStudentProfile>;
  source: Source;
}

const itemValue = (s: IntakeSession, id: string, source: Source): number | null => {
  const st = s.studentResponses?.[id];
  const pa = s.parentResponses?.[id];
  if (source === "student") return typeof st === "number" ? st : null;
  if (source === "parent") return typeof pa === "number" ? pa : null;
  const vals = [st, pa].filter((v): v is number => typeof v === "number");
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
};

const CONDUCT: { key: "authority" | "rules" | "frustration" | "impulsivity" | "temperament" | "cooperation" | "average"; label: string }[] = [
  { key: "average", label: "ממוצע התנהגות כללי" },
  { key: "authority", label: "קבלת סמכות" },
  { key: "rules", label: "שמירת כללים" },
  { key: "frustration", label: "התמודדות עם תסכול" },
  { key: "impulsivity", label: "ויסות אימפולסיביות" },
  { key: "temperament", label: "יציבות רגשית" },
  { key: "cooperation", label: "שיתוף פעולה" },
];

const buildMetrics = (): Metric[] => {
  const list: Metric[] = [];

  Object.entries({
    qualityOfLife: SECTION_LABELS.quality_of_life,
    selfEfficacy: SECTION_LABELS.self_efficacy,
    locusOfControl: SECTION_LABELS.locus_of_control,
    cognitiveFlexibility: SECTION_LABELS.cognitive_flexibility,
    learningCharacteristics: SECTION_LABELS.learning_characteristics,
  }).forEach(([k, label]) =>
    list.push({ id: `dom:${k}`, label, group: "תחומי ליבה", get: ({ profile }) => profile.scores?.[k] || null })
  );

  Object.entries(QOL_SUBDOMAIN_LABELS).forEach(([k, label]) =>
    list.push({ id: `qol:${k}`, label, group: "איכות חיים — תת-תחומים", get: ({ profile }) => profile.qolSubdomains?.[k] || null })
  );

  Object.entries(LC_SUBDOMAIN_LABELS).forEach(([k, label]) =>
    list.push({ id: `lc:${k}`, label, group: "מאפייני למידה — תת-תחומים", get: ({ profile }) => profile.learningSubdomains?.[k] || null })
  );

  CONDUCT.forEach((c) =>
    list.push({
      id: `ca:${c.key}`,
      label: c.label,
      group: "התנהגות וסמכות (צוות)",
      get: ({ profile }) => {
        const v = profile.conductMetrics?.[c.key];
        return typeof v === "number" && v > 0 ? v : null;
      },
    })
  );

  list.push({
    id: "misc:sensory",
    label: "ויסות חושי (5=עמיד)",
    group: "מדדים כלליים",
    get: ({ profile }) => (typeof profile.sensorySensitivity === "number" && profile.sensorySensitivity > 0 ? profile.sensorySensitivity : null),
  });
  list.push({ id: "misc:risk", label: "מספר דגלי סיכון", group: "מדדים כלליים", get: ({ profile }) => profile.riskFlags.length });
  list.push({ id: "misc:completion", label: "אחוז השלמת שאלונים", group: "מדדים כלליים", get: ({ profile }) => profile.completion });

  questionnaireItems
    .filter((it) => !it.staffOnly)
    .forEach((it) =>
      list.push({
        id: `item:${it.id}`,
        label: `${it.id} · ${it.studentText}`,
        group: `פריטי שאלון — ${SECTION_LABELS[it.section]}`,
        get: ({ session, source }) => itemValue(session, it.id, source),
      })
    );

  return list;
};

const median = (v: number[]) => {
  if (!v.length) return 0;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const aggregate = (vals: number[], agg: Agg): number => {
  if (agg === "count") return vals.length;
  if (!vals.length) return 0;
  const r = (n: number) => Math.round(n * 100) / 100;
  switch (agg) {
    case "mean": return r(vals.reduce((a, b) => a + b, 0) / vals.length);
    case "median": return r(median(vals));
    case "min": return r(Math.min(...vals));
    case "max": return r(Math.max(...vals));
    case "lowShare": return r((vals.filter((v) => v <= 2.5).length / vals.length) * 100);
  }
};

const AGG_LABELS: Record<Agg, string> = {
  mean: "ממוצע",
  median: "חציון",
  min: "מינימום",
  max: "מקסימום",
  lowShare: "% מתחת ל-2.5",
  count: "מספר תלמידים עם נתון",
};

const genderOf = (s: IntakeSession): "male" | "female" | "unknown" => {
  if (s.gender === "female") return "female";
  if (s.gender === "male") return "male";
  const g = getStudentGender(s.studentName);
  return g === "male" || g === "female" ? g : "unknown";
};

const Select = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
  >
    {options.map((o) => (
      <option key={o.v} value={o.v}>{o.l}</option>
    ))}
  </select>
);

const ChartStudio = ({ sections, unassigned }: { sections: StudioSection[]; unassigned: IntakeSession[] }) => {
  const metrics = useMemo(buildMetrics, []);
  const metricById = useMemo(() => Object.fromEntries(metrics.map((m) => [m.id, m])), [metrics]);

  const [selected, setSelected] = useState<string[]>(["dom:qualityOfLife", "ca:average"]);
  const [chart, setChart] = useState<ChartKind>("bar");
  const [groupBy, setGroupBy] = useState<GroupBy>("class");
  const [agg, setAgg] = useState<Agg>("mean");
  const [source, setSource] = useState<Source>("both");
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">("all");
  const [includeUnassigned, setIncludeUnassigned] = useState(false);
  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState<string[]>(["תחומי ליבה"]);

  const grouped = useMemo(() => {
    const q = search.trim();
    const map = new Map<string, Metric[]>();
    metrics.forEach((m) => {
      if (q && !m.label.includes(q) && !m.id.includes(q)) return;
      const arr = map.get(m.group) || [];
      arr.push(m);
      map.set(m.group, arr);
    });
    return [...map.entries()];
  }, [metrics, search]);

  const rows = useMemo(() => {
    const all: { session: IntakeSession; profile: ReturnType<typeof buildStudentProfile>; classLabel: string }[] = [];
    sections.forEach((sec) =>
      sec.students.forEach((s) => all.push({ session: s, profile: buildStudentProfile(s), classLabel: sec.label }))
    );
    if (includeUnassigned) unassigned.forEach((s) => all.push({ session: s, profile: buildStudentProfile(s), classLabel: "ללא שיוך" }));
    return all.filter((r) => genderFilter === "all" || genderOf(r.session) === genderFilter);
  }, [sections, unassigned, includeUnassigned, genderFilter]);

  const groupKeyOf = (r: (typeof rows)[number]) => {
    if (groupBy === "class") return r.classLabel;
    if (groupBy === "grade") return r.session.grade || "ללא כיתת אם";
    if (groupBy === "gender") return genderOf(r.session) === "male" ? "בנים" : genderOf(r.session) === "female" ? "בנות" : "לא מוגדר";
    return "כלל התלמידים";
  };

  const groupNames = useMemo(() => {
    const set: string[] = [];
    rows.forEach((r) => {
      const k = groupKeyOf(r);
      if (!set.includes(k)) set.push(k);
    });
    return set;
  }, [rows, groupBy]);

  const selectedMetrics = selected.map((id) => metricById[id]).filter(Boolean);

  // aggregated data: one row per group, one key per metric
  const chartData = useMemo(() => {
    return groupNames.map((g) => {
      const row: Record<string, string | number> = { name: g };
      selectedMetrics.forEach((m) => {
        const vals = rows
          .filter((r) => groupKeyOf(r) === g)
          .map((r) => m.get({ session: r.session, profile: r.profile, source }))
          .filter((v): v is number => v != null);
        row[m.label] = aggregate(vals, agg);
      });
      return row;
    });
  }, [groupNames, rows, selectedMetrics, agg, source, groupBy]);

  // transposed for radar (metric on axis, group as series)
  const radarData = useMemo(
    () =>
      selectedMetrics.map((m) => {
        const row: Record<string, string | number> = { dim: m.label.length > 26 ? m.label.slice(0, 26) + "…" : m.label };
        groupNames.forEach((g) => {
          const vals = rows
            .filter((r) => groupKeyOf(r) === g)
            .map((r) => m.get({ session: r.session, profile: r.profile, source }))
            .filter((v): v is number => v != null);
          row[g] = aggregate(vals, agg);
        });
        return row;
      }),
    [groupNames, rows, selectedMetrics, agg, source, groupBy]
  );

  const scatterData = useMemo(() => {
    if (selectedMetrics.length < 2) return [];
    const [mx, my] = selectedMetrics;
    return rows
      .map((r) => {
        const x = mx.get({ session: r.session, profile: r.profile, source });
        const y = my.get({ session: r.session, profile: r.profile, source });
        if (x == null || y == null) return null;
        return { x, y, name: r.session.studentName, group: groupKeyOf(r) };
      })
      .filter(Boolean) as { x: number; y: number; name: string; group: string }[];
  }, [rows, selectedMetrics, source, groupBy]);

  const perStudent = useMemo(
    () =>
      rows.map((r) => {
        const row: Record<string, string | number> = {
          תלמיד: r.session.studentName,
          כיתה: r.classLabel,
          "כיתת אם": r.session.grade || "",
          מגדר: genderOf(r.session) === "male" ? "בן" : genderOf(r.session) === "female" ? "בת" : "",
        };
        selectedMetrics.forEach((m) => {
          const v = m.get({ session: r.session, profile: r.profile, source });
          row[m.label] = v == null ? "" : Math.round(v * 100) / 100;
        });
        return row;
      }),
    [rows, selectedMetrics, source]
  );

  const exportCsv = () => {
    const table = chart === "table" ? perStudent : chartData;
    if (!table.length) return;
    const headers = Object.keys(table[0]);
    const csv = [headers.join(","), ...table.map((r) => headers.map((h) => `"${String((r as Record<string, unknown>)[h] ?? "")}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "ניתוח-נתונים.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const isPercent = agg === "lowShare" || selected.every((s) => s === "misc:completion");
  const yDomain: [number, number] | undefined =
    agg === "count" || isPercent || selected.some((s) => s === "misc:risk" || s === "misc:completion") ? undefined : [0, 5];

  const tableRows = chart === "table" ? perStudent : chartData;
  const tableHeaders = tableRows.length ? Object.keys(tableRows[0]) : [];

  return (
    <div className="mb-5 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center gap-2">
        <Sliders className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-heading font-bold">בונה ניתוחים — בחר נתונים וצור גרף</h3>
        <span className="text-[11px] text-muted-foreground">{selected.length} מדדים נבחרו · {rows.length} תלמידים</span>
        <button onClick={exportCsv} className="mr-auto px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border border-border hover:bg-muted">
          <Download className="w-3.5 h-3.5" /> ייצוא CSV
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr]">
        {/* metric picker */}
        <div className="border-b lg:border-b-0 lg:border-l border-border p-3 max-h-[540px] overflow-y-auto">
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש מדד או שאלה…"
              className="w-full pr-8 pl-2 py-1.5 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {selectedMetrics.map((m) => (
                <button key={m.id} onClick={() => toggle(m.id)} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center gap-1">
                  {m.label.length > 22 ? m.label.slice(0, 22) + "…" : m.label}
                  <X className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}

          {grouped.map(([group, items]) => {
            const open = openGroups.includes(group) || !!search;
            return (
              <div key={group} className="mb-1.5">
                <button
                  onClick={() => setOpenGroups((p) => (p.includes(group) ? p.filter((g) => g !== group) : [...p, group]))}
                  className="w-full text-right px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-muted/60 hover:bg-muted flex items-center justify-between"
                >
                  <span>{group}</span>
                  <span className="text-muted-foreground">{items.length}</span>
                </button>
                {open && (
                  <div className="mt-1 space-y-0.5">
                    {items.map((m) => {
                      const on = selected.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => toggle(m.id)}
                          className={`w-full text-right px-2 py-1 rounded-md text-[11px] flex items-center gap-1.5 transition-colors ${on ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/70"}`}
                        >
                          <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${on ? "bg-primary border-primary" : "border-border"}`}>
                            {on && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                          </span>
                          <span className="truncate">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* chart area */}
        <div className="p-3">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Select
              value={chart}
              onChange={(v) => setChart(v as ChartKind)}
              options={[
                { v: "bar", l: "גרף עמודות" },
                { v: "line", l: "גרף קו" },
                { v: "radar", l: "ראדאר" },
                { v: "pie", l: "עוגה" },
                { v: "scatter", l: "פיזור (2 מדדים)" },
                { v: "table", l: "טבלת נתונים" },
              ]}
            />
            <Select
              value={groupBy}
              onChange={(v) => setGroupBy(v as GroupBy)}
              options={[
                { v: "class", l: "פילוח לפי כיתה" },
                { v: "grade", l: "פילוח לפי כיתת אם" },
                { v: "gender", l: "פילוח לפי מגדר" },
                { v: "all", l: "ללא פילוח" },
              ]}
            />
            <Select
              value={agg}
              onChange={(v) => setAgg(v as Agg)}
              options={(Object.keys(AGG_LABELS) as Agg[]).map((a) => ({ v: a, l: AGG_LABELS[a] }))}
            />
            <Select
              value={source}
              onChange={(v) => setSource(v as Source)}
              options={[
                { v: "both", l: "מקור: תלמיד + הורה" },
                { v: "student", l: "מקור: תלמיד בלבד" },
                { v: "parent", l: "מקור: הורה בלבד" },
              ]}
            />
            <Select
              value={genderFilter}
              onChange={(v) => setGenderFilter(v as "all" | "male" | "female")}
              options={[
                { v: "all", l: "כל התלמידים" },
                { v: "male", l: "בנים בלבד" },
                { v: "female", l: "בנות בלבד" },
              ]}
            />
            <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
              <input type="checkbox" checked={includeUnassigned} onChange={(e) => setIncludeUnassigned(e.target.checked)} className="accent-primary" />
              כלול ללא שיוך
            </label>
          </div>

          {selectedMetrics.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
              <BarChart3 className="w-8 h-8 opacity-40" />
              בחר מדד אחד או יותר מהרשימה כדי לבנות גרף.
            </div>
          ) : chart === "table" || (chart === "pie" && selectedMetrics.length > 1) ? (
            <div className="max-h-[430px] overflow-auto rounded-xl border border-border">
              <table className="w-full text-[11px]">
                <thead className="bg-muted/60 sticky top-0">
                  <tr>{tableHeaders.map((h) => <th key={h} className="px-2 py-1.5 text-right font-semibold whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {tableRows.map((r, i) => (
                    <tr key={i} className="border-t border-border hover:bg-muted/30">
                      {tableHeaders.map((h) => <td key={h} className="px-2 py-1.5 whitespace-nowrap">{String((r as Record<string, unknown>)[h] ?? "")}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-[430px]">
              <ResponsiveContainer width="100%" height="100%">
                {chart === "bar" ? (
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={yDomain} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ direction: "rtl", fontSize: 12, borderRadius: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {selectedMetrics.map((m, i) => (
                      <Bar key={m.id} dataKey={m.label} fill={PALETTE[i % PALETTE.length]} radius={[5, 5, 0, 0]} />
                    ))}
                  </BarChart>
                ) : chart === "line" ? (
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={yDomain} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ direction: "rtl", fontSize: 12, borderRadius: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {selectedMetrics.map((m, i) => (
                      <Line key={m.id} type="monotone" dataKey={m.label} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={{ r: 3 }} />
                    ))}
                  </LineChart>
                ) : chart === "radar" ? (
                  <RadarChart data={radarData} outerRadius="72%">
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="dim" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis domain={yDomain || [0, "auto"]} tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={{ direction: "rtl", fontSize: 12, borderRadius: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {groupNames.map((g, i) => (
                      <Radar key={g} name={g} dataKey={g} stroke={PALETTE[i % PALETTE.length]} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.12} />
                    ))}
                  </RadarChart>
                ) : chart === "pie" ? (
                  <PieChart>
                    <Tooltip contentStyle={{ direction: "rtl", fontSize: 12, borderRadius: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Pie
                      data={chartData.map((d) => ({ name: d.name as string, value: Number(d[selectedMetrics[0].label]) || 0 }))}
                      dataKey="value"
                      nameKey="name"
                      outerRadius="72%"
                      label={(e: { name?: string; value?: number }) => `${e.name}: ${e.value}`}
                    >
                      {chartData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Pie>
                  </PieChart>
                ) : (
                  <ScatterChart margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" dataKey="x" name={selectedMetrics[0]?.label} tick={{ fontSize: 11 }} domain={[0, 5]} />
                    <YAxis type="number" dataKey="y" name={selectedMetrics[1]?.label} tick={{ fontSize: 11 }} domain={[0, 5]} />
                    <ZAxis range={[70, 70]} />
                    <Tooltip
                      contentStyle={{ direction: "rtl", fontSize: 12, borderRadius: 12 }}
                      formatter={(v: number, n: string) => [v, n === "x" ? selectedMetrics[0]?.label : selectedMetrics[1]?.label]}
                      labelFormatter={() => ""}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {groupNames.map((g, i) => (
                      <Scatter key={g} name={g} data={scatterData.filter((d) => d.group === g)} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </ScatterChart>
                )}
              </ResponsiveContainer>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1.5">
            <Table2 className="w-3.5 h-3.5" />
            {chart === "scatter"
              ? "בפיזור מוצג כל תלמיד כנקודה: המדד הראשון על ציר X והשני על ציר Y."
              : `${AGG_LABELS[agg]} של המדדים הנבחרים, ${groupBy === "all" ? "ללא פילוח" : "בפילוח לפי " + (groupBy === "class" ? "כיתה" : groupBy === "grade" ? "כיתת אם" : "מגדר")}. סולם 1–5 אלא אם נבחר אחוז/מונה.`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChartStudio;