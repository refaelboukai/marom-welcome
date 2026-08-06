import { useState } from "react";
import { ArrowRight, Clock, FileText } from "lucide-react";
import EnrollmentFormsAdmin from "@/components/EnrollmentFormsAdmin";
import ShortDayAdmin from "@/components/ShortDayAdmin";
import { APP_URL } from "@/lib/app-url";

type FormKey = "enrollment" | "short-day" | null;

const CARDS = [
  { key: "enrollment" as const, icon: FileText, title: "טופס קליטה לתלמיד/ה חדש/ה", desc: "שליחת הזמנות להורים, מעקב אחר מילוי הטופס, צפייה במסמכים והפקת PDF.", link: `${APP_URL}/enroll` },
  { key: "short-day" as const, icon: Clock, title: "בקשה לקיצור יום לימודים", desc: "בקשות הורים לקיצור יום הלימודים, רישום החלטת בית הספר וחתימות הצוות.", link: `${APP_URL}/forms/short-day` },
];

const DigitalFormsAdmin = () => {
  const [open, setOpen] = useState<FormKey>(null);

  if (open) {
    const card = CARDS.find((c) => c.key === open)!;
    return (
      <div className="space-y-4">
        <button onClick={() => setOpen(null)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
          <ArrowRight className="w-4 h-4" /> חזרה לטפסים הדיגיטליים
        </button>
        <h2 className="font-heading font-bold text-lg">{card.title}</h2>
        {open === "enrollment" ? <EnrollmentFormsAdmin /> : <ShortDayAdmin />}
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">בחרו טופס לניהול. הקישורים הציבורים ניתנים לשליחה להורים בוואטסאפ.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <button key={c.key} onClick={() => setOpen(c.key)}
              className="intake-card-soft text-right hover:border-primary/50 hover:shadow-lg transition-all">
              <div className="flex items-start gap-3">
                <span className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-primary" />
                </span>
                <div className="flex-1">
                  <h3 className="font-heading font-semibold text-base leading-tight mb-1">{c.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-2 break-all">{c.link}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DigitalFormsAdmin;