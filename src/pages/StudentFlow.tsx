import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSessionDB, updateSessionDB } from "@/lib/supabase-storage";
import { IntakeSession } from "@/lib/types";
import QuestionnaireFlow from "@/components/QuestionnaireFlow";
import logo from "@/assets/logo.jpeg";
import { Heart, BookOpen, Brain, Lightbulb, Star, Sparkles, Loader2, RotateCcw, CheckCircle, LogOut } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { supabase } from "@/integrations/supabase/client";

type Step = "welcome" | "consent" | "explanation" | "questionnaire" | "complete";

const explanationCards = [
  { icon: Heart, title: "איכות חיים", desc: "עד כמה טוב לך בחיים שלך – בבית, בבית הספר, עם חברים, ועם עצמך." },
  { icon: Star, title: "מסוגלות עצמית", desc: "עד כמה אתה מאמין שאתה יכול להצליח, להתמודד, ולהשיג מטרות." },
  { icon: Lightbulb, title: "מיקוד שליטה", desc: "עד כמה אתה מרגיש שיש לך השפעה על מה שקורה לך." },
  { icon: Brain, title: "גמישות קוגניטיבית", desc: "עד כמה אתה מצליח לחשוב על אפשרויות שונות, לשנות כיוון כשצריך, ולהתמודד עם מצבים קשים." },
  { icon: Sparkles, title: "למה זה חשוב?", desc: "השאלונים עוזרים לנו להבין איך לתמוך בך בצורה הכי טובה." },
];

const schoolRules = [
  "בית הספר שלנו הינו מרחב לימודי-חינוכי-טיפולי, שבו כל תלמיד ותלמידה ירכשו כלים בתחומים מקצועיים להתמודדות מיטיבה בהמשך חייכם.",
  "לכל תלמיד הזכות למוגנות, שייכות ומשמעות. לכל תלמיד הזכות להתפתחות רגשית, חברתית, לימודית ואישית תוך חיזוק המסוגלות העצמית.",
  "אנחנו מאמינים בחינוך המבוסס על ערכים של הכלה ואמפתיה, עם גבולות ברורים, שיתוף והתייעצות.",
  "כבוד הדדי — בשיחה, במרחב האישי ובלבוש. מותר להתווכח, מותר לא להסכים, אך חובה לכבד את האחד.ה את השני.ה, תלמידים וצוות כאחד.",
  "יש להקפיד על לבוש מכבד את עצמנו ואת הסביבה (לא גופיות, חולצות מכבדות).",
  "מותר להתווכח, מותר לטעון אחרת — אך חובה להקשיב לצוות בית הספר. נשמע, נעשה ונהיה ביקורתיים.",
  "חובה להגיע בזמן לשיעור, להגיע מוכנים עם הציוד הנחוץ. מערכת שעות מחייבת אך גמישה.",
  "חובה להיות נוכחים בשיעורים בכיתות לאורך כל שעות היום, אלא אם קיבלתם אישור לצאת מהכיתה.",
  "הפלאפונים יאוחסנו לאורך כל היום בארון במזכירות בית הספר.",
  "חובה על כל איש צוות ותלמיד למלא את התורנות שלו בצורה הטובה ביותר.",
  "חובה עלינו לשמור על הסביבה שלנו בבית הספר, ללא אלימות.",
  "אסור לעשן, להכניס אמצעים לעישון או לעשות שימוש באלכוהול בשום צורה ואופן.",
  "אסור לצאת מבית הספר ללא אישור. יציאה ללא אישור מסכנת אתכם ותפקידנו לשמור עליכם.",
  "אם נפגעת או שנחשפת לפגיעה באחר.ת — יש לדווח במיידי לצוות.",
  "שמירה על הכללים תוביל תמיד להערכה והוקרה. הפרה של הכללים תוביל תמיד לתגובה והשלכות.",
];

