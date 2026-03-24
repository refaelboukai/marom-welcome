import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSession, updateSession } from "@/lib/storage";
import { IntakeSession } from "@/lib/types";
import QuestionnaireFlow from "@/components/QuestionnaireFlow";
import logo from "@/assets/logo.jpeg";
import { Heart, BookOpen, Brain, Lightbulb, Star, Sparkles } from "lucide-react";

type Step = "welcome" | "explanation" | "questionnaire" | "complete";

const explanationCards = [
  { icon: Heart, title: "איכות חיים", desc: "עד כמה טוב לך בחיים שלך – בבית, בבית הספר, עם חברים, ועם עצמך." },
  { icon: Star, title: "מסוגלות עצמית", desc: "עד כמה אתה מאמין שאתה יכול להצליח, להתמודד, ולהשיג מטרות." },
  { icon: Lightbulb, title: "מיקוד שליטה", desc: "עד כמה אתה מרגיש שיש לך השפעה על מה שקורה לך." },
  { icon: Brain, title: "גמישות קוגניטיבית", desc: "עד כמה אתה מצליח לחשוב על אפשרויות שונות, לשנות כיוון כשצריך, ולהתמודד עם מצבים קשים." },
  { icon: Sparkles, title: "למה זה חשוב?", desc: "השאלונים עוזרים לנו להבין איך לתמוך בך בצורה הכי טובה." },
];

const StudentFlow = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<IntakeSession | null>(null);
  const [step, setStep] = useState<Step>("welcome");

  useEffect(() => {
    if (!sessionId) return;
    const s = getSession(sessionId);
    if (!s) {
      navigate("/");
      return;
    }
    setSession(s);
    if (["student_completed", "parent_started", "parent_completed", "under_review", "completed"].includes(s.status)) {
      setStep("complete");
    } else if (Object.keys(s.studentResponses).length > 0) {
      setStep("questionnaire");
    }
  }, [sessionId, navigate]);

  const handleStartQuestionnaire = useCallback(() => {
    if (!session) return;
    if (session.status === "not_started") {
      updateSession(session.id, { status: "student_started" });
      setSession((prev) => prev ? { ...prev, status: "student_started" } : null);
    }
    setStep("questionnaire");
  }, [session]);

  const handleUpdateResponse = useCallback((itemId: string, value: number) => {
    if (!session) return;
    const updated = { ...session.studentResponses, [itemId]: value };
    updateSession(session.id, { studentResponses: updated });
    setSession((prev) => prev ? { ...prev, studentResponses: updated } : null);
  }, [session]);

  const handleUpdateOpenResponse = useCallback((key: string, value: string) => {
    if (!session) return;
    const updated = { ...session.studentOpenResponses, [key]: value };
    updateSession(session.id, { studentOpenResponses: updated });
    setSession((prev) => prev ? { ...prev, studentOpenResponses: updated } : null);
  }, [session]);

  const handleComplete = useCallback(() => {
    if (!session) return;
    updateSession(session.id, { status: "student_completed" });
    setSession((prev) => prev ? { ...prev, status: "student_completed" } : null);
    setStep("complete");
  }, [session]);

  const handleSaveAndExit = useCallback(() => {
    navigate("/");
  }, [navigate]);

  if (!session) return null;

  if (step === "welcome") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
        <div className="w-full max-w-md animate-fade-in text-center">
          <img src={logo} alt="מרום" className="h-16 mx-auto mb-6" />
          <h1 className="text-3xl font-heading font-bold mb-3">ברוך הבא</h1>
          <h2 className="text-lg text-primary font-medium mb-4">{session.studentName}</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">
            אנחנו רוצים להכיר אותך טוב יותר כדי לעזור לך להרגיש טוב, להצליח ולהתקדם בבית הספר.
          </p>
          <div className="intake-card mt-6 text-right space-y-2 text-sm text-muted-foreground">
            <p>✓ אין תשובות נכונות או לא נכונות</p>
            <p>✓ חשוב לענות בכנות</p>
            <p>✓ המידע נועד לעזור לך</p>
          </div>
          <button
            onClick={() => setStep("explanation")}
            className="btn-intake w-full bg-primary text-primary-foreground shadow-md hover:shadow-lg text-lg py-4 mt-6"
          >
            התחל
          </button>
        </div>
      </div>
    );
  }

  if (step === "explanation") {
    return (
      <div className="min-h-screen px-4 py-8 bg-background">
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
            <button
              onClick={() => setStep("welcome")}
              className="btn-intake bg-secondary text-secondary-foreground flex-1"
            >
              חזרה
            </button>
            <button
              onClick={handleStartQuestionnaire}
              className="btn-intake flex-1 bg-primary text-primary-foreground shadow-md hover:shadow-lg text-lg py-4"
            >
              המשך לשאלונים
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "questionnaire") {
    return (
      <div className="min-h-screen py-6 bg-background">
        <QuestionnaireFlow
          role="student"
          responses={session.studentResponses}
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md animate-fade-in text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/15 flex items-center justify-center">
          <Star className="w-10 h-10 text-success" />
        </div>
        <h1 className="text-2xl font-heading font-bold mb-3">סיימת בהצלחה!</h1>
        <p className="text-muted-foreground leading-relaxed mb-2">
          תודה רבה. סיימת את השאלון בהצלחה.
        </p>
        <p className="text-sm text-muted-foreground">
          המידע יעזור לנו להכיר אותך טוב יותר ולתמוך בך בצורה המתאימה.
        </p>
        <div className="intake-card mt-6">
          <p className="text-sm text-muted-foreground">💚 אנחנו שמחים שאת/ה איתנו</p>
        </div>
      </div>
    </div>
  );
};

export default StudentFlow;
