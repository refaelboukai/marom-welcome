import { likertLabels } from "@/data/questionnaires";
import { Gender } from "@/lib/gender-utils";

interface LikertScaleProps {
  value?: number;
  onChange: (value: number) => void;
  questionText: string;
  questionNumber: number;
  gender?: Gender;
}

const LikertScale = ({ value, onChange, questionText, questionNumber, gender = "unknown" }: LikertScaleProps) => {
  return (
    <div className="intake-card-soft animate-fade-in mb-3">
      <p className="text-sm sm:text-base font-medium mb-3 sm:mb-4 leading-relaxed">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold ml-2">{questionNumber}</span>
        {questionText}
      </p>
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {likertLabels.map((opt) => {
          const label = gender === "female" && opt.labelFemale ? opt.labelFemale : opt.label;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`py-2.5 sm:py-3 px-1 rounded-xl text-[11px] sm:text-sm font-medium transition-all duration-200 border-2 text-center ${
                value === opt.value
                  ? "bg-primary border-primary text-primary-foreground shadow-md scale-105"
                  : "bg-card border-border text-foreground hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {value != null && (
        <p className="text-[10px] text-success mt-1.5 text-center">✓ נשמר</p>
      )}
    </div>
  );
};

export default LikertScale;
