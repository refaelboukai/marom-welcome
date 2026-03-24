import { likertLabels } from "@/data/questionnaires";

interface LikertScaleProps {
  value?: number;
  onChange: (value: number) => void;
  questionText: string;
  questionNumber: number;
}

const LikertScale = ({ value, onChange, questionText, questionNumber }: LikertScaleProps) => {
  return (
    <div className="intake-card-soft animate-fade-in mb-3">
      <p className="text-sm sm:text-base font-medium mb-3 sm:mb-4 leading-relaxed">
        <span className="text-muted-foreground ml-2">{questionNumber}.</span>
        {questionText}
      </p>
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {likertLabels.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`py-2.5 sm:py-3 px-1 rounded-xl text-[11px] sm:text-sm font-medium transition-all duration-200 border-2 text-center ${
              value === opt.value
                ? "bg-primary border-primary text-primary-foreground shadow-md scale-105"
                : "bg-card border-border text-foreground hover:border-primary/40 hover:bg-primary/5"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LikertScale;