const StudentFlow = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<IntakeSession | null>(null);
  const [step, setStep] = useState<Step>("welcome");
  const [loading, setLoading] = useState(true);
  const [consentChecked, setConsentChecked] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [isReassessment, setIsReassessment] = useState(false);
  const sigCanvasRef = useRef<SignatureCanvas>(null);

  useEffect(() => {
    if (!sessionId) return;
    getSessionDB(sessionId).then((s) => {
      setLoading(false);
      if (!s) { navigate("/"); return; }
      setSession(s);

      // Check if this is a reassessment flow
      const reassessmentStatus = (s as any).reassessmentStatus;
      if (reassessmentStatus === "open_student" || reassessmentStatus === "open_both") {
        setIsReassessment(true);
        setStep("welcome");
        return;
      }

      if (["student_completed", "parent_started", "parent_completed", "under_review", "completed"].includes(s.status)) {
        setStep("complete");
      } else if (Object.keys(s.studentResponses).length > 0) {
        setStep("questionnaire");
      }
    });
  }, [sessionId, navigate]);

  const handleConsentAndContinue = useCallback(async () => {
    if (!session || !sigCanvasRef.current) return;
    const signatureData = sigCanvasRef.current.toDataURL("image/png");
    // Save signature to DB
    await (supabase as any).from("intake_sessions").update({
      consent_signature: signatureData,
      consent_date: new Date().toISOString(),
    }).eq("id", session.id);
    setStep("explanation");
  }, [session]);

  const handleStartQuestionnaire = useCallback(async () => {
    if (!session) return;
    if (isReassessment) {
      setStep("questionnaire");
      return;
    }
    if (session.status === "not_started") {
      await updateSessionDB(session.id, { status: "student_started" });
      setSession((prev) => prev ? { ...prev, status: "student_started" } : null);
    }
    setStep("questionnaire");
  }, [session, isReassessment]);

  const handleUpdateResponse = useCallback(async (itemId: string, value: number) => {
    if (!session) return;
    if (isReassessment) {
      const current = (session as any).reassessmentStudentResponses || {};
      const updated = { ...current, [itemId]: value };
      (session as any).reassessmentStudentResponses = updated;
      setSession({ ...session });
      await (supabase as any).from("intake_sessions").update({
        reassessment_student_responses: updated,
      }).eq("id", session.id);
      return;
    }
    const updated = { ...session.studentResponses, [itemId]: value };
    setSession((prev) => prev ? { ...prev, studentResponses: updated } : null);
    await updateSessionDB(session.id, { studentResponses: updated });
  }, [session, isReassessment]);

  const handleUpdateOpenResponse = useCallback(async (key: string, value: string) => {
    if (!session) return;
    const updated = { ...session.studentOpenResponses, [key]: value };
    setSession((prev) => prev ? { ...prev, studentOpenResponses: updated } : null);
    await updateSessionDB(session.id, { studentOpenResponses: updated });
  }, [session]);

  const handleComplete = useCallback(async () => {
    if (!session) return;
    if (isReassessment) {
      await (supabase as any).from("intake_sessions").update({
        reassessment_status: "student_completed",
        reassessment_date: new Date().toISOString(),
      }).eq("id", session.id);
      setStep("complete");
      return;
    }
    await updateSessionDB(session.id, { status: "student_completed" });
    setSession((prev) => prev ? { ...prev, status: "student_completed" } : null);
    setStep("complete");
  }, [session, isReassessment]);

  const handleSaveAndExit = useCallback(() => { navigate("/"); }, [navigate]);

  const handleClearSignature = () => {
    sigCanvasRef.current?.clear();
    setHasSigned(false);
  };

  const handleSignEnd = () => {
    if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
      setHasSigned(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return null;

  if (step === "welcome") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 bg-background relative safe-top safe-bottom">
        <button onClick={() => navigate("/")} className="absolute top-4 left-4 p-2 rounded-xl hover:bg-muted transition-colors" title="התנתק">
          <LogOut className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="w-full max-w-md md:max-w-lg animate-fade-in text-center">
          <img src={logo} alt="מרום" className="h-20 mx-auto mb-6" />
          <h1 className="text-3xl font-heading font-bold mb-2">ברוכים הבאים</h1>
          <h2 className="text-xl font-heading text-primary font-semibold mb-1">לבית ספר מרום בית אקשטיין</h2>
          <h3 className="text-lg text-muted-foreground mb-4">{session.studentName}</h3>
          {isReassessment && (
            <div className="intake-card border-primary/30 mb-4">
              <p className="text-sm text-primary font-medium">📋 סיכום שנתי — מילוי שאלונים חוזר</p>
              <p className="text-xs text-muted-foreground mt-1">השאלונים הפעם ישמשו להשוואה עם תוצאות הקליטה ולבדיקת התקדמות</p>
            </div>
          )}
          <p className="text-muted-foreground leading-relaxed mb-2">
            אנחנו רוצים להכיר אותך טוב יותר כדי לעזור לך להרגיש טוב, להצליח ולהתקדם בבית הספר.
          </p>
          <div className="intake-card mt-6 text-right space-y-2 text-sm text-muted-foreground">
            <p>✓ אין תשובות נכונות או לא נכונות</p>
            <p>✓ חשוב לענות בכנות</p>
            <p>✓ המידע נועד לעזור לך</p>
          </div>
          <button
            onClick={() => isReassessment ? setStep("explanation") : setStep("consent")}
            className="btn-intake w-full bg-primary text-primary-foreground shadow-md hover:shadow-lg text-lg py-4 mt-6"
          >
            {isReassessment ? "המשך לשאלונים" : "התחל"}
          </button>
        </div>
      </div>
    );
  }

  if (step === "consent") {
    return (
      <div className="min-h-screen px-4 py-6 bg-background relative">
        <button onClick={() => navigate("/")} className="absolute top-4 left-4 p-2 rounded-xl hover:bg-muted transition-colors" title="התנתק">
          <LogOut className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="max-w-md mx-auto animate-slide-up">
          <div className="text-center mb-4">
            <img src={logo} alt="מרום" className="h-12 mx-auto mb-3" />
            <h2 className="text-xl font-heading font-bold">כללי בית הספר</h2>
            <p className="text-sm text-muted-foreground">אנא קרא/י בעיון ואשר/י בחתימתך</p>
          </div>

          <div className="intake-card max-h-[45vh] overflow-y-auto text-right space-y-3 text-sm leading-relaxed mb-4">
            <p className="font-semibold text-primary text-base mb-2">ברוכים הבאים לבית ספר מרום בית אקשטיין</p>
            {schoolRules.map((rule, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-primary font-bold text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
                <p className="text-muted-foreground">{rule}</p>
              </div>
            ))}
            <div className="pt-3 mt-3 border-t border-border">
              <p className="font-semibold text-sm">שמירה על הכללים תוביל תמיד להערכה והוקרה, והטבות וזכויות נוספות בבית הספר.</p>
            </div>
          </div>

          <label className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50 cursor-pointer mb-4">
            <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-input accent-primary" />
            <span className="text-sm text-foreground leading-relaxed">קראתי את הכללים ואני מסכים/ה להם</span>
          </label>

          <div className="intake-card-soft mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">חתימת התלמיד/ה</p>
              <button onClick={handleClearSignature} className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground">
                <RotateCcw className="w-3 h-3" /> נקה
              </button>
            </div>
            <div className="border-2 border-dashed border-border rounded-xl bg-card overflow-hidden" style={{ touchAction: "none" }}>
              <SignatureCanvas ref={sigCanvasRef} penColor="hsl(220, 20%, 20%)"
                canvasProps={{ width: 350, height: 120, className: "w-full", style: { width: "100%", height: "120px" } }}
                onEnd={handleSignEnd} />
            </div>
            {hasSigned && (
              <p className="text-xs text-success flex items-center gap-1 mt-1.5">
                <CheckCircle className="w-3 h-3" /> חתימה התקבלה
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep("welcome")} className="btn-intake bg-secondary text-secondary-foreground flex-1">חזרה</button>
            <button onClick={handleConsentAndContinue} disabled={!consentChecked || !hasSigned}
              className="btn-intake flex-1 bg-primary text-primary-foreground shadow-md hover:shadow-lg text-lg py-4 disabled:opacity-40 disabled:cursor-not-allowed">
              אישור והמשך
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "explanation") {
    return (
      <div className="min-h-screen px-4 py-8 bg-background relative">
        <button onClick={() => navigate("/")} className="absolute top-4 left-4 p-2 rounded-xl hover:bg-muted transition-colors" title="התנתק">
          <LogOut className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="max-w-md mx-auto animate-slide-up">
          <h2 className="text-xl font-heading font-bold mb-1 text-center">מה אנחנו הולכים לעשות?</h2>
          <p className="text-sm text-muted-foreground text-center mb-6">הנה הסבר קצר על כל חלק</p>
          <div className="space-y-3">
            {explanationCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <div key={i} className="intake-card-soft flex gap-4 items-start animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1">{card.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => isReassessment ? setStep("welcome") : setStep("consent")} className="btn-intake bg-secondary text-secondary-foreground flex-1">חזרה</button>
            <button onClick={handleStartQuestionnaire} className="btn-intake flex-1 bg-primary text-primary-foreground shadow-md hover:shadow-lg text-lg py-4">המשך לשאלונים</button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "questionnaire") {
    const responses = isReassessment ? ((session as any).reassessmentStudentResponses || {}) : session.studentResponses;
    return (
      <div className="min-h-screen py-6 bg-background relative">
        <button onClick={() => navigate("/")} className="absolute top-4 left-4 z-30 p-2 rounded-xl hover:bg-muted transition-colors" title="התנתק">
          <LogOut className="w-5 h-5 text-muted-foreground" />
        </button>
        <QuestionnaireFlow
          role="student"
          responses={responses}
          openResponses={session.studentOpenResponses}
          onUpdateResponse={handleUpdateResponse}
          onUpdateOpenResponse={handleUpdateOpenResponse}
          onComplete={handleComplete}
          onSaveAndExit={handleSaveAndExit}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background relative">
      <button onClick={() => navigate("/")} className="absolute top-4 left-4 p-2 rounded-xl hover:bg-muted transition-colors" title="התנתק">
        <LogOut className="w-5 h-5 text-muted-foreground" />
      </button>
      <div className="w-full max-w-md animate-fade-in text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/15 flex items-center justify-center">
          <Star className="w-10 h-10 text-success" />
        </div>
        <h1 className="text-2xl font-heading font-bold mb-3">
          {isReassessment ? "סיימת את הסיכום השנתי!" : "סיימת בהצלחה!"}
        </h1>
        <p className="text-muted-foreground leading-relaxed mb-2">
          תודה רבה. סיימת את השאלון בהצלחה.
        </p>
        <p className="text-sm text-muted-foreground">
          המידע יעזור לנו להכיר אותך טוב יותר ולתמוך בך בצורה המתאימה.
        </p>
        <div className="intake-card mt-6">
          <p className="text-sm text-muted-foreground">💚 אנחנו שמחים שאת/ה איתנו</p>
        </div>
        <button onClick={() => navigate("/")} className="btn-intake bg-secondary text-secondary-foreground mt-4">
          חזרה למסך הראשי
        </button>
      </div>
    </div>
  );
};

export default StudentFlow;
