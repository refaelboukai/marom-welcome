import { useState } from "react";
import { BookOpen, FileText, Loader2, GraduationCap, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { generatePedagogicalTest, analyzePedagogicalResults, createAcademicAssessment, updateAcademicAssessment } from "@/lib/supabase-storage";

interface AcademicAssessmentProps {
  sessionId: string;
  studentName: string;
  gradeLevel: string;
  existingScores?: any;
  assessments: any[];
  onAssessmentsChange: () => void;
}

const SUBJECTS = [
  { value: "hebrew", label: "עברית", icon: "📖" },
  { value: "math", label: "מתמטיקה", icon: "🔢" },
  { value: "english", label: "אנגלית", icon: "🔤" },
];

const PERFORMANCE_LABELS: Record<string, { label: string; color: string }> = {
  mastery: { label: "שליטה", color: "text-success" },
  partial: { label: "שליטה חלקית", color: "text-warning" },
  needs_intervention: { label: "דורש התערבות", color: "text-destructive" },
};

const AcademicAssessment = ({
  sessionId,
  studentName,
  gradeLevel,
  existingScores,
  assessments,
  onAssessmentsChange,
}: AcademicAssessmentProps) => {
  const [selectedSubject, setSelectedSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedAssessment, setExpandedAssessment] = useState<string | null>(null);

  const handleGenerateTest = async () => {
    if (!selectedSubject) return;
    setLoading(true);
    setError(null);

    try {
      const result = await generatePedagogicalTest(selectedSubject, gradeLevel, topic || undefined);
      if (!result?.data) throw new Error("No data returned");

      const assessment = await createAcademicAssessment(sessionId, selectedSubject, gradeLevel);
      if (!assessment) throw new Error("Failed to create assessment");

      await updateAcademicAssessment(assessment.id, {
        test_content: result.data,
        status: "in_progress",
      });

      onAssessmentsChange();
      setSelectedSubject("");
      setTopic("");
    } catch (e: any) {
      setError(e.message || "שגיאה ביצירת המבחן");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (assessment: any) => {
    setLoading(true);
    setError(null);

    try {
      const result = await analyzePedagogicalResults(
        assessment.subject,
        assessment.grade_level,
        assessment.student_answers,
        existingScores,
        studentName
      );
      if (!result?.data) throw new Error("No data returned");

      await updateAcademicAssessment(assessment.id, {
        ai_analysis: result.data,
        performance_level: result.data.performanceLevel,
        dimension_scores: result.data.dimensionScores,
        action_plan: result.data.actionPlan,
        status: "analyzed",
      });

      onAssessmentsChange();
    } catch (e: any) {
      setError(e.message || "שגיאה בניתוח");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Generate Test Card */}
      <div className="intake-card">
        <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          הערכה אקדמית - מיפוי פדגוגי
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          יצירת מבחן אבחוני וניתוח ביצועים לפי תקני ראמ"ה ומשרד החינוך
        </p>

        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {SUBJECTS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSelectedSubject(s.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedSubject === s.value
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>

          {selectedSubject && (
            <div className="space-y-2 animate-fade-in">
              <input
                type="text"
                placeholder="נושא ספציפי (אופציונלי)"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-background border border-input rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleGenerateTest}
                disabled={loading}
                className="btn-intake bg-primary text-primary-foreground w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    מייצר מבחן...
                  </>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4" />
                    צור מבחן אבחוני
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-3 p-3 bg-destructive/10 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
      </div>

      {/* Existing Assessments */}
      {assessments.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-heading font-semibold text-sm">הערכות קיימות</h4>
          {assessments.map((assessment) => {
            const subjectInfo = SUBJECTS.find((s) => s.value === assessment.subject);
            const isExpanded = expandedAssessment === assessment.id;
            const perfInfo = assessment.performance_level ? PERFORMANCE_LABELS[assessment.performance_level] : null;

            return (
              <div key={assessment.id} className="intake-card-soft">
                <button
                  onClick={() => setExpandedAssessment(isExpanded ? null : assessment.id)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{subjectInfo?.icon || "📝"}</span>
                    <div className="text-right">
                      <p className="text-sm font-medium">{subjectInfo?.label || assessment.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(assessment.created_at).toLocaleDateString("he-IL")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {perfInfo && (
                      <span className={`text-xs font-medium ${perfInfo.color}`}>{perfInfo.label}</span>
                    )}
                    {assessment.status === "analyzed" && <CheckCircle2 className="w-4 h-4 text-success" />}
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-4 space-y-3 animate-fade-in">
                    {/* Test Content */}
                    {assessment.test_content && (
                      <div className="p-3 bg-background rounded-xl">
                        <h5 className="text-xs font-semibold mb-2 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {assessment.test_content.title || "מבחן אבחוני"}
                        </h5>
                        {assessment.test_content.instructions && (
                          <p className="text-xs text-muted-foreground mb-2">{assessment.test_content.instructions}</p>
                        )}
                        {assessment.test_content.questions?.map((q: any, i: number) => (
                          <div key={i} className="mb-2 p-2 bg-muted/30 rounded-lg">
                            <p className="text-xs font-medium">{i + 1}. {q.text}</p>
                            {q.options && (
                              <div className="mt-1 space-y-0.5">
                                {q.options.map((opt: string, j: number) => (
                                  <p key={j} className="text-xs text-muted-foreground mr-4">{opt}</p>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-2 mt-1">
                              <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 rounded text-primary">{q.difficulty}</span>
                              <span className="text-[10px] px-1.5 py-0.5 bg-accent rounded">{q.skill}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Analysis Results */}
                    {assessment.ai_analysis && (
                      <div className="space-y-3">
                        {/* Overall Score */}
                        {assessment.ai_analysis.overallScore != null && (
                          <div className="text-center p-3 bg-background rounded-xl">
                            <p className="text-xs text-muted-foreground">ציון כללי</p>
                            <p className="text-3xl font-bold text-primary">{assessment.ai_analysis.overallScore}</p>
                          </div>
                        )}

                        {/* Dimension Scores */}
                        {assessment.ai_analysis.dimensionScores && (
                          <div className="p-3 bg-background rounded-xl">
                            <h5 className="text-xs font-semibold mb-2">ציונים לפי מיומנות</h5>
                            <div className="space-y-2">
                              {Object.entries(assessment.ai_analysis.dimensionScores).map(([skill, data]: [string, any]) => (
                                <div key={skill} className="flex items-center justify-between">
                                  <span className="text-xs">{skill}</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-primary rounded-full"
                                        style={{ width: `${data.score || 0}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-medium w-8 text-left">{data.score}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Summary */}
                        {assessment.ai_analysis.summary && (
                          <div className="p-3 bg-background rounded-xl">
                            <h5 className="text-xs font-semibold mb-1">סיכום</h5>
                            <p className="text-xs text-muted-foreground leading-relaxed">{assessment.ai_analysis.summary}</p>
                          </div>
                        )}

                        {/* Action Plan */}
                        {assessment.ai_analysis.actionPlan?.length > 0 && (
                          <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                            <h5 className="text-xs font-semibold mb-2 text-primary">תכנית פעולה למורה</h5>
                            {assessment.ai_analysis.actionPlan.map((step: any, i: number) => (
                              <div key={i} className="mb-2">
                                <p className="text-xs font-medium">{step.step || i + 1}. {step.action}</p>
                                {step.rationale && (
                                  <p className="text-[10px] text-muted-foreground mr-4">{step.rationale}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Misconceptions */}
                        {assessment.ai_analysis.misconceptions?.length > 0 && (
                          <div className="p-3 bg-warning/5 rounded-xl border border-warning/10">
                            <h5 className="text-xs font-semibold mb-2 text-warning">טעויות שזוהו</h5>
                            {assessment.ai_analysis.misconceptions.map((m: any, i: number) => (
                              <div key={i} className="mb-1.5">
                                <div className="flex gap-1.5 items-center">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                    m.type === "conceptual" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                                  }`}>
                                    {m.type === "conceptual" ? "מושגי" : "טכני"}
                                  </span>
                                  <p className="text-xs">{m.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* CEFR Level */}
                        {assessment.ai_analysis.cefrLevel && (
                          <div className="p-2 bg-info/10 rounded-xl text-center">
                            <span className="text-xs text-muted-foreground">רמת CEFR: </span>
                            <span className="text-sm font-bold text-info">{assessment.ai_analysis.cefrLevel}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Analyze Button */}
                    {assessment.status === "in_progress" && (
                      <button
                        onClick={() => handleAnalyze(assessment)}
                        disabled={loading}
                        className="btn-intake bg-primary text-primary-foreground w-full flex items-center justify-center gap-2 text-sm"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            מנתח ביצועים...
                          </>
                        ) : (
                          "נתח תוצאות (AI)"
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AcademicAssessment;
