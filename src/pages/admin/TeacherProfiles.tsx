import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, User, Save, Edit3, Check, X } from "lucide-react";
import {
  getTeacherProfiles,
  saveTeacherProfile,
  getClassGroups,
  DEFAULT_CLASS_GROUPS,
  ClassGroupsMap,
  TeacherProfilesMap,
  TeacherProfile,
} from "@/lib/supabase-storage";

const GRADE_OPTIONS = ["ז", "ח", "ט", "י"];

const TeacherProfiles = () => {
  const navigate = useNavigate();
  const [classGroups, setClassGroups] = useState<ClassGroupsMap>(DEFAULT_CLASS_GROUPS);
  const [teachers, setTeachers] = useState<TeacherProfilesMap>({});
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<TeacherProfile>({ name: "" });
  const [saving, setSaving] = useState(false);

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
                    <button onClick={() => startEdit(key)} className="btn-intake bg-muted text-foreground text-xs px-3 py-1.5 gap-1">
                      <Edit3 className="w-3.5 h-3.5" /> ערוך
                    </button>
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
                  {t?.bio ? (
                    <div className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">{t.bio}</div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">טרם הוזן פרופיל מורחב — לחץ "ערוך" להוספה.</p>
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