import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSessionsDB, getClassGroups, DEFAULT_CLASS_GROUPS, ClassGroupsMap } from "@/lib/supabase-storage";
import { IntakeSession } from "@/lib/types";
import { ChevronLeft, Folder, FolderOpen, Loader2, Search, Users, ArrowRight, List, LayoutGrid, Columns3 } from "lucide-react";
import { getClassSpace } from "@/lib/class-spaces";

type ViewMode = "list" | "grid" | "columns";

const ViewerDashboard = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<IntakeSession[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroupsMap>(DEFAULT_CLASS_GROUPS);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem("viewer_view_mode") as ViewMode) || "grid"
  );
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const changeView = (mode: ViewMode) => {
    setViewMode(mode);
    setSelectedFolder(null);
    localStorage.setItem("viewer_view_mode", mode);
  };

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

  const StudentRow = ({ s }: { s: IntakeSession }) => (
    <button
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
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-20 shadow-sm">
        <div className={`${viewMode === "columns" ? "max-w-7xl" : "max-w-4xl"} mx-auto flex items-center gap-3`}>
          <button onClick={() => navigate("/")} className="p-2 rounded-lg hover:bg-muted">
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-heading font-bold">רשימות תלמידים</h1>
            <p className="text-xs text-muted-foreground">צפייה בפרופיל התלמיד והפקת תכניות אישיות</p>
          </div>
          <div className="flex items-center gap-1 bg-muted/60 rounded-xl p-1">
            {([
              { mode: "list" as const, icon: List, title: "רשימה" },
              { mode: "grid" as const, icon: LayoutGrid, title: "תיקיות" },
              { mode: "columns" as const, icon: Columns3, title: "טורים" },
            ]).map(({ mode, icon: Icon, title }) => (
              <button
                key={mode}
                onClick={() => changeView(mode)}
                title={title}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === mode ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="w-4 h-4" /> {active.length}
          </span>
        </div>
      </div>

      <div className={`${viewMode === "columns" ? "max-w-7xl" : "max-w-4xl"} mx-auto px-4 py-6 space-y-4`}>
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש תלמיד…"
            className="w-full text-sm bg-card border border-input rounded-2xl py-3 pr-10 pl-4 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {viewMode === "columns" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start">
            {folders.map((f) => (
              <div key={f.key} className="intake-card-soft">
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-border">
                  <FolderOpen className="w-4 h-4 text-primary" />
                  <span className="flex-1 font-heading font-semibold text-sm">{f.label}</span>
                  <span className="text-[11px] text-muted-foreground">{f.students.length}</span>
                </div>
                <div className="space-y-1.5">
                  {f.students.map((s) => <StudentRow key={s.id} s={s} />)}
                  {f.students.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">אין תלמידים</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === "grid" && !selectedFolder && (
          <div className="space-y-4">
            <div className="text-right">
              <h2 className="font-heading font-bold text-lg">מרחבי הכיתות</h2>
              <p className="text-sm text-muted-foreground">בחר כיתה כדי להיכנס למרחב שלה</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {folders.map((f, i) => {
                const space = getClassSpace(f.label, i);
                const Icon = space.icon;
                return (
                  <button
                    key={f.key}
                    onClick={() => setSelectedFolder(f.key)}
                    className="rounded-2xl border p-5 text-right transition-all hover:shadow-md hover:-translate-y-0.5"
                    style={{
                      borderColor: `hsl(var(${space.hue}) / 0.25)`,
                      background: `linear-gradient(135deg, hsl(var(${space.hue}) / 0.10), hsl(var(${space.hue}) / 0.03))`,
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 bg-card"
                        style={{ border: `1px solid hsl(var(${space.hue}) / 0.3)` }}
                      >
                        <Icon className="w-6 h-6" style={{ color: `hsl(var(${space.hue}))` }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {f.key !== "__unassigned" && <p className="text-xs text-muted-foreground">כיתת</p>}
                        <p className="font-heading font-bold text-xl leading-tight" style={{ color: `hsl(var(${space.hue}))` }}>
                          {space.name}
                        </p>
                        {space.motto && <p className="text-xs text-muted-foreground mt-0.5">{space.motto}</p>}
                        {space.teachers && <p className="text-xs font-medium mt-1">{space.teachers}</p>}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-3">{f.students.length} תלמידים</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === "grid" && selectedFolder && (() => {
          const folder = folders.find((f) => f.key === selectedFolder);
          const idx = folders.findIndex((f) => f.key === selectedFolder);
          const space = getClassSpace(folder?.label || "", Math.max(idx, 0));
          const Icon = space.icon;
          return (
          <div className="space-y-3 animate-fade-in">
            <button
              onClick={() => setSelectedFolder(null)}
              className="flex items-center gap-2 text-sm text-primary font-medium"
            >
              <ArrowRight className="w-4 h-4" /> חזרה למרחבי הכיתות
            </button>
            <div
              className="rounded-2xl border p-5"
              style={{
                borderColor: `hsl(var(${space.hue}) / 0.25)`,
                background: `linear-gradient(135deg, hsl(var(${space.hue}) / 0.10), hsl(var(${space.hue}) / 0.03))`,
              }}
            >
              <div className="flex items-center gap-4 pb-4 mb-4 border-b" style={{ borderColor: `hsl(var(${space.hue}) / 0.2)` }}>
                <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center" style={{ border: `1px solid hsl(var(${space.hue}) / 0.3)` }}>
                  <Icon className="w-5 h-5" style={{ color: `hsl(var(${space.hue}))` }} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">כיתת</p>
                  <p className="font-heading font-bold text-lg" style={{ color: `hsl(var(${space.hue}))` }}>{space.name}</p>
                  {space.teachers && <p className="text-xs font-medium">{space.teachers}</p>}
                </div>
                <span className="text-xs text-muted-foreground">{folder?.students.length || 0} תלמידים</span>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {(folder?.students || []).map((s) => (
                  <StudentRow key={s.id} s={s} />
                ))}
              </div>
            </div>
          </div>
          );
        })()}

        {viewMode === "list" && folders.map((f) => {
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
                  {f.students.map((s) => <StudentRow key={s.id} s={s} />)}
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