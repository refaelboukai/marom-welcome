import { likertLabels } from "@/data/questionnaires";

interface LikertScaleProps {
  value?: number;
  onChange: (value: number) => void;
  questionText: string;
  questionNumber: number;
}

const LikertScale = ({ value, onChange, questionText, questionNumber }: LikertScaleProps) => {
  return (
    <div className="intake-card-soft animate-fade-in mb-4">
      <p className="text-base font-medium mb-4 leading-relaxed">
        <span className="text-muted-foreground ml-2">{questionNumber}.</span>
        {questionText}
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {likertLabels.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 min-w-[60px] py-3 px-2 rounded-xl text-sm font-medium transition-all duration-200 border-2 ${
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
