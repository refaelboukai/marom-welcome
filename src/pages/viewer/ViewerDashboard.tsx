import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSessionsDB, getClassGroups, DEFAULT_CLASS_GROUPS, ClassGroupsMap } from "@/lib/supabase-storage";
import { IntakeSession } from "@/lib/types";
import { ChevronLeft, Folder, FolderOpen, Loader2, Search, Users, ArrowRight } from "lucide-react";

const ViewerDashboard = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<IntakeSession[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroupsMap>(DEFAULT_CLASS_GROUPS);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const [s, g] = await Promise.all([getSessionsDB(), getClassGroups()]);
      setSessions(s);
      setClassGroups(g);
      setLoading(false);
    })();
  }, []);

  const active = useMemo(
    () => sessions.filter((s) => s.status !== "archived"),
    [sessions]
  );

  const folders = useMemo(() => {
    const q = query.trim();
    const byKey = Object.entries(classGroups).map(([key, label]) => ({
      key,
      label,
      students: active
        .filter((s) => s.classGroup === key)
        .filter((s) => !q || s.studentName.includes(q))
        .sort((a, b) => a.studentName.localeCompare(b.studentName, "he")),
    }));
    const unassigned = active
      .filter((s) => !s.classGroup || !classGroups[s.classGroup])
      .filter((s) => !q || s.studentName.includes(q))
      .sort((a, b) => a.studentName.localeCompare(b.studentName, "he"));
    if (unassigned.length) byKey.push({ key: "__unassigned", label: "ללא שיוך כיתה", students: unassigned });
    return byKey;
  }, [active, classGroups, query]);

  useEffect(() => {
    if (query.trim()) setOpen("__all__");
  }, [query]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-2 rounded-lg hover:bg-muted">
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-heading font-bold">רשימות תלמידים</h1>
            <p className="text-xs text-muted-foreground">צפייה בפרופיל התלמיד והפקת תכניות אישיות</p>
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="w-4 h-4" /> {active.length}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש תלמיד…"
            className="w-full text-sm bg-card border border-input rounded-2xl py-3 pr-10 pl-4 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {folders.map((f) => {
          const isOpen = open === f.key || open === "__all__";
          return (
            <div key={f.key} className="intake-card-soft overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : f.key)}
                className="w-full flex items-center gap-3 text-right"
              >
                {isOpen ? <FolderOpen className="w-5 h-5 text-primary" /> : <Folder className="w-5 h-5 text-primary" />}
                <span className="flex-1 font-heading font-semibold text-sm">{f.label}</span>
                <span className="text-xs text-muted-foreground">{f.students.length} תלמידים</span>
                <ChevronLeft className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "-rotate-90" : ""}`} />
              </button>

              {isOpen && (
                <div className="mt-3 space-y-1.5 animate-fade-in">
                  {f.students.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => navigate(`/viewer/student/${s.id}`)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-right"
                    >
                      <span className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {s.studentName.charAt(0)}
                      </span>
                      <span className="flex-1 text-sm truncate">{s.studentName}</span>
                      {s.grade && <span className="text-[11px] text-muted-foreground">כיתה {s.grade}</span>}
                      <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                  {f.students.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">אין תלמידים בכיתה זו</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ViewerDashboard;