import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getSessionsDB } from "@/lib/supabase-storage";
import { IntakeSession, IntakeStatus } from "@/lib/types";
import { questionnaireItems } from "@/data/questionnaires";
import { CLASS_GROUPS } from "@/data/students";
import StatusBadge from "@/components/StatusBadge";
import CodeManagement from "@/components/CodeManagement";

import logo from "@/assets/logo.jpeg";
import { Plus, Users, AlertTriangle, CheckCircle, Clock, Search, LogOut, XCircle, Loader2, Download, Key, FileText, Copy, ClipboardList } from "lucide-react";
import { calculateScores, generateRiskFlags, getCompletionPercentage } from "@/lib/scoring";
import { exportToExcel } from "@/lib/export-utils";
import { generateStudentPDF } from "@/lib/pdf-export";

type Tab = "all" | "tali" | "eden" | "codes";

const Dashboard = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<IntakeSession[]>([]);
  const [filter, setFilter] = useState<"all" | IntakeStatus>("all");
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    getSessionsDB().then((data) => { setSessions(data); setLoading(false); });
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
      if (tab === "tali" && s.classGroup !== "tali") return false;
      if (tab === "eden" && s.classGroup !== "eden") return false;
      if (filter !== "all" && s.status !== filter) return false;
      if (riskFilter && s.riskFlags.length === 0) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!s.studentName.toLowerCase().includes(q) && !s.grade.toLowerCase().includes(q) && !s.studentIdNumber.includes(q)) return false;
      }
      return true;
    });
  }, [sessionsWithMeta, filter, search, riskFilter, tab]);

  const stats = useMemo(() => ({
    active: sessionsWithMeta.filter((s) => !["completed", "not_started"].includes(s.status)).length,
    incomplete: sessionsWithMeta.filter((s) => s.status !== "completed").length,
    completed: sessionsWithMeta.filter((s) => s.status === "completed").length,
    withRisk: sessionsWithMeta.filter((s) => s.riskFlags.length > 0).length,
  }), [sessionsWithMeta]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleExportClass = (classKey: string) => {
    const classSessions = sessions.filter((s) => s.classGroup === classKey);
    const label = classKey === "tali" ? "הכיתה_של_טלי" : "הכיתה_של_עדן";
    exportToExcel(classSessions, label);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "all", label: "כל התלמידים", count: sessionsWithMeta.length },
    { key: "tali", label: "הכיתה של טלי", count: sessionsWithMeta.filter((s) => s.classGroup === "tali").length },
    { key: "eden", label: "הכיתה של עדן", count: sessionsWithMeta.filter((s) => s.classGroup === "eden").length },
    { key: "codes", label: "ניהול קודים" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="מרום" className="h-11 rounded-xl shadow-sm" />
            <div>
              <h1 className="text-lg font-heading font-bold bg-gradient-to-l from-primary to-primary/70 bg-clip-text text-transparent">דשבורד ניהול</h1>
              <p className="text-xs text-muted-foreground">מרום בית אקשטיין</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/admin/new")} className="btn-intake bg-primary text-primary-foreground text-sm px-4 py-2 shadow-md hover:shadow-lg transition-all">
              <Plus className="w-4 h-4 inline ml-1" /> קליטה חדשה
            </button>
            <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-muted transition-colors" title="יציאה">
              <LogOut className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Users, label: "תלמידים פעילים", value: stats.active, color: "text-primary", bg: "bg-primary/5" },
            { icon: Clock, label: "לא הושלמו", value: stats.incomplete, color: "text-info", bg: "bg-info/5" },
            { icon: CheckCircle, label: "הושלמו", value: stats.completed, color: "text-success", bg: "bg-success/5" },
            { icon: AlertTriangle, label: "דגלי תשומת לב", value: stats.withRisk, color: "text-warning", bg: "bg-warning/5" },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className={`intake-card-soft flex items-center gap-3 text-right ${stat.bg} border-transparent`}>
                <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                tab === t.key ? "bg-primary text-primary-foreground shadow-md" : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}>
              {t.label} {t.count != null && <span className="mr-1 opacity-70">({t.count})</span>}
            </button>
          ))}
        </div>

        {/* Codes Tab */}
        {tab === "codes" ? (
          <CodeManagement sessions={sessions} />
        ) : (
          <>


            {/* Export Bar */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => exportToExcel(tab === "all" ? sessions : filtered, tab === "tali" ? "הכיתה_של_טלי" : tab === "eden" ? "הכיתה_של_עדן" : "כל_התלמידים")}
                className="btn-intake bg-success/10 text-success text-xs px-3 py-2 gap-1 hover:bg-success/20">
                <Download className="w-3.5 h-3.5" /> ייצוא Excel
              </button>
            </div>

            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" placeholder="חיפוש לפי שם, כיתה או ת.ז..." value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-card border border-input rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <select value={filter} onChange={(e) => setFilter(e.target.value as any)}
                className="bg-card border border-input rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
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
                <button onClick={() => setRiskFilter(false)} className="flex items-center gap-1 text-xs bg-warning/15 text-warning px-3 py-2 rounded-xl">
                  <XCircle className="w-3.5 h-3.5" /> דגלים בלבד
                </button>
              )}
            </div>

            {/* Student List */}
            {filtered.length === 0 ? (
              <div className="intake-card text-center py-12">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">אין תלמידים להצגה</p>
                <button onClick={() => navigate("/admin/new")} className="btn-intake bg-primary text-primary-foreground text-sm mt-4">הוסף תלמיד חדש</button>
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
                        <th className="text-center px-4 py-3 font-medium">קוד הורה</th>
                        <th className="text-right px-4 py-3 font-medium">פעולות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((session) => {
                        const avgScoreDomains = [session.scores.qualityOfLife, session.scores.selfEfficacy, session.scores.locusOfControl, session.scores.cognitiveFlexibility].filter((d) => d.normalized >= 0);
                        const overallScore = avgScoreDomains.length > 0 ? Math.round(avgScoreDomains.reduce((sum, d) => sum + d.normalized, 0) / avgScoreDomains.length * 100) / 100 : -1;
                        return (
                          <tr key={session.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-medium cursor-pointer hover:text-primary" onClick={() => navigate(`/admin/student/${session.id}`)}>{session.studentName}</td>
                            <td className="px-4 py-3 text-muted-foreground">{session.grade || "—"}</td>
                            <td className="px-4 py-3"><StatusBadge status={session.status} /></td>
                            <td className="px-4 py-3 text-center"><span className={`text-xs font-medium ${session.studentCompletion === 100 ? "text-success" : "text-muted-foreground"}`}>{session.studentCompletion}%</span></td>
                            <td className="px-4 py-3 text-center"><span className={`text-xs font-medium ${session.parentCompletion === 100 ? "text-success" : "text-muted-foreground"}`}>{session.parentCompletion}%</span></td>
                            <td className="px-4 py-3 text-center font-bold">{overallScore >= 0 ? overallScore.toFixed(2) : "—"}</td>
                            <td className="px-4 py-3 text-center">{session.riskFlags.length > 0 && <AlertTriangle className="w-4 h-4 text-warning inline" />}</td>
                            <td className="px-4 py-3 text-center">
                              <button onClick={(e) => { e.stopPropagation(); handleCopy(session.parentCode, `pc-${session.id}`); }}
                                className="inline-flex items-center gap-1 text-xs font-mono bg-muted/50 px-2 py-1 rounded-lg hover:bg-muted" dir="ltr">
                                {copied === `pc-${session.id}` ? <CheckCircle className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                                {session.parentCode}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                <button onClick={() => navigate(`/admin/student/${session.id}`)} className="p-1.5 rounded-lg hover:bg-muted" title="פרופיל">
                                  <Users className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => navigate(`/staff/${session.id}`)} className="p-1.5 rounded-lg hover:bg-muted" title="שאלון צוות">
                                  <ClipboardList className="w-3.5 h-3.5 text-warning" />
                                </button>
                                <button onClick={() => generateStudentPDF(session, "staff")} className="p-1.5 rounded-lg hover:bg-muted" title="PDF צוות">
                                  <FileText className="w-3.5 h-3.5 text-primary" />
                                </button>
                              </div>
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
                    <div key={session.id} className="intake-card-soft hover:shadow-md transition-all">
                      <div className="flex items-center gap-3" onClick={() => navigate(`/admin/student/${session.id}`)}>
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold">{session.studentName.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm truncate">{session.studentName}</p>
                            {session.riskFlags.length > 0 && <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {session.grade ? `כיתה ${session.grade}` : ""} · תלמיד: {session.studentCompletion}% · הורה: {session.parentCompletion}%
                          </p>
                        </div>
                        <StatusBadge status={session.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
                        <button onClick={() => handleCopy(session.parentCode, `mpc-${session.id}`)}
                          className="flex items-center gap-1 text-[10px] font-mono bg-info/5 text-info px-2 py-1 rounded-lg">
                          {copied === `mpc-${session.id}` ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          קוד הורה: {session.parentCode}
                        </button>
                        <button onClick={() => generateStudentPDF(session, "staff")} className="p-1.5 rounded-lg hover:bg-muted mr-auto">
                          <FileText className="w-3.5 h-3.5 text-primary" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
