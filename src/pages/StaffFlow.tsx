import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSessionDB, updateSessionDB, getSessionsDB } from "@/lib/supabase-storage";
import { IntakeSession, STAFF_QUESTION_LABELS, STAFF_QUESTION_KEYS } from "@/lib/types";
import { questionnaireItems } from "@/data/questionnaires";
import LikertScale from "@/components/LikertScale";
import ProgressHeader from "@/components/ProgressHeader";
import logo from "@/assets/logo.jpeg";
import { Loader2, Star, ClipboardList, ChevronLeft, ChevronRight, LogOut } from "lucide-react";

const ITEMS_PER_PAGE = 3;

const StaffFlow = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<IntakeSession | null>(null);
  const [sessions, setSessions] = useState<IntakeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"select" | "questionnaire" | "open" | "complete">("select");
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    if (sessionId) {
      getSessionDB(sessionId).then((s) => {
        if (!s) { navigate("/"); return; }
        setSession(s);
        setStep(Object.keys(s.staffResponses || {}).length > 0 ? "questionnaire" : "questionnaire");
        setLoading(false);
      });
    } else {
      getSessionsDB().then((data) => {
        setSessions(data);
        setLoading(false);
      });
    }
  }, [sessionId, navigate]);

  const totalPages = Math.ceil(questionnaireItems.length / ITEMS_PER_PAGE);

  const handleUpdateResponse = useCallback(async (itemId: string, value: number) => {
    if (!session) return;
    const updated = { ...session.staffResponses, [itemId]: value };
    setSession((prev) => prev ? { ...prev, staffResponses: updated } : null);
    await updateSessionDB(session.id, { staffResponses: updated });
  }, [session]);

  const handleUpdateOpen = useCallback(async (key: string, value: string) => {
    if (!session) return;
    const updated = { ...session.staffOpenResponses, [key]: value };
    setSession((prev) => prev ? { ...prev, staffOpenResponses: updated } : null);
    await updateSessionDB(session.id, { staffOpenResponses: updated });
  }, [session]);

  const handleComplete = useCallback(async () => {
    if (!session) return;
    await updateSessionDB(session.id, { status: session.status === "parent_completed" ? "under_review" : session.status });
    setStep("complete");
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Student selection screen
  if (!sessionId) {
    const taliStudents = sessions.filter((s) => s.classGroup === "tali");
    const edenStudents = sessions.filter((s) => s.classGroup === "eden");

    const renderStudentCard = (s: IntakeSession) => {
      const staffDone = Object.keys(s.staffResponses || {}).length;
      const total = questionnaireItems.length;
      return (
        <button
          key={s.id}
          onClick={() => navigate(`/staff/${s.id}`)}
          className="intake-card-soft w-full text-right hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">{s.studentName.charAt(0)}</span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm group-hover:text-primary transition-colors">{s.studentName}</p>
              <p className="text-xs text-muted-foreground">{s.grade ? `כיתה ${s.grade}` : ""}</p>
            </div>
            <div className="text-left">
              <p className="text-xs font-medium">{Math.round((staffDone / total) * 100)}%</p>
              <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${(staffDone / total) * 100}%` }} />
              </div>
            </div>
          </div>
        </button>
      );
    };

    return (
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-muted"><ChevronRight className="w-5 h-5" /></button>
            <img src={logo} alt="מרום" className="h-10 rounded-xl" />
            <div>
              <h1 className="text-lg font-heading font-bold">שאלון צוות</h1>
              <p className="text-xs text-muted-foreground">בחר תלמיד למילוי</p>
            </div>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
          {/* הכיתה של טלי */}
          <div>
            <h2 className="text-sm font-heading font-bold text-primary mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              הכיתה של טלי
              <span className="text-xs text-muted-foreground font-normal">({taliStudents.length})</span>
            </h2>
            <div className="space-y-2">
              {taliStudents.map(renderStudentCard)}
              {taliStudents.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">אין תלמידים בכיתה זו</p>}
            </div>
          </div>

          {/* הכיתה של עדן */}
          <div>
            <h2 className="text-sm font-heading font-bold text-primary mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              הכיתה של עדן
              <span className="text-xs text-muted-foreground font-normal">({edenStudents.length})</span>
            </h2>
            <div className="space-y-2">
              {edenStudents.map(renderStudentCard)}
              {edenStudents.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">אין תלמידים בכיתה זו</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  if (step === "complete") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
        <div className="w-full max-w-md animate-fade-in text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/15 flex items-center justify-center">
            <ClipboardList className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-2xl font-heading font-bold mb-3">השאלון הוגש בהצלחה</h1>
          <p className="text-muted-foreground">תודה. הערכת הצוות עבור {session.studentName} נשמרה.</p>
          <button
            onClick={() => navigate("/staff")}
            className="btn-intake bg-primary text-primary-foreground w-full mt-6"
          >
            חזרה לרשימת התלמידים
          </button>
        </div>
      </div>
    );
  }

  const isOpenPage = currentPage === totalPages;
  const currentItems = isOpenPage ? [] : questionnaireItems.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);
  const answeredOnPage = currentItems.filter((item) => (session.staffResponses || {})[item.id] != null).length;
  const canProceed = isOpenPage || answeredOnPage === currentItems.length;
  const totalSteps = totalPages + 1;
  const totalAnswered = Object.keys(session.staffResponses || {}).length;

  const handleNext = () => {
    if (currentPage < totalSteps - 1) {
      setCurrentPage((p) => p + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      handleComplete();
    }
  };

  return (
    <div className="min-h-screen py-6 bg-background">
      <div className="max-w-lg mx-auto px-4 pb-8">
        <div className="flex items-center gap-2 mb-4">
          <img src={logo} alt="מרום" className="h-8 rounded-lg" />
          <div>
            <p className="text-xs text-muted-foreground">הערכת צוות עבור</p>
            <p className="font-heading font-bold text-sm">{session.studentName}</p>
          </div>
        </div>

        <ProgressHeader current={totalAnswered} total={questionnaireItems.length} sectionLabel="הערכת צוות" />

        <div className="flex justify-end mt-2">
          <button onClick={() => navigate("/staff")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted">
            <LogOut className="w-3.5 h-3.5" /> שמור וצא
          </button>
        </div>

        {!isOpenPage && (
          <div className="mt-4 space-y-2">
            {currentItems.map((item, idx) => (
              <LikertScale
                key={item.id}
                questionNumber={currentPage * ITEMS_PER_PAGE + idx + 1}
                questionText={`(הערכת צוות) ${item.studentText}`}
                value={(session.staffResponses || {})[item.id]}
                onChange={(val) => handleUpdateResponse(item.id, val)}
              />
            ))}
          </div>
        )}

        {isOpenPage && (
          <div className="mt-4 space-y-4 animate-fade-in">
            <h3 className="text-lg font-heading font-semibold">הערכה מקצועית</h3>
            <p className="text-sm text-muted-foreground">כתבו הערכה חופשית בכל תחום.</p>
            {STAFF_QUESTION_KEYS.map((key) => (
              <div key={key} className="intake-card-soft">
                <label className="block text-sm font-medium mb-2">{STAFF_QUESTION_LABELS[key]}</label>
                <textarea
                  className="w-full bg-background border border-input rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={3}
                  value={(session.staffOpenResponses || {})[key] || ""}
                  onChange={(e) => handleUpdateOpen(key, e.target.value)}
                  placeholder="כתוב/י כאן..."
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          {currentPage > 0 && (
            <button onClick={() => { setCurrentPage((p) => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="btn-intake bg-secondary text-secondary-foreground flex-1">חזרה</button>
          )}
          <button onClick={handleNext} disabled={!canProceed}
            className={`btn-intake flex-1 ${canProceed ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
            {currentPage === totalSteps - 1 ? "סיום" : "המשך"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffFlow;
