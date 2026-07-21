import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, User, Save, Edit3, Check, X, Sparkles } from "lucide-react";
import {
  getTeacherProfiles,
  saveTeacherProfile,
  getClassGroups,
  DEFAULT_CLASS_GROUPS,
  ClassGroupsMap,
  TeacherProfilesMap,
  TeacherProfile,
  TEACHER_METRIC_LABELS,
  TEACHER_METRIC_KEYS,
  TeacherMetricKey,
} from "@/lib/supabase-storage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const GRADE_OPTIONS = ["ז", "ח", "ט", "י"];

const TeacherProfiles = () => {
  const navigate = useNavigate();
  const [classGroups, setClassGroups] = useState<ClassGroupsMap>(DEFAULT_CLASS_GROUPS);
  const [teachers, setTeachers] = useState<TeacherProfilesMap>({});
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<TeacherProfile>({ name: "" });
  const [saving, setSaving] = useState(false);
  const [extractingKey, setExtractingKey] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getClassGroups(), getTeacherProfiles()]).then(([g, t]) => {
      setClassGroups(g);
      setTeachers(t);
      setLoading(false);
    });
  }, []);

  const startEdit = (key: string) => {
    setEditingKey(key);
    setDraft(teachers[key] || { name: classGroups[key]?.replace("הכיתה של ", "") || "" });
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setDraft({ name: "" });
  };

  const save = async () => {
    if (!editingKey) return;
    setSaving(true);
    const ok = await saveTeacherProfile(editingKey, draft);
    if (ok) {
      setTeachers((prev) => ({ ...prev, [editingKey]: draft }));
      setEditingKey(null);
    }
    setSaving(false);
  };

  const extractMetrics = async (key: string, source: TeacherProfile, inEdit: boolean) => {
    if (!source.bio && !source.notes) {
      toast({ title: "אין טקסט לניתוח", description: "כתוב פרופיל מורחב ואז הפק ציונים.", variant: "destructive" });
      return;
    }
    setExtractingKey(key);
    try {
      const { data, error } = await supabase.functions.invoke("extract-teacher-metrics", {
        body: { name: source.name, bio: source.bio, notes: source.notes },
      });
      if (error) throw error;
      const metrics = (data as any)?.metrics;
      if (!metrics) throw new Error("לא התקבלו ציונים");
      const updated: TeacherProfile = { ...source, metrics, metricsUpdatedAt: new Date().toISOString() };
      if (inEdit) {
        setDraft(updated);
      } else {
        await saveTeacherProfile(key, updated);
        setTeachers((prev) => ({ ...prev, [key]: updated }));
      }
      toast({ title: "הציונים חולצו בהצלחה", description: "8 מדדים עודכנו על סמך הפרופיל." });
    } catch (e: any) {
      toast({ title: "שגיאה בהפקת ציונים", description: e?.message || "נסה שוב", variant: "destructive" });
    } finally {
      setExtractingKey(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/admin")} className="p-2 rounded-lg hover:bg-muted"><ArrowRight className="w-5 h-5" /></button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-heading font-bold truncate flex items-center gap-2"><User className="w-5 h-5 text-primary" /> פרופילי מחנכות</h1>
            <p className="text-xs text-muted-foreground">מידע מורחב על כל מחנכת — משמש את מנוע השיבוץ להתאמה אישית של תלמידים</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {Object.entries(classGroups).map(([key, label]) => {
          const t = teachers[key];
          const isEditing = editingKey === key;
          return (
            <div key={key} className="intake-card">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                  {isEditing ? (
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      placeholder="שם המחנכת"
                      className="mt-1 bg-card border border-input rounded-lg px-2 py-1 text-lg font-heading font-bold"
                    />
                  ) : (
                    <h2 className="text-xl font-heading font-bold">{t?.name || "— לא הוגדרה מחנכת —"}</h2>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <>
                      <button onClick={save} disabled={saving} className="btn-intake bg-primary text-primary-foreground text-xs px-3 py-1.5 gap-1 disabled:opacity-50">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} שמור
                      </button>
                      <button onClick={cancelEdit} className="btn-intake bg-muted text-foreground text-xs px-3 py-1.5 gap-1">
                        <X className="w-3.5 h-3.5" /> בטל
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => extractMetrics(key, t || { name: "" }, false)}
                        disabled={extractingKey === key || (!t?.bio && !t?.notes)}
                        className="btn-intake bg-primary/10 text-primary text-xs px-3 py-1.5 gap-1 disabled:opacity-50"
                        title="חלץ ציונים מספריים מהפרופיל המילולי באמצעות בינה מלאכותית"
                      >
                        {extractingKey === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        {t?.metrics ? "רענן ציונים" : "הפק ציונים"}
                      </button>
                      <button onClick={() => startEdit(key)} className="btn-intake bg-muted text-foreground text-xs px-3 py-1.5 gap-1">
                        <Edit3 className="w-3.5 h-3.5" /> ערוך
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground">שכבות גיל שהמחנכת מלמדת</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {GRADE_OPTIONS.map((g) => {
                        const selected = (draft.grades || []).includes(g);
                        return (
                          <button
                            key={g}
                            type="button"
                            onClick={() => {
                              const cur = new Set(draft.grades || []);
                              if (selected) cur.delete(g); else cur.add(g);
                              setDraft({ ...draft, grades: Array.from(cur) });
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm border transition ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-input hover:bg-muted"}`}
                          >
                            כיתה {g}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10.5px] text-muted-foreground mt-1">מנוע השיבוץ ישבץ אליה רק תלמידים משכבות אלו.</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground">פרופיל מורחב (bio)</label>
                    <textarea
                      value={draft.bio || ""}
                      onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                      placeholder="תפיסה חינוכית, גישה טיפולית, חוזקות, סגנון עבודה, ערכים, הערות חופשיות..."
                      rows={12}
                      className="mt-1 w-full bg-card border border-input rounded-lg px-3 py-2 text-sm leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground">הערות פנימיות (רשות)</label>
                    <textarea
                      value={draft.notes || ""}
                      onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                      rows={3}
                      className="mt-1 w-full bg-card border border-input rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-bold text-muted-foreground">מדדים מספריים (1–5)</label>
                      <button
                        type="button"
                        onClick={() => extractMetrics(editingKey!, draft, true)}
                        disabled={extractingKey === editingKey || (!draft.bio && !draft.notes)}
                        className="btn-intake bg-primary/10 text-primary text-[11px] px-2 py-1 gap-1 disabled:opacity-50"
                      >
                        {extractingKey === editingKey ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        {draft.metrics ? "רענן מהטקסט" : "הפק מהטקסט"}
                      </button>
                    </div>
                    <MetricsGrid
                      metrics={draft.metrics}
                      editable
                      onChange={(k, v) => setDraft({ ...draft, metrics: { ...(draft.metrics || {}), [k]: v } })}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {t?.grades && t.grades.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {t.grades.map((g) => (
                        <span key={g} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">כיתה {g}</span>
                      ))}
                    </div>
                  )}
                  {!t?.metrics && (
                    t?.bio ? (
                      <div className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">{t.bio}</div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">טרם הוזן פרופיל מורחב — לחץ "ערוך" להוספה.</p>
                    )
                  )}
                  {t?.metrics && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-[11px] font-bold text-muted-foreground mb-2">מדדים מספריים (1–5) — חולצו מהפרופיל</p>
                      <MetricsGrid metrics={t.metrics} />
                    </div>
                  )}
                  {t?.notes && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-[11px] font-bold text-muted-foreground mb-1">הערות פנימיות</p>
                      <p className="text-xs text-foreground/75 whitespace-pre-line">{t.notes}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeacherProfiles;

function MetricsGrid({
  metrics,
  editable,
  onChange,
}: {
  metrics?: Partial<Record<TeacherMetricKey, number>>;
  editable?: boolean;
  onChange?: (k: TeacherMetricKey, v: number) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {TEACHER_METRIC_KEYS.map((k) => {
        const val = metrics?.[k] ?? 3;
        const pct = ((val - 1) / 4) * 100;
        return (
          <div key={k} className="bg-muted/40 rounded-lg px-3 py-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11.5px] font-bold text-foreground/80">{TEACHER_METRIC_LABELS[k]}</span>
              <span className="text-[11px] font-bold text-primary tabular-nums">{val}/5</span>
            </div>
            <div className="h-1.5 rounded-full bg-border overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            {editable && (
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={val}
                onChange={(e) => onChange?.(k, Number(e.target.value))}
                className="w-full mt-1 accent-primary"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}