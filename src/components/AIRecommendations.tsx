import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScoreResults } from "@/lib/types";
import { Brain, Loader2, Sparkles, AlertCircle, Target, TrendingUp, Lightbulb } from "lucide-react";

interface StudentData {
  name: string;
  classGroup: string;
  scores: ScoreResults;
}

interface AIRecommendation {
  classInsight: string;
  recommendations: string[];
  attentionCount: number;
  strengths: string[];
  focusAreas: string[];
}

interface AIRecommendationsProps {
  students: StudentData[];
  classLabel?: string;
}

const AIRecommendations = ({ students, classLabel }: AIRecommendationsProps) => {
  const [result, setResult] = useState<AIRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);

    const studentsData = students
      .filter((s) => s.scores.qualityOfLife.normalized >= 0)
      .map((s) => ({
        classGroup: s.classGroup,
        qualityOfLife: s.scores.qualityOfLife.normalized,
        selfEfficacy: s.scores.selfEfficacy.normalized,
        locusOfControl: s.scores.locusOfControl.normalized,
        cognitiveFlexibility: s.scores.cognitiveFlexibility.normalized,
        studentVsParentGaps: {
          qualityOfLife: s.scores.qualityOfLife.studentNormalized >= 0 && s.scores.qualityOfLife.parentNormalized >= 0
            ? Math.abs(s.scores.qualityOfLife.studentNormalized - s.scores.qualityOfLife.parentNormalized)
            : null,
          selfEfficacy: s.scores.selfEfficacy.studentNormalized >= 0 && s.scores.selfEfficacy.parentNormalized >= 0
            ? Math.abs(s.scores.selfEfficacy.studentNormalized - s.scores.selfEfficacy.parentNormalized)
            : null,
        },
      }));

    if (studentsData.length === 0) {
      setError("אין מספיק נתונים ליצירת המלצות. יש צורך בתשובות לשאלונים.");
      setLoading(false);
      return;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-recommendations", {
        body: { students: studentsData },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setResult(data);
    } catch (e: any) {
      setError(e.message || "שגיאה ביצירת המלצות");
    } finally {
      setLoading(false);
    }
  }, [students]);

  return (
    <div className="intake-card border-primary/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          המלצות AI {classLabel && `— ${classLabel}`}
        </h3>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="btn-intake bg-primary text-primary-foreground text-xs px-3 py-1.5 gap-1"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              מנתח...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              {result ? "רענן" : "צור המלצות"}
            </>
          )}
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
          לחץ על "צור המלצות" לקבלת תובנות מבוססות AI על בסיס נתוני השאלונים
        </p>
      )}

      {result && (
        <div className="space-y-4 animate-fade-in">
          {/* Class Insight */}
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
            <p className="text-sm leading-relaxed">{result.classInsight}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Strengths */}
            {result.strengths.length > 0 && (
              <div className="p-3 bg-success/5 rounded-xl border border-success/10">
                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1 text-success">
                  <TrendingUp className="w-3.5 h-3.5" />
                  חוזקות
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

            {/* Focus Areas */}
            {result.focusAreas.length > 0 && (
              <div className="p-3 bg-warning/5 rounded-xl border border-warning/10">
                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1 text-warning">
                  <Target className="w-3.5 h-3.5" />
                  תחומי מיקוד
                </h4>
                <ul className="space-y-1">
                  {result.focusAreas.map((s, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-warning mt-0.5">•</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="p-4 bg-muted/30 rounded-xl">
              <h4 className="text-xs font-semibold mb-3 flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5 text-primary" />
                המלצות מעשיות
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

          {/* Attention Count */}
          {result.attentionCount > 0 && (
            <div className="text-center p-2 bg-warning/10 rounded-xl">
              <p className="text-xs text-warning font-medium">
                {result.attentionCount} תלמידים דורשים תשומת לב מיוחדת
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIRecommendations;
