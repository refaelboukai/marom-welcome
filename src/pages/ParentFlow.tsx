import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSession, updateSession } from "@/lib/storage";
import { IntakeSession } from "@/lib/types";
import QuestionnaireFlow from "@/components/QuestionnaireFlow";
import logo from "@/assets/logo.jpeg";
import { CheckCircle } from "lucide-react";

type Step = "welcome" | "explanation" | "questionnaire" | "complete";

const ParentFlow = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<IntakeSession | null>(null);
  const [step, setStep] = useState<Step>("welcome");
  const [parentComment, setParentComment] = useState("");

  useEffect(() => {
    if (!sessionId) return;
    const s = getSession(sessionId);
    if (!s) {
      navigate("/");
      return;
    }
    setSession(s);
    setParentComment(s.parentOpenResponse || "");
    if (["parent_completed", "under_review", "completed"].includes(s.status)) {
      setStep("complete");
    } else if (Object.keys(s.parentResponses).length > 0) {
      setStep("questionnaire");
    }
  }, [sessionId, navigate]);

  const handleStart = useCallback(() => {
    if (!session) return;
    const newStatus = ["not_started", "student_completed"].includes(session.status) ? "parent_started" : session.status;
    updateSession(session.id, { status: newStatus });
    setSession((prev) => prev ? { ...prev, status: newStatus as any } : null);
    setStep("questionnaire");
  }, [session]);

  const handleUpdateResponse = useCallback((itemId: string, value: number) => {
    if (!session) return;
    const updated = { ...session.parentResponses, [itemId]: value };
    updateSession(session.id, { parentResponses: updated });
    setSession((prev) => prev ? { ...prev, parentResponses: updated } : null);
  }, [session]);

  const handleUpdateParentComment = useCallback((key: string, value: string) => {
    if (!session) return;
    setParentComment(value);
    updateSession(session.id, { parentOpenResponse: value });
  }, [session]);

  const handleComplete = useCallback(() => {
    if (!session) return;
    updateSession(session.id, { status: "parent_completed", parentOpenResponse: parentComment });
    setSession((prev) => prev ? { ...prev, status: "parent_completed" } : null);
    setStep("complete");
  }, [session, parentComment]);

  const handleSaveAndExit = useCallback(() => {
    navigate("/");
  }, [navigate]);

  if (!session) return null;

  if (step === "welcome") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
        <div className="w-full max-w-md animate-fade-in text-center">
          <img src={logo} alt="מרום" className="h-16 mx-auto mb-6" />
          <h1 className="text-2xl font-heading font-bold mb-3">שלום רב</h1>
          <p className="text-muted-foreground leading-relaxed mb-4">
            במסגרת תהליך קליטת <strong>{session.studentName}</strong> בבית הספר,
            נשמח לשמוע את נקודת המבט שלכם כהורים.
          </p>
          <div className="intake-card text-right space-y-2 text-sm text-muted-foreground">
            <p>✓ השאלון קצר וממוקד</p>
            <p>✓ התשובות שלכם חשובות לנו</p>
            <p>✓ המידע ישמש את צוות בית הספר בלבד</p>
          </div>
          <button
            onClick={() => setStep("explanation")}
            className="btn-intake w-full bg-primary text-primary-foreground shadow-md hover:shadow-lg text-lg py-4 mt-6"
          >
            התחלה
          </button>
        </div>
      </div>
    );
  }

  if (step === "explanation") {
    return (
      <div className="min-h-screen px-4 py-8 bg-background">
        <div className="max-w-md mx-auto animate-slide-up">
          <h2 className="text-xl font-heading font-bold mb-1 text-center">על מה השאלון?</h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            השאלון בודק ארבעה תחומים מרכזיים מנקודת המבט שלכם כהורים
          </p>
          <div className="space-y-3">
            {[
              { title: "איכות חיים", desc: "עד כמה לדעתכם ילדכם מרוצה מתחומי חייו השונים" },
              { title: "מסוגלות עצמית", desc: "עד כמה לדעתכם ילדכם מאמין ביכולתו להצליח" },
              { title: "מיקוד שליטה", desc: "עד כמה לדעתכם ילדכם מרגיש השפעה על מה שקורה לו" },
              { title: "גמישות קוגניטיבית", desc: "עד כמה לדעתכם ילדכם מצליח לחשוב בגמישות ולהתמודד" },
            ].map((card, i) => (
              <div key={i} className="intake-card-soft animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                <h3 className="font-semibold text-sm mb-1">{card.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep("welcome")}
              className="btn-intake bg-secondary text-secondary-foreground flex-1"
            >
              חזרה
            </button>
            <button
              onClick={handleStart}
              className="btn-intake flex-1 bg-primary text-primary-foreground shadow-md hover:shadow-lg text-lg py-4"
            >
              המשך לשאלון
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
          role="parent"
          responses={session.parentResponses}
          openResponses={{ parent_comment: parentComment }}
          onUpdateResponse={handleUpdateResponse}
          onUpdateOpenResponse={handleUpdateParentComment}
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
          <CheckCircle className="w-10 h-10 text-success" />
        </div>
        <h1 className="text-2xl font-heading font-bold mb-3">תודה רבה!</h1>
        <p className="text-muted-foreground leading-relaxed">
          תודה על שיתוף הפעולה. המידע שמסרת חשוב לתהליך ההיכרות והתמיכה בתלמיד.
        </p>
        <p className="text-sm text-muted-foreground mt-2">צוות בית הספר ייצור איתכם קשר בהמשך.</p>
      </div>
    </div>
  );
};

export default ParentFlow;
