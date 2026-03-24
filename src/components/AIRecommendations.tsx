import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScoreResults, OPEN_QUESTION_LABELS } from "@/lib/types";
import { Brain, Loader2, Sparkles, AlertCircle, Target, TrendingUp, Lightbulb, Heart, Users } from "lucide-react";

interface StudentAIData {
  name: string;
  scores: ScoreResults;
  openResponses?: Record<string, string>;
  staffOpenResponses?: Record<string, string>;
}

interface AIResult {
  personalInsight: string;
  strengths: string[];
  areasForSupport: string[];
  recommendations: string[];
  suggestedGoals: string[];
  parentGuidance: string;
}

interface AIRecommendationsProps {
  student: StudentAIData;
  onResult?: (result: AIResult) => void;
}

const AIRecommendations = ({ student, onResult }: AIRecommendationsProps) => {
  const [result, setResult] = useState<AIResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);

    const scores = student.scores;
    if (scores.qualityOfLife.normalized < 0) {
      setError("אין מספיק נתונים ליצירת המלצות. יש צורך בתשובות לשאלונים.");
      setLoading(false);
      return;
    }

    const studentData = {
      name: student.name,
      qualityOfLife: { score: scores.qualityOfLife.normalized, student: scores.qualityOfLife.studentNormalized, parent: scores.qualityOfLife.parentNormalized },
      selfEfficacy: { score: scores.selfEfficacy.normalized, student: scores.selfEfficacy.studentNormalized, parent: scores.selfEfficacy.parentNormalized },
      locusOfControl: { score: scores.locusOfControl.normalized, student: scores.locusOfControl.studentNormalized, parent: scores.locusOfControl.parentNormalized },
      cognitiveFlexibility: { score: scores.cognitiveFlexibility.normalized, student: scores.cognitiveFlexibility.studentNormalized, parent: scores.cognitiveFlexibility.parentNormalized },
    };

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-recommendations", {
        body: {
          student: studentData,
          openResponses: student.openResponses,
          staffOpenResponses: student.staffOpenResponses,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setResult(data);
    } catch (e: any) {
      setError(e.message || "שגיאה ביצירת המלצות");
    } finally {
      setLoading(false);
    }
  }, [student]);

  return (
    <div className="intake-card border-primary/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          המלצות AI אישיות — {student.name}
        </h3>
        <button onClick={handleGenerate} disabled={loading}
          className="btn-intake bg-primary text-primary-foreground text-xs px-3 py-1.5 gap-1">
          {loading ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> מנתח...</>) : (<><Sparkles className="w-3.5 h-3.5" /> {result ? "רענן" : "צור המלצות"}</>)}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 rounded-xl flex items-start gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {!result && !loading && !error && (
        <p className="text-sm text-muted-foreground text-center py-4">
          לחץ על "צור המלצות" לקבלת תובנות והמלצות אישיות מבוססות AI עבור התלמיד
        </p>
      )}

      {result && (
        <div className="space-y-4 animate-fade-in">
          {/* Personal Insight */}
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
            <h4 className="text-xs font-semibold mb-2 flex items-center gap-1 text-primary">
              <Heart className="w-3.5 h-3.5" /> תובנה אישית
            </h4>
            <p className="text-sm leading-relaxed">{result.personalInsight}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.strengths.length > 0 && (
              <div className="p-3 bg-success/5 rounded-xl border border-success/10">
                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1 text-success">
                  <TrendingUp className="w-3.5 h-3.5" /> חוזקות
                </h4>
                <ul className="space-y-1">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-success mt-0.5">•</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.areasForSupport.length > 0 && (
              <div className="p-3 bg-warning/5 rounded-xl border border-warning/10">
                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1 text-warning">
                  <Target className="w-3.5 h-3.5" /> תחומים לתמיכה
                </h4>
                <ul className="space-y-1">
                  {result.areasForSupport.map((s, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-warning mt-0.5">•</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {result.recommendations.length > 0 && (
            <div className="p-4 bg-muted/30 rounded-xl">
              <h4 className="text-xs font-semibold mb-3 flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5 text-primary" /> המלצות מעשיות
              </h4>
              <div className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-xs font-bold text-primary mt-0.5 w-4 flex-shrink-0">{i + 1}.</span>
                    <p className="text-xs leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.suggestedGoals.length > 0 && (
            <div className="p-3 bg-info/5 rounded-xl border border-info/10">
              <h4 className="text-xs font-semibold mb-2 flex items-center gap-1 text-info">
                <Target className="w-3.5 h-3.5" /> יעדים מוצעים
              </h4>
              <ul className="space-y-1">
                {result.suggestedGoals.map((g, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-info mt-0.5">{i + 1}.</span>{g}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.parentGuidance && (
            <div className="p-3 bg-accent rounded-xl border border-border/50">
              <h4 className="text-xs font-semibold mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-info" /> הנחיה להורים
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{result.parentGuidance}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIRecommendations;
