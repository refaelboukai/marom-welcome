import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getSessions } from "@/lib/storage";
import { IntakeSession, IntakeStatus } from "@/lib/types";
import { questionnaireItems } from "@/data/questionnaires";
import StatusBadge from "@/components/StatusBadge";
import logo from "@/assets/logo.jpeg";
import { Plus, Users, AlertTriangle, CheckCircle, Clock, Search, LogOut, XCircle } from "lucide-react";
import { calculateScores, generateRiskFlags, getCompletionPercentage } from "@/lib/scoring";

const Dashboard = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<IntakeSession[]>([]);
  const [filter, setFilter] = useState<"all" | IntakeStatus>("all");
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState(false);

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const sessionsWithMeta = useMemo(() => {
    return sessions.map((s) => {
      const scores = calculateScores(s.studentResponses, s.parentResponses);
      const riskFlags = generateRiskFlags(scores);
      const studentCompletion = getCompletionPercentage(s.studentResponses, questionnaireItems.length);
      const parentCompletion = getCompletionPercentage(s.parentResponses, questionnaireItems.length);
      return { ...s, scores, riskFlags, studentCompletion, parentCompletion };
    });
  }, [sessions]);

  const filtered = useMemo(() => {
    return sessionsWithMeta.filter((s) => {
      if (filter !== "all" && s.status !== filter) return false;
      if (riskFilter && s.riskFlags.length === 0) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !s.studentName.toLowerCase().includes(q) &&
          !s.grade.toLowerCase().includes(q) &&
          !s.studentIdNumber.includes(q)
        ) return false;
      }
      return true;
    });
  }, [sessionsWithMeta, filter, search, riskFilter]);

  const stats = useMemo(() => ({
    active: sessionsWithMeta.filter((s) => !["completed", "not_started"].includes(s.status)).length,
    incomplete: sessionsWithMeta.filter((s) => s.status !== "completed").length,
    completed: sessionsWithMeta.filter((s) => s.status === "completed").length,
    withRisk: sessionsWithMeta.filter((s) => s.riskFlags.length > 0).length,
  }), [sessionsWithMeta]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-20">
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
            { icon: Users, label: "תלמידים פעילים", value: stats.active, color: "text-primary", onClick: () => {} },
            { icon: Clock, label: "לא הושלמו", value: stats.incomplete, color: "text-info", onClick: () => {} },
            { icon: CheckCircle, label: "הושלמו", value: stats.completed, color: "text-success", onClick: () => setFilter("completed") },
            { icon: AlertTriangle, label: "דגלי תשומת לב", value: stats.withRisk, color: "text-warning", onClick: () => setRiskFilter(!riskFilter) },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <button key={i} onClick={stat.onClick} className="intake-card-soft flex items-center gap-3 text-right hover:shadow-md transition-shadow">
                <Icon className={`w-8 h-8 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="חיפוש לפי שם, כיתה או ת.ז..."
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
          {riskFilter && (
            <button
              onClick={() => setRiskFilter(false)}
              className="flex items-center gap-1 text-xs bg-warning/15 text-warning px-3 py-2 rounded-xl"
            >
              <XCircle className="w-3.5 h-3.5" />
              דגלים בלבד
            </button>
          )}
        </div>

        {/* Student Table */}
        {filtered.length === 0 ? (
          <div className="intake-card text-center py-12">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">אין תלמידים להצגה</p>
            <p className="text-xs text-muted-foreground mt-1">נסו לשנות את מסנני החיפוש</p>
            <button
              onClick={() => navigate("/admin/new")}
              className="btn-intake bg-primary text-primary-foreground text-sm mt-4"
            >
              הוסף תלמיד חדש
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block intake-card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground text-xs">
                    <th className="text-right px-4 py-3 font-medium">שם</th>
                    <th className="text-right px-4 py-3 font-medium">כיתה</th>
                    <th className="text-right px-4 py-3 font-medium">סטטוס</th>
                    <th className="text-center px-4 py-3 font-medium">תלמיד</th>
                    <th className="text-center px-4 py-3 font-medium">הורה</th>
                    <th className="text-center px-4 py-3 font-medium">ציון</th>
                    <th className="text-center px-4 py-3 font-medium">דגל</th>
                    <th className="text-right px-4 py-3 font-medium">עדכון</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((session) => {
                    const avgScore = [
                      session.scores.qualityOfLife,
                      session.scores.selfEfficacy,
                      session.scores.locusOfControl,
                      session.scores.cognitiveFlexibility,
                    ].filter((d) => d.normalized >= 0);
                    const overallScore = avgScore.length > 0
                      ? Math.round(avgScore.reduce((sum, d) => sum + d.normalized, 0) / avgScore.length)
                      : -1;

                    return (
                      <tr
                        key={session.id}
                        onClick={() => navigate(`/admin/student/${session.id}`)}
                        className="border-t border-border hover:bg-muted/30 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-medium">{session.studentName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{session.grade || "—"}</td>
                        <td className="px-4 py-3"><StatusBadge status={session.status} /></td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-medium ${session.studentCompletion === 100 ? "text-success" : "text-muted-foreground"}`}>
                            {session.studentCompletion}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-medium ${session.parentCompletion === 100 ? "text-success" : "text-muted-foreground"}`}>
                            {session.parentCompletion}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold">
                          {overallScore >= 0 ? overallScore : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {session.riskFlags.length > 0 && (
                            <AlertTriangle className="w-4 h-4 text-warning inline" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(session.updatedAt).toLocaleDateString("he-IL")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-2">
              {filtered.map((session) => (
                <button
                  key={session.id}
                  onClick={() => navigate(`/admin/student/${session.id}`)}
                  className="intake-card-soft w-full text-right hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold text-sm">
                        {session.studentName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{session.studentName}</p>
                        {session.riskFlags.length > 0 && (
                          <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {session.grade ? `כיתה ${session.grade}` : ""} · תלמיד: {session.studentCompletion}% · הורה: {session.parentCompletion}%
                      </p>
                    </div>
                    <StatusBadge status={session.status} />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
