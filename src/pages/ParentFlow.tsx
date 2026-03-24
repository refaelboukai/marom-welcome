import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSessionDB, updateSessionDB } from "@/lib/supabase-storage";
import { IntakeSession } from "@/lib/types";
import QuestionnaireFlow from "@/components/QuestionnaireFlow";
import logo from "@/assets/logo.jpeg";
import { Heart, Star, Loader2 } from "lucide-react";

type Step = "welcome" | "questionnaire" | "complete";

const ParentFlow = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<IntakeSession | null>(null);
  const [step, setStep] = useState<Step>("welcome");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    getSessionDB(sessionId).then((s) => {
      setLoading(false);
      if (!s) { navigate("/"); return; }
      setSession(s);
      if (["parent_completed", "under_review", "completed"].includes(s.status)) {
        setStep("complete");
      } else if (Object.keys(s.parentResponses).length > 0) {
        setStep("questionnaire");
      }
    });
  }, [sessionId, navigate]);

  const handleStart = useCallback(async () => {
    if (!session) return;
    if (!["parent_started", "parent_completed"].includes(session.status)) {
      await updateSessionDB(session.id, { status: "parent_started" });
      setSession((prev) => prev ? { ...prev, status: "parent_started" } : null);
    }
    setStep("questionnaire");
  }, [session]);

  const handleUpdateResponse = useCallback(async (itemId: string, value: number) => {
    if (!session) return;
    const updated = { ...session.parentResponses, [itemId]: value };
    setSession((prev) => prev ? { ...prev, parentResponses: updated } : null);
    await updateSessionDB(session.id, { parentResponses: updated });
  }, [session]);

  const handleUpdateOpenResponse = useCallback(async (key: string, value: string) => {
    if (!session) return;
    await updateSessionDB(session.id, { parentOpenResponse: value });
    setSession((prev) => prev ? { ...prev, parentOpenResponse: value } : null);
  }, [session]);

  const handleComplete = useCallback(async () => {
    if (!session) return;
    await updateSessionDB(session.id, { status: "parent_completed" });
    setSession((prev) => prev ? { ...prev, status: "parent_completed" } : null);
    setStep("complete");
  }, [session]);

  const handleSaveAndExit = useCallback(() => { navigate("/"); }, [navigate]);

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
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
        <div className="w-full max-w-md animate-fade-in text-center">
          <img src={logo} alt="מרום" className="h-16 mx-auto mb-6" />
          <h1 className="text-2xl font-heading font-bold mb-3">שלום, הורה יקר</h1>
          <p className="text-muted-foreground leading-relaxed mb-2">
            כחלק מתהליך הקליטה של <strong>{session.studentName}</strong>, נשמח לשמוע את התפיסה שלך בנוגע לתפקוד ילדך.
          </p>
          <div className="intake-card mt-6 text-right space-y-2 text-sm text-muted-foreground">
            <p>✓ השאלון קצר וממוקד</p>
            <p>✓ אין תשובות נכונות או לא נכונות</p>
            <p>✓ שיתוף הפעולה שלך חשוב מאוד</p>
          </div>
          <div className="intake-card mt-4 text-right space-y-2 text-sm border-primary/20">
            <h3 className="font-heading font-semibold text-primary text-base mb-2">🌱 על התכנית — "לא מוותרים על אף ילד"</h3>
            <p className="text-muted-foreground leading-relaxed">
              התכנית מבוססת על תפיסת <strong>איכות חיים</strong> — גישה הרואה בכל אדם בעל רצונות, שאיפות, אהבות ויכולות.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              מטרת התכנית היא לבסס יחד עם התלמידים הזדמנויות לקדם את עצמם, תוך איתור משותף של תחומי החיים אותם יש לשמר או לשפר.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              השאלון שלפניך עוזר לנו להבין את תפיסתך כהורה, ומשמש חלק בלתי נפרד מבניית תכנית אישית לקידום איכות החיים של ילדך.
            </p>
            <p className="text-xs text-muted-foreground/70 mt-2">
              ככל שהפער בין צרכיו של האדם לבין מציאות חייו קטן יותר — כך איכות החיים גבוהה יותר.
            </p>
          </div>
          <button
            onClick={handleStart}
            className="btn-intake w-full bg-primary text-primary-foreground shadow-md hover:shadow-lg text-lg py-4 mt-6"
          >
            התחל
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
          openResponses={session.parentOpenResponse ? { parent_comment: session.parentOpenResponse } : {}}
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
          <Heart className="w-10 h-10 text-success" />
        </div>
        <h1 className="text-2xl font-heading font-bold mb-3">תודה רבה!</h1>
        <p className="text-muted-foreground leading-relaxed mb-2">
          תודה על שיתוף הפעולה. המידע שמסרת חשוב לתהליך ההיכרות והתמיכה בתלמיד.
        </p>
        <div className="intake-card mt-6">
          <p className="text-sm text-muted-foreground">💚 אנחנו מעריכים את המעורבות שלך</p>
        </div>
      </div>
    </div>
  );
};

export default ParentFlow;
