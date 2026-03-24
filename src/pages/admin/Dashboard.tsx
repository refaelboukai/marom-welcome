import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSessions } from "@/lib/storage";
import { IntakeSession, IntakeStatus } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import logo from "@/assets/logo.jpeg";
import { Plus, Users, AlertTriangle, CheckCircle, Clock, Search, LogOut } from "lucide-react";
import { calculateScores, generateRiskFlags } from "@/lib/scoring";

const Dashboard = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<IntakeSession[]>([]);
  const [filter, setFilter] = useState<"all" | IntakeStatus>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const filtered = sessions.filter((s) => {
    if (filter !== "all" && s.status !== filter) return false;
    if (search && !s.studentName.includes(search)) return false;
    return true;
  });

  const stats = {
    total: sessions.length,
    active: sessions.filter((s) => !["completed", "not_started"].includes(s.status)).length,
    completed: sessions.filter((s) => s.status === "completed").length,
    withRisk: sessions.filter((s) => {
      const scores = calculateScores(s.studentResponses, s.parentResponses);
      return generateRiskFlags(scores).length > 0;
    }).length,
  };

  const getCompletionInfo = (s: IntakeSession) => {
    const studentCount = Object.keys(s.studentResponses).length;
    const parentCount = Object.keys(s.parentResponses).length;
    return { studentCount, parentCount };
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="מרום" className="h-10" />
            <div>
              <h1 className="text-lg font-heading font-bold">דשבורד ניהול</h1>
              <p className="text-xs text-muted-foreground">מרום בית אקשטיין</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/admin/new")}
              className="btn-intake bg-primary text-primary-foreground text-sm px-4 py-2"
            >
              <Plus className="w-4 h-4 inline ml-1" />
              קליטה חדשה
            </button>
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="יציאה"
            >
              <LogOut className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Users, label: "סה״כ תלמידים", value: stats.total, color: "text-primary" },
            { icon: Clock, label: "בתהליך", value: stats.active, color: "text-info" },
            { icon: CheckCircle, label: "הושלמו", value: stats.completed, color: "text-success" },
            { icon: AlertTriangle, label: "דגלים", value: stats.withRisk, color: "text-warning" },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="intake-card-soft flex items-center gap-3">
                <Icon className={`w-8 h-8 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="חיפוש תלמיד..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-input rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-card border border-input rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">כל הסטטוסים</option>
            <option value="not_started">טרם החל</option>
            <option value="student_started">התלמיד התחיל</option>
            <option value="student_completed">התלמיד השלים</option>
            <option value="parent_started">ההורה התחיל</option>
            <option value="parent_completed">ההורה השלים</option>
            <option value="under_review">בבדיקה</option>
            <option value="completed">הושלם</option>
          </select>
        </div>

        {/* Student List */}
        {filtered.length === 0 ? (
          <div className="intake-card text-center py-12">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">אין תלמידים להצגה</p>
            <button
              onClick={() => navigate("/admin/new")}
              className="btn-intake bg-primary text-primary-foreground text-sm mt-4"
            >
              הוסף תלמיד חדש
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((session) => {
              const { studentCount, parentCount } = getCompletionInfo(session);
              return (
                <button
                  key={session.id}
                  onClick={() => navigate(`/admin/student/${session.id}`)}
                  className="intake-card-soft w-full text-right hover:shadow-md transition-shadow flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold text-sm">
                      {session.studentName.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{session.studentName}</p>
                    <p className="text-xs text-muted-foreground">
                      תלמיד: {studentCount}/52 · הורה: {parentCount}/52
                    </p>
                  </div>
                  <StatusBadge status={session.status} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
