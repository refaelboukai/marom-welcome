import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getSessionsDB, resetAllSessionsDB, createSessionDB, getReminderMessage } from "@/lib/supabase-storage";
import { IntakeSession, IntakeStatus } from "@/lib/types";
import { questionnaireItems } from "@/data/questionnaires";
import { CLASS_GROUPS, ADMIN_CODE } from "@/data/students";
import StatusBadge from "@/components/StatusBadge";
import CodeManagement from "@/components/CodeManagement";
import SchoolRulesEditor from "@/components/SchoolRulesEditor";
import WelcomeMessageEditor from "@/components/WelcomeMessageEditor";
import ReminderMessageEditor from "@/components/ReminderMessageEditor";
import PhonesImportDialog from "@/components/PhonesImportDialog";
import { openWhatsApp, normalizePhone, REMINDER_MESSAGE } from "@/lib/whatsapp";

import logo from "@/assets/logo.jpeg";
import { Plus, Users, AlertTriangle, CheckCircle, Clock, Search, LogOut, XCircle, Loader2, Download, Key, FileText, Copy, ClipboardList, Trash2, ShieldAlert, Calendar, ArrowLeftRight, BookOpen, MessageCircle, Bell, FileSpreadsheet, Send } from "lucide-react";
import { calculateScores, generateRiskFlags, getCompletionPercentage } from "@/lib/scoring";
import { exportToExcel } from "@/lib/export-utils";
import { generateStudentPDF } from "@/lib/pdf-export";

type Tab = "all" | "tali" | "eden" | "codes" | "archive";

const ACADEMIC_YEARS = ['תשפ"ו', 'תשפ"ז', 'תשפ"ח', 'תשפ"ט'];

