import { useState, useCallback } from "react";
import { questionnaireItems, ITEMS_PER_PAGE, sectionOrder } from "@/data/questionnaires";
import LikertScale from "./LikertScale";
import ProgressHeader from "./ProgressHeader";
import { OPEN_QUESTION_KEYS, OPEN_QUESTION_LABELS } from "@/lib/types";

interface QuestionnaireFlowProps {
  role: "student" | "parent";
  responses: Record<string, number>;
  openResponses?: Record<string, string>;
  onUpdateResponse: (itemId: string, value: number) => void;
  onUpdateOpenResponse?: (key: string, value: string) => void;
  onComplete: () => void;
}

const QuestionnaireFlow = ({
  role,
  responses,
  openResponses = {},
  onUpdateResponse,
  onUpdateOpenResponse,
  onComplete,
}: QuestionnaireFlowProps) => {
  const totalItems = questionnaireItems.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const hasOpenQuestions = role === "student";
  const totalSteps = totalPages + (hasOpenQuestions ? 1 : 0);

  const [currentPage, setCurrentPage] = useState(0);

  const isOpenPage = hasOpenQuestions && currentPage === totalPages;

  const currentItems = isOpenPage
    ? []
    : questionnaireItems.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const currentSection = currentItems.length > 0
    ? sectionOrder.find((s) => s.section === currentItems[0].section)
    : null;

  const answeredOnPage = currentItems.filter((item) => responses[item.id] != null).length;
  const canProceed = isOpenPage || answeredOnPage === currentItems.length;

  const totalAnswered = Object.keys(responses).length;

  const handleNext = useCallback(() => {
    if (currentPage < totalSteps - 1) {
      setCurrentPage((p) => p + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      onComplete();
    }
  }, [currentPage, totalSteps, onComplete]);

  const handleBack = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage((p) => p - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentPage]);

  // Calculate global item offset for numbering
  const globalOffset = currentPage * ITEMS_PER_PAGE;

  return (
    <div className="max-w-lg mx-auto px-4 pb-8">
      <ProgressHeader
        current={totalAnswered}
        total={totalItems}
        sectionLabel={currentSection?.label}
      />

      {!isOpenPage && (
        <div className="mt-4 space-y-2">
          {currentItems.map((item, idx) => (
            <LikertScale
              key={item.id}
              questionNumber={globalOffset + idx + 1}
              questionText={role === "student" ? item.studentText : item.parentText}
              value={responses[item.id]}
              onChange={(val) => onUpdateResponse(item.id, val)}
            />
          ))}
        </div>
      )}

      {isOpenPage && (
        <div className="mt-4 space-y-4">
          <h3 className="text-lg font-heading font-semibold">עוד קצת עליך...</h3>
          <p className="text-sm text-muted-foreground">אלה שאלות פתוחות. אפשר לכתוב כמה שרוצים או לדלג.</p>
          {OPEN_QUESTION_KEYS.map((key) => (
            <div key={key} className="intake-card-soft">
              <label className="block text-sm font-medium mb-2">{OPEN_QUESTION_LABELS[key]}</label>
              <textarea
                className="w-full bg-background border border-input rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
                value={openResponses[key] || ""}
                onChange={(e) => onUpdateOpenResponse?.(key, e.target.value)}
                placeholder="כתוב/י כאן..."
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 mt-6">
        {currentPage > 0 && (
          <button
            onClick={handleBack}
            className="btn-intake bg-secondary text-secondary-foreground flex-1"
          >
            חזרה
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={!canProceed}
          className={`btn-intake flex-1 ${
            canProceed
              ? "bg-primary text-primary-foreground shadow-md hover:shadow-lg"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          {currentPage === totalSteps - 1 ? "סיום" : "המשך"}
        </button>
      </div>

      {!canProceed && !isOpenPage && (
        <p className="text-center text-xs text-muted-foreground mt-2">
          יש לענות על כל השאלות כדי להמשיך
        </p>
      )}
    </div>
  );
};

export default QuestionnaireFlow;
