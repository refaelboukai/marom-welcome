import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSession, updateSession } from "@/lib/storage";
import { IntakeSession } from "@/lib/types";
import QuestionnaireFlow from "@/components/QuestionnaireFlow";
import logo from "@/assets/logo.jpeg";
import { CheckCircle } from "lucide-react";

type Step = "welcome" | "questionnaire" | "complete";

const ParentFlow = () => {
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
    if (s.status === "parent_completed" || s.status === "under_review" || s.status === "completed") {
      setStep("complete");
    } else if (Object.keys(s.parentResponses).length > 0) {
      setStep("questionnaire");
    }
  }, [sessionId, navigate]);

  const handleStart = useCallback(() => {
    if (!session) return;
    const newStatus = session.status === "student_completed" ? "parent_started" : session.status;
    updateSession(session.id, { status: newStatus === "not_started" ? "parent_started" : newStatus });
    setStep("questionnaire");
  }, [session]);

  const handleUpdateResponse = useCallback((itemId: string, value: number) => {
    if (!session) return;
    const updated = { ...session.parentResponses, [itemId]: value };
    updateSession(session.id, { parentResponses: updated });
    setSession((prev) => prev ? { ...prev, parentResponses: updated } : null);
  }, [session]);

  const handleComplete = useCallback(() => {
    if (!session) return;
    updateSession(session.id, { status: "parent_completed" });
    setSession((prev) => prev ? { ...prev, status: "parent_completed" } : null);
    setStep("complete");
  }, [session]);

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
            onClick={handleStart}
            className="btn-intake w-full bg-primary text-primary-foreground shadow-md hover:shadow-lg text-lg py-4 mt-6"
          >
            התחלה
          </button>
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
          onUpdateResponse={handleUpdateResponse}
          onComplete={handleComplete}
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
        <p className="text-muted-foreground">התשובות שלכם נשמרו בהצלחה.</p>
        <p className="text-sm text-muted-foreground mt-2">צוות בית הספר ייצור איתכם קשר בהמשך.</p>
      </div>
    </div>
  );
};

export default ParentFlow;
