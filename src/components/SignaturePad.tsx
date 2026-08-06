import { useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Check, RotateCcw } from "lucide-react";

interface Props {
  label: string;
  value: string;
  onChange: (data: string) => void;
}

const SignaturePad = ({ label, value, onChange }: Props) => {
  const ref = useRef<SignatureCanvas | null>(null);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium">{label}</label>
        <button type="button"
          onClick={() => { ref.current?.clear(); onChange(""); }}
          className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1">
          <RotateCcw className="w-3 h-3" /> ניקוי
        </button>
      </div>
      {value ? (
        <div className="border-2 border-border rounded-xl bg-card p-2">
          <img src={value} alt="חתימה" className="w-full h-[130px] object-contain" />
        </div>
      ) : (
        <div className="border-2 border-dashed border-border rounded-xl bg-card overflow-hidden" style={{ touchAction: "none" }}>
          <SignatureCanvas
            ref={ref}
            penColor="#1a1a2e"
            canvasProps={{ width: 500, height: 130, className: "w-full", style: { width: "100%", height: "130px" } }}
            onEnd={() => {
              const c = ref.current;
              if (c && !c.isEmpty()) onChange(c.toDataURL("image/png"));
            }}
          />
        </div>
      )}
      {value
        ? <p className="text-xs text-success flex items-center gap-1 mt-1.5"><Check className="w-3 h-3" /> חתימה התקבלה</p>
        : <p className="text-xs text-muted-foreground mt-1.5">חתמו באצבע או בעכבר בתוך המסגרת</p>}
    </div>
  );
};

export default SignaturePad;