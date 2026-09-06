import { useState } from "react";
import { ArrowRight, Brain, Clock, Eye, FileText, ListChecks, Settings2 } from "lucide-react";
import EnrollmentFormsAdmin from "@/components/EnrollmentFormsAdmin";
import ShortDayAdmin from "@/components/ShortDayAdmin";
import FormEditor from "@/components/FormEditor";
import { APP_URL } from "@/lib/app-url";

type FormKey = "enrollment" | "short-day" | null;
type Tab = "manage" | "edit" | "preview";

const CARDS = [
  { key: "enrollment" as const, icon: FileText, title: "טופס קליטה לתלמיד/ה חדש/ה", desc: "שליחת הזמנות להורים, מעקב אחר מילוי הטופס, צפייה במסמכים והפקת PDF.", link: `${APP_URL}/enroll` },
  { key: "short-day" as const, icon: Clock, title: "בקשה לקיצור יום לימודים", desc: "בקשות הורים לקיצור יום הלימודים, רישום החלטת בית הספר וחתימות הצוות.", link: `${APP_URL}/forms/short-day` },
];

const STAFF_LINK = `${APP_URL}/forms/staff-reflection`;

const DigitalFormsAdmin = () => {
  const [open, setOpen] = useState<FormKey>(null);
  const [tab, setTab] = useState<Tab>("manage");

  if (open) {
    const card = CARDS.find((c) => c.key === open)!;
    const previewUrl = open === "enrollment" ? "/enroll" : "/forms/short-day";
    return (
      <div className="space-y-4">
        <button onClick={() => { setOpen(null); setTab("manage"); }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
          <ArrowRight className="w-4 h-4" /> חזרה לטפסים הדיגיטליים
        </button>
        <h2 className="font-heading font-bold text-lg">{card.title}</h2>
        <div className="flex flex-wrap gap-2">
          {([["manage", "ניהול ושליחה", ListChecks], ["edit", "עריכת הטופס", Settings2], ["preview", "תצוגה מקדימה", Eye]] as const).map(([k, l, Icon]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium border-2 transition-all inline-flex items-center gap-1.5 ${
                tab === k ? "bg-primary text-primary-foreground border-primary shadow-md" : "bg-card border-border hover:border-primary/40"}`}>
              <Icon className="w-4 h-4" /> {l}
            </button>
          ))}
        </div>
        {tab === "manage" && (open === "enrollment" ? <EnrollmentFormsAdmin /> : <ShortDayAdmin />)}
        {tab === "edit" && <FormEditor form={open} />}
        {tab === "preview" && (
          <div className="rounded-2xl border-2 border-border overflow-hidden bg-card">
            <iframe title="תצוגה מקדימה" src={previewUrl} className="w-full h-[75vh]" />
          </div>
        )}
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
        <a href={STAFF_LINK} target="_blank" rel="noreferrer"
          className="intake-card-soft text-right hover:border-primary/50 hover:shadow-lg transition-all block">
          <div className="flex items-start gap-3">
            <span className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Brain className="w-6 h-6 text-primary" />
            </span>
            <div className="flex-1">
              <h3 className="font-heading font-semibold text-base leading-tight mb-1">שאלון רפלקציה אישי — אנשי צוות</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">גמישות מחשבתית, מיקוד שליטה ומסוגלות עצמית — עם תמונת מצב אישית, דירוגים והמלצות להורדה. לשליחה לצוות בוואטסאפ.</p>
              <p className="text-[10px] text-muted-foreground/70 mt-2 break-all">{STAFF_LINK}</p>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
};

export default DigitalFormsAdmin;