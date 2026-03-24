import { useState } from "react";
import { Brain, Loader2, AlertCircle, Sparkles, Target, Clock, TrendingUp } from "lucide-react";
import { generateAIInsights } from "@/lib/supabase-storage";

interface AIInsightsCardProps {
  studentName: string;
  gradeLevel: string;
  existingScores: any;
  academicData?: any;
}

const AIInsightsCard = ({ studentName, gradeLevel, existingScores, academicData }: AIInsightsCardProps) => {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateAIInsights(existingScores, academicData, studentName, gradeLevel);
      if (result?.data) {
        setInsights(result.data);
      } else {
        throw new Error("לא התקבלו תוצאות");
      }
    } catch (e: any) {
      setError(e.message || "שגיאה ביצירת תובנות");
    } finally {
      setLoading(false);
    }
  };

  if (!insights) {
    return (
      <div className="intake-card border-primary/20">
        <h3 className="font-heading font-semibold mb-2 flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          תובנות AI מתקדמות
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          ניתוח AI מקיף המשלב את הממצאים הפסיכו-סוציאליים עם נתונים אקדמיים
        </p>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="btn-intake bg-primary text-primary-foreground w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              מייצר תובנות...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              צור תובנות AI
            </>
          )}
        </button>
        {error && (
          <div className="mt-3 p-3 bg-destructive/10 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Overall Profile */}
      {insights.overallProfile && (
        <div className="intake-card border-primary/20">
          <h3 className="font-heading font-semibold mb-2 flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            פרופיל כולל (AI)
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{insights.overallProfile}</p>
        </div>
      )}

      {/* Academic Readiness */}
      {insights.academicReadiness && (
        <div className="intake-card border-info/20">
          <h4 className="font-heading font-semibold text-sm mb-2 flex items-center gap-2 text-info">
            <TrendingUp className="w-4 h-4" />
            מוכנות אקדמית
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{insights.academicReadiness}</p>
        </div>
      )}

      {/* Psychosocial Integration */}
      {insights.psychosocialIntegration && (
        <div className="intake-card-soft">
          <h4 className="font-heading font-semibold text-sm mb-2">אינטגרציה פסיכו-סוציאלית-אקדמית</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{insights.psychosocialIntegration}</p>
        </div>
      )}

      {/* Prioritized Recommendations */}
      {insights.prioritizedRecommendations?.length > 0 && (
        <div className="intake-card border-primary/10">
          <h4 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            המלצות ממוקדות
          </h4>
          <div className="space-y-2">
            {insights.prioritizedRecommendations.map((rec: any, i: number) => (
              <div key={i} className="p-3 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                    {rec.priority || i + 1}
                  </span>
                  <span className="text-xs font-semibold text-primary">{rec.domain}</span>
                </div>
                <p className="text-xs mr-7">{rec.recommendation}</p>
                {rec.rationale && (
                  <p className="text-[10px] text-muted-foreground mr-7 mt-1">{rec.rationale}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Support Plan */}
      {insights.supportPlan && (
        <div className="intake-card">
          <h4 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            תכנית תמיכה
          </h4>
          <div className="space-y-3">
            {insights.supportPlan.immediate?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-destructive mb-1">מיידי</p>
                <ul className="space-y-0.5">
                  {insights.supportPlan.immediate.map((a: string, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                      <span className="text-destructive">•</span>{a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {insights.supportPlan.shortTerm?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-warning mb-1">טווח קצר</p>
                <ul className="space-y-0.5">
                  {insights.supportPlan.shortTerm.map((a: string, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                      <span className="text-warning">•</span>{a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {insights.supportPlan.longTerm?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-success mb-1">טווח ארוך</p>
                <ul className="space-y-0.5">
                  {insights.supportPlan.longTerm.map((a: string, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                      <span className="text-success">•</span>{a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Regenerate */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="btn-intake bg-secondary text-secondary-foreground w-full flex items-center justify-center gap-2 text-sm"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {loading ? "מחשב..." : "עדכן תובנות AI"}
      </button>
    </div>
  );
};

export default AIInsightsCard;
