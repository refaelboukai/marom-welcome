import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSessionsDB, getClassGroups, DEFAULT_CLASS_GROUPS, ClassGroupsMap, getTeacherProfiles, saveTeacherProfile, TeacherProfile } from "@/lib/supabase-storage";
import { IntakeSession } from "@/lib/types";
import { aggregateClass, buildStudentProfile, StudentProfileForAI } from "@/lib/class-aggregations";
import { ArrowRight, Loader2, Camera, User as UserIcon, Star, AlertTriangle, Users, Sparkles } from "lucide-react";
import { questionnaireItems } from "@/data/questionnaires";

function studentAvg(p: StudentProfileForAI): number {
  const vals = Object.values(p.scores).filter((v) => v > 0);
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function scoreTone(v: number): string {
  if (v >= 4) return "border-success/50 bg-success/5";
  if (v >= 3) return "border-primary/40 bg-primary/5";
  if (v >= 2) return "border-warning/40 bg-warning/5";
  if (v > 0) return "border-destructive/40 bg-destructive/5";
  return "border-border bg-muted/20";
}

// Cluster students by shared strong/weak items -> sociometric groups
function buildSharedGroups(profiles: StudentProfileForAI[], sessions: IntakeSession[]) {
  // For each item id, list students that have it as strength or challenge
  const strengthMap: Record<string, { text: string; students: string[] }> = {};
  const challengeMap: Record<string, { text: string; students: string[] }> = {};
  const itemAvg = (s: IntakeSession, id: string) => {
    const vals: number[] = [];
    if (s.studentResponses?.[id] != null) vals.push(s.studentResponses[id]);
    if (s.parentResponses?.[id] != null) vals.push(s.parentResponses[id]);
    if (!vals.length) return -1;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  for (const s of sessions) {
    for (const it of questionnaireItems) {
      const raw = itemAvg(s, it.id);
      if (raw < 0) continue;
      const eff = it.isReverse ? 6 - raw : raw;
      if (eff >= 4) {
        strengthMap[it.id] = strengthMap[it.id] || { text: it.studentText, students: [] };
        strengthMap[it.id].students.push(s.studentName);
      }
      if (eff <= 2) {
        challengeMap[it.id] = challengeMap[it.id] || { text: it.studentText, students: [] };
        challengeMap[it.id].students.push(s.studentName);
      }
    }
  }
  const strengths = Object.values(strengthMap).filter((g) => g.students.length >= 3).sort((a, b) => b.students.length - a.students.length).slice(0, 5);
  const challenges = Object.values(challengeMap).filter((g) => g.students.length >= 3).sort((a, b) => b.students.length - a.students.length).slice(0, 5);
  return { strengths, challenges };
}

const GENDER_ICON: Record<string, string> = { male: "♂", female: "♀", unspecified: "•" };
const GENDER_TONE: Record<string, string> = { male: "text-blue-500", female: "text-pink-500", unspecified: "text-muted-foreground" };

const ClassVisual = () => {
  const { classKey = "" } = useParams();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<IntakeSession[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroupsMap>(DEFAULT_CLASS_GROUPS);
  const [teacher, setTeacher] = useState<TeacherProfile>({ name: "" });
  const [loading, setLoading] = useState(true);
  const [editingTeacher, setEditingTeacher] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [teacherPhoto, setTeacherPhoto] = useState<string | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);
  const [highlightStudents, setHighlightStudents] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([getSessionsDB(), getClassGroups(), getTeacherProfiles()]).then(([s, g, t]) => {
      setSessions(s);
      setClassGroups(g);
      const prof = t[classKey] || { name: "" };
      setTeacher(prof);
      setTeacherName(prof.name || "");
      setTeacherPhoto(prof.photoDataUrl);
      setLoading(false);
    });
  }, [classKey]);

  const classLabel = classGroups[classKey] || classKey;

  const { profiles, sharedGroups, avgClass } = useMemo(() => {
    const classSessions = sessions.filter((s) => s.classGroup === classKey && s.status !== "archived");
    const agg = aggregateClass(classKey, classLabel, classSessions);
    const profs = agg.studentProfiles;
    const shared = buildSharedGroups(profs, classSessions);
    const vals = Object.values(agg.avgScores).filter((v) => v > 0);
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { profiles: profs, sharedGroups: shared, avgClass: avg };
  }, [sessions, classKey, classLabel]);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // downscale to keep small
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 300;
        const ratio = Math.min(max / img.width, max / img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setTeacherPhoto(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const saveTeacher = async () => {
    const next: TeacherProfile = { name: teacherName.trim(), photoDataUrl: teacherPhoto };
    await saveTeacherProfile(classKey, next);
    setTeacher(next);
    setEditingTeacher(false);
  };

  const toggleGroupHighlight = (studentsInGroup: string[]) => {
    const setEq = highlightStudents.size === studentsInGroup.length && studentsInGroup.every((n) => highlightStudents.has(n));
    setHighlightStudents(setEq ? new Set() : new Set(studentsInGroup));
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/admin")} className="p-2 rounded-lg hover:bg-muted"><ArrowRight className="w-5 h-5" /></button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-heading font-bold truncate">תצוגת כיתה — {classLabel}</h1>
            <p className="text-xs text-muted-foreground">מבט ויזואלי על הכיתה, מחנכת ותלמידים</p>
          </div>
          <button onClick={() => navigate(`/admin/class/${classKey}`)} className="btn-intake bg-primary/10 text-primary text-xs px-3 py-2 gap-1">
            <Sparkles className="w-3.5 h-3.5" /> תובנות מלאות
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {/* Teacher card */}
        <div className="intake-card bg-gradient-to-l from-primary/5 to-transparent border-primary/20">
          <div className="flex items-center gap-4">
            <div className="relative">
              {teacherPhoto ? (
                <img src={teacherPhoto} alt={teacher.name || "מחנכת"} className="w-20 h-20 rounded-2xl object-cover border-2 border-primary/30 shadow-sm" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-dashed border-primary/30">
                  <UserIcon className="w-8 h-8 text-primary/60" />
                </div>
              )}
              {editingTeacher && (
                <button onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow">
                  <Camera className="w-3.5 h-3.5" />
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            </div>
            <div className="flex-1 min-w-0">
              {editingTeacher ? (
                <div className="space-y-2">
                  <input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="שם המחנכת"
                    className="w-full bg-card border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  <div className="flex gap-2">
                    <button onClick={saveTeacher} className="btn-intake bg-primary text-primary-foreground text-xs px-3 py-1.5">שמור</button>
                    <button onClick={() => { setEditingTeacher(false); setTeacherName(teacher.name || ""); setTeacherPhoto(teacher.photoDataUrl); }}
                      className="btn-intake bg-muted text-foreground text-xs px-3 py-1.5">ביטול</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">מחנכת הכיתה</p>
                  <h2 className="text-xl font-heading font-bold">{teacher.name || "טרם הוגדר"}</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {profiles.length} תלמידים · ממוצע כיתתי {avgClass > 0 ? avgClass.toFixed(2) : "—"}
                  </p>
                  <button onClick={() => setEditingTeacher(true)} className="text-xs text-primary hover:underline mt-1">
                    {teacher.name ? "עריכת פרטי מחנכת" : "הוספת פרטי מחנכת"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {profiles.length === 0 ? (
          <div className="intake-card text-center py-12">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">אין תלמידים בכיתה זו</p>
          </div>
        ) : (
          <>
            {/* Student grid */}
            <div className="intake-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-bold text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> מפת הכיתה</h3>
                {highlightStudents.size > 0 && (
                  <button onClick={() => setHighlightStudents(new Set())} className="text-xs text-primary hover:underline">נקה הדגשה</button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {profiles.map((p) => {
                  const avg = studentAvg(p);
                  const highlighted = highlightStudents.size === 0 || highlightStudents.has(p.name);
                  const dim = highlightStudents.size > 0 && !highlighted;
                  return (
                    <div key={p.id}
                      className={`rounded-xl border-2 p-2.5 transition-all ${scoreTone(avg)} ${dim ? "opacity-25" : ""} ${highlighted && highlightStudents.size > 0 ? "ring-2 ring-primary shadow-md" : ""}`}>
                      <div className="flex items-start gap-1.5">
                        <span className={`text-lg leading-none ${GENDER_TONE[p.gender] || GENDER_TONE.unspecified}`}>{GENDER_ICON[p.gender] || GENDER_ICON.unspecified}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground">{p.grade || "—"}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full ${avg >= 4 ? "bg-success" : avg >= 3 ? "bg-primary" : avg >= 2 ? "bg-warning" : "bg-destructive"}`}
                            style={{ width: `${Math.min(100, (avg / 5) * 100)}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground">{avg > 0 ? avg.toFixed(1) : "—"}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
                        {p.topStrengths.length > 0 && <span className="text-success flex items-center gap-0.5"><Star className="w-2.5 h-2.5" />{p.topStrengths.length}</span>}
                        {p.riskFlags.length > 0 && <span className="text-warning flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" />{p.riskFlags.length}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-success" />ממוצע גבוה (4+)</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-primary" />בינוני (3-4)</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-warning" />נמוך (2-3)</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-destructive" />מתחת ל־2</span>
              </div>
            </div>

            {/* Sociometric groups */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="intake-card">
                <h3 className="font-heading font-bold text-sm mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-success" /> קבוצות חוזק משותפות</h3>
                {sharedGroups.strengths.length === 0 ? (
                  <p className="text-xs text-muted-foreground">אין חוזקות משותפות ל־3 תלמידים או יותר</p>
                ) : (
                  <div className="space-y-2">
                    {sharedGroups.strengths.map((g, i) => (
                      <button key={i} onClick={() => toggleGroupHighlight(g.students)}
                        className="w-full text-right rounded-xl border border-success/20 bg-success/5 p-2.5 hover:bg-success/10 transition-colors">
                        <p className="text-xs font-medium text-foreground/85 mb-1.5">{g.text}</p>
                        <div className="flex flex-wrap gap-1">
                          {g.students.map((n) => <span key={n} className="text-[10px] bg-success/15 text-success px-1.5 py-0.5 rounded-full">{n}</span>)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="intake-card">
                <h3 className="font-heading font-bold text-sm mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warning" /> קבוצות אתגר משותפות</h3>
                {sharedGroups.challenges.length === 0 ? (
                  <p className="text-xs text-muted-foreground">אין אתגרים משותפים ל־3 תלמידים או יותר</p>
                ) : (
                  <div className="space-y-2">
                    {sharedGroups.challenges.map((g, i) => (
                      <button key={i} onClick={() => toggleGroupHighlight(g.students)}
                        className="w-full text-right rounded-xl border border-warning/20 bg-warning/5 p-2.5 hover:bg-warning/10 transition-colors">
                        <p className="text-xs font-medium text-foreground/85 mb-1.5">{g.text}</p>
                        <div className="flex flex-wrap gap-1">
                          {g.students.map((n) => <span key={n} className="text-[10px] bg-warning/15 text-warning px-1.5 py-0.5 rounded-full">{n}</span>)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">לחיצה על קבוצה תדגיש את התלמידים במפה למעלה</p>
          </>
        )}
      </div>
    </div>
  );
};

export default ClassVisual;