const Dashboard = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<IntakeSession[]>([]);
  const [filter, setFilter] = useState<"all" | IntakeStatus>("all");
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('תשפ"ו');
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [promoteTargetYear, setPromoteTargetYear] = useState<string>('תשפ"ז');
  const [promoteSelected, setPromoteSelected] = useState<Set<string>>(new Set());
  const [promoting, setPromoting] = useState(false);
  const [promoteResult, setPromoteResult] = useState<string | null>(null);
  const [showRulesEditor, setShowRulesEditor] = useState(false);
  const [showWelcomeEditor, setShowWelcomeEditor] = useState(false);
  const [showReminderEditor, setShowReminderEditor] = useState(false);
  const [showPhonesImport, setShowPhonesImport] = useState(false);
  const [reminderMessage, setReminderMessage] = useState<string>(REMINDER_MESSAGE);
  const APP_URL = "https://marom-welcome.vercel.app";

  useEffect(() => {
    getSessionsDB().then((data) => { setSessions(data); setLoading(false); });
    getReminderMessage().then(setReminderMessage).catch(() => {});
  }, []);

  const reloadSessions = async () => {
    const data = await getSessionsDB();
    setSessions(data);
  };

  const sendReminder = (phone: string | undefined, code: string, name: string) => {
    if (!phone || !normalizePhone(phone)) {
      alert(`לא הוזן מספר טלפון תקין עבור ${name}. ניתן להוסיף דרך פרופיל התלמיד או ייבוא קובץ.`);
      return;
    }
    const msg = `${reminderMessage}\n\nקוד אישי: ${code}\nכניסה ישירה: ${APP_URL}/?code=${code}`;
    openWhatsApp(phone, msg);
  };

  const sessionsForYear = useMemo(() => {
    return sessions.filter((s) => (s.academicYear || 'תשפ"ו') === selectedYear);
  }, [sessions, selectedYear]);

  const sessionsWithMeta = useMemo(() => {
    return sessionsForYear.map((s) => {
      const scores = calculateScores(s.studentResponses, s.parentResponses);
      const riskFlags = generateRiskFlags(scores);
      const studentCompletion = getCompletionPercentage(s.studentResponses, questionnaireItems.length);
      const parentCompletion = getCompletionPercentage(s.parentResponses, questionnaireItems.length);
      return { ...s, scores, riskFlags, studentCompletion, parentCompletion };
    });
  }, [sessionsForYear]);

  const filtered = useMemo(() => {
    return sessionsWithMeta.filter((s) => {
      if (tab === "tali" && s.classGroup !== "tali") return false;
      if (tab === "eden" && s.classGroup !== "eden") return false;
      if (tab === "archive") {
        if (s.status !== "archived") return false;
      } else {
        if (s.status === "archived") return false;
      }
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

  const handleReset = async () => {
    if (resetPassword !== ADMIN_CODE) {
      setResetError("סיסמה שגויה");
      return;
    }
    setResetting(true);
    const success = await resetAllSessionsDB();
    if (success) {
      const data = await getSessionsDB();
      setSessions(data);
      setShowResetDialog(false);
      setResetPassword("");
      setResetError("");
    } else {
      setResetError("שגיאה באיפוס הנתונים");
    }
    setResetting(false);
  };

  const openPromoteDialog = () => {
    // Default target = next year after the selected one
    const idx = ACADEMIC_YEARS.indexOf(selectedYear);
    const next = idx >= 0 && idx < ACADEMIC_YEARS.length - 1 ? ACADEMIC_YEARS[idx + 1] : ACADEMIC_YEARS[ACADEMIC_YEARS.length - 1];
    setPromoteTargetYear(next);
    setPromoteSelected(new Set(sessionsForYear.map((s) => s.id)));
    setPromoteResult(null);
    setShowPromoteDialog(true);
  };

  const togglePromoteAll = () => {
    if (promoteSelected.size === sessionsForYear.length) {
      setPromoteSelected(new Set());
    } else {
      setPromoteSelected(new Set(sessionsForYear.map((s) => s.id)));
    }
  };

  const handlePromote = async () => {
    if (promoteSelected.size === 0) return;
    setPromoting(true);
    // Avoid duplicates: skip students that already exist in target year (by name + id number)
    const existingInTarget = new Set(
      sessions
        .filter((s) => (s.academicYear || 'תשפ"ו') === promoteTargetYear)
        .map((s) => `${s.studentName}|${s.studentIdNumber}`)
    );
    let created = 0;
    let skipped = 0;
    for (const id of Array.from(promoteSelected)) {
      const s = sessions.find((x) => x.id === id);
      if (!s) continue;
      const key = `${s.studentName}|${s.studentIdNumber}`;
      if (existingInTarget.has(key)) { skipped++; continue; }
      const res = await createSessionDB({
        studentName: s.studentName,
        studentIdNumber: s.studentIdNumber,
        grade: s.grade,
        intakeDate: new Date().toISOString().split("T")[0],
        parentName: s.parentName,
        parentPhone: s.parentPhone,
        secondParentName: s.secondParentName,
        classGroup: s.classGroup,
        academicYear: promoteTargetYear,
        notes: s.notes,
      });
      if (res) created++;
    }
    const data = await getSessionsDB();
    setSessions(data);
    setPromoting(false);
    setPromoteResult(`הועברו ${created} תלמידים${skipped ? ` (דולגו ${skipped} שכבר קיימים)` : ""}`);
    setSelectedYear(promoteTargetYear);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "all", label: "כל התלמידים", count: sessionsWithMeta.filter((s) => s.status !== "archived").length },
    { key: "tali", label: "הכיתה של טלי", count: sessionsWithMeta.filter((s) => s.classGroup === "tali" && s.status !== "archived").length },
    { key: "eden", label: "הכיתה של עדן", count: sessionsWithMeta.filter((s) => s.classGroup === "eden" && s.status !== "archived").length },
    { key: "archive", label: "ארכיון", count: sessionsWithMeta.filter((s) => s.status === "archived").length },
    { key: "codes", label: "ניהול קודים" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-3 sm:px-4 py-2.5 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img src={logo} alt="מרום" className="h-9 sm:h-11 rounded-xl shadow-sm flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-heading font-bold bg-gradient-to-l from-primary to-primary/70 bg-clip-text text-transparent truncate">דשבורד ניהול</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">מרום בית אקשטיין</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button onClick={() => setShowRulesEditor(true)} className="btn-intake bg-muted text-foreground text-sm px-3 py-2 hover:bg-muted/70 hidden sm:inline-flex gap-1" title="עריכת כללי בית הספר">
              <BookOpen className="w-4 h-4" /> כללי בית הספר
            </button>
            <button onClick={() => setShowWelcomeEditor(true)} className="btn-intake bg-muted text-foreground text-sm px-3 py-2 hover:bg-muted/70 hidden sm:inline-flex gap-1" title="עריכת הודעת ווטסאפ">
              <MessageCircle className="w-4 h-4" /> הודעת ווטסאפ
            </button>
            <button onClick={() => setShowReminderEditor(true)} className="btn-intake bg-muted text-foreground text-sm px-3 py-2 hover:bg-muted/70 hidden sm:inline-flex gap-1" title="עריכת הודעת תזכורת">
              <Bell className="w-4 h-4" /> הודעת תזכורת
            </button>
            <button onClick={() => setShowPhonesImport(true)} className="btn-intake bg-info/10 text-info text-sm px-3 py-2 hover:bg-info/20 hidden sm:inline-flex gap-1" title="ייבוא טלפונים מקובץ">
              <FileSpreadsheet className="w-4 h-4" /> ייבוא טלפונים
            </button>
            <button onClick={openPromoteDialog} className="btn-intake bg-info/10 text-info text-sm px-3 py-2 hover:bg-info/20 hidden sm:inline-flex gap-1" title="העברת תלמידים לשנה הבאה">
              <ArrowLeftRight className="w-4 h-4" /> העברה לשנה הבאה
            </button>
            <button onClick={() => navigate("/admin/new")} className="btn-intake bg-primary text-primary-foreground text-xs sm:text-sm px-2.5 sm:px-4 py-2 shadow-md hover:shadow-lg transition-all flex items-center gap-1">
              <Plus className="w-4 h-4" /> קליטה חדשה
            </button>
            <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-muted transition-colors" title="יציאה">
              <LogOut className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Year Selector */}
        <div className="flex items-center gap-2 mb-5">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">שנת לימודים:</span>
          <div className="flex gap-1">
            {ACADEMIC_YEARS.map((year) => (
              <button key={year} onClick={() => setSelectedYear(year)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedYear === year
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}>
                {year}
              </button>
            ))}
          </div>
        </div>

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
              <button onClick={openPromoteDialog} className="btn-intake bg-info/10 text-info text-xs px-3 py-2 gap-1 hover:bg-info/20 sm:hidden">
                <ArrowLeftRight className="w-3.5 h-3.5" /> העברה לשנה הבאה
              </button>
              <button onClick={() => setShowRulesEditor(true)} className="btn-intake bg-muted text-foreground text-xs px-3 py-2 gap-1 hover:bg-muted/70 sm:hidden">
                <BookOpen className="w-3.5 h-3.5" /> כללי בית הספר
              </button>
              <button onClick={() => setShowWelcomeEditor(true)} className="btn-intake bg-muted text-foreground text-xs px-3 py-2 gap-1 hover:bg-muted/70 sm:hidden">
                <MessageCircle className="w-3.5 h-3.5" /> הודעת ווטסאפ
              </button>
              <button onClick={() => setShowReminderEditor(true)} className="btn-intake bg-muted text-foreground text-xs px-3 py-2 gap-1 hover:bg-muted/70 sm:hidden">
                <Bell className="w-3.5 h-3.5" /> הודעת תזכורת
              </button>
              <button onClick={() => setShowPhonesImport(true)} className="btn-intake bg-info/10 text-info text-xs px-3 py-2 gap-1 hover:bg-info/20 sm:hidden">
                <FileSpreadsheet className="w-3.5 h-3.5" /> ייבוא טלפונים
              </button>
              <button onClick={() => { setShowResetDialog(true); setResetPassword(""); setResetError(""); }}
                className="btn-intake bg-destructive/10 text-destructive text-xs px-3 py-2 gap-1 hover:bg-destructive/20 mr-auto">
                <Trash2 className="w-3.5 h-3.5" /> איפוס נתונים
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
                        const avgScoreDomains = [session.scores.qualityOfLife, session.scores.selfEfficacy, session.scores.locusOfControl, session.scores.cognitiveFlexibility, session.scores.learningCharacteristics].filter((d) => d.normalized >= 0);
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

      {/* Reset Dialog */}
      {showResetDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowResetDialog(false)}>
          <div className="bg-card rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-destructive">
              <ShieldAlert className="w-8 h-8" />
              <h2 className="text-lg font-heading font-bold">איפוס כל הנתונים</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              פעולה זו תמחק את כל נתוני השאלונים, תשובות התלמידים וההורים, ותאתחל את המערכת מחדש.
              <strong className="text-destructive block mt-1">פעולה זו אינה הפיכה!</strong>
            </p>
            <div>
              <label className="block text-sm font-medium mb-1">הזן סיסמת מנהל לאישור:</label>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => { setResetPassword(e.target.value); setResetError(""); }}
                className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="סיסמת מנהל"
                dir="ltr"
              />
              {resetError && <p className="text-xs text-destructive mt-1">{resetError}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowResetDialog(false)} className="btn-intake bg-muted text-muted-foreground flex-1">ביטול</button>
              <button onClick={handleReset} disabled={resetting || !resetPassword}
                className="btn-intake bg-destructive text-destructive-foreground flex-1 disabled:opacity-50">
                {resetting ? <Loader2 className="w-4 h-4 animate-spin inline ml-1" /> : <Trash2 className="w-4 h-4 inline ml-1" />}
                אפס הכל
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promote-to-next-year Dialog */}
      {showPromoteDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !promoting && setShowPromoteDialog(false)}>
          <div className="bg-card rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-info">
              <ArrowLeftRight className="w-7 h-7" />
              <div>
                <h2 className="text-lg font-heading font-bold">העברת תלמידים לשנה הבאה</h2>
                <p className="text-xs text-muted-foreground">משנה {selectedYear} — סמנו מי ממשיך</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">העבר לשנת:</span>
              <select
                value={promoteTargetYear}
                onChange={(e) => setPromoteTargetYear(e.target.value)}
                disabled={promoting}
                className="bg-background border border-input rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {ACADEMIC_YEARS.filter((y) => y !== selectedYear).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {sessionsForYear.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">אין תלמידים בשנה זו</p>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs">
                  <button onClick={togglePromoteAll} disabled={promoting} className="text-primary hover:underline">
                    {promoteSelected.size === sessionsForYear.length ? "נקה הכל" : "סמן הכל"}
                  </button>
                  <span className="text-muted-foreground">{promoteSelected.size} / {sessionsForYear.length} נבחרו</span>
                </div>

                <div className="flex-1 overflow-y-auto border border-border rounded-xl divide-y divide-border">
                  {sessionsForYear.map((s) => {
                    const checked = promoteSelected.has(s.id);
                    return (
                      <label key={s.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/30 ${checked ? "bg-primary/5" : ""}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={promoting}
                          onChange={() => {
                            const next = new Set(promoteSelected);
                            if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
                            setPromoteSelected(next);
                          }}
                          className="w-4 h-4 accent-primary"
                        />
                        <div className="flex-1 min-w-0 text-right">
                          <p className="text-sm font-medium truncate">{s.studentName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {s.grade ? `כיתה ${s.grade}` : "ללא כיתה"}{s.classGroup ? ` · ${s.classGroup === "tali" ? "טלי" : s.classGroup === "eden" ? "עדן" : s.classGroup}` : ""}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </>
            )}

            {promoteResult && (
              <p className="text-sm text-success text-center bg-success/10 rounded-lg py-2">{promoteResult}</p>
            )}

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              לתלמידים שנבחרים נוצרים תהליכי קליטה חדשים בשנה הנבחרת עם קודים חדשים. תלמידים שכבר קיימים בשנת היעד יידלגו.
            </p>

            <div className="flex gap-2">
              <button onClick={() => setShowPromoteDialog(false)} disabled={promoting} className="btn-intake bg-muted text-muted-foreground flex-1">סגור</button>
              <button onClick={handlePromote} disabled={promoting || promoteSelected.size === 0}
                className="btn-intake bg-info text-info-foreground flex-1 disabled:opacity-50">
                {promoting ? <><Loader2 className="w-4 h-4 animate-spin inline ml-1" /> מעביר...</> : <><ArrowLeftRight className="w-4 h-4 inline ml-1" /> העבר {promoteSelected.size > 0 ? `(${promoteSelected.size})` : ""}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRulesEditor && <SchoolRulesEditor onClose={() => setShowRulesEditor(false)} />}
      {showWelcomeEditor && <WelcomeMessageEditor onClose={() => setShowWelcomeEditor(false)} />}
    </div>
  );
};

export default Dashboard;
