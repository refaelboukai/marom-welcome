import { Link } from "react-router-dom";
import { ArrowLeft, Clock, FileText } from "lucide-react";
import logo from "@/assets/logo.jpeg";
import moeLogo from "@/assets/moe-logo.jpeg.asset.json";

const FORMS = [
  {
    to: "/enroll",
    icon: FileText,
    title: "טופס קליטה לתלמיד/ה חדש/ה",
    desc: "פרטי התלמיד/ה וההורים, רקע רפואי, הצהרות והסכמות והעלאת מסמכים — נשמר אוטומטית וניתן להוריד כ-PDF.",
    tag: "טופס רב-שלבי",
  },
  {
    to: "/forms/short-day",
    icon: Clock,
    title: "בקשת הורים לקיצור יום לימודים",
    desc: "בקשה לקיצור קבוע של יום הלימודים — שעה וימים מבוקשים, נימוק מקצועי, הצהרת הורים וחתימות.",
    tag: 'שנה"ל תשפ"ז',
  },
];

const DigitalForms = () => (
  <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
    <div className="bg-card border-b border-border">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
        <img src={logo} alt="בית אקשטיין" className="w-11 h-11 rounded-xl object-cover" />
        <div className="flex-1">
          <h1 className="font-heading font-bold text-lg leading-tight">טפסים דיגיטליים</h1>
          <p className="text-[11px] text-muted-foreground">בית ספר מרום — בית אקשטיין יבנה</p>
        </div>
        <img src={moeLogo.url} alt="משרד החינוך" loading="lazy" className="h-10 w-auto object-contain" />
      </div>
    </div>

    <div className="max-w-4xl mx-auto px-4 py-7">
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        בחרו את הטופס שברצונכם למלא. כל טופס נשלח ישירות למזכירות בית הספר וניתן להוריד ממנו עותק PDF.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FORMS.map((f) => {
          const Icon = f.icon;
          return (
            <Link key={f.to} to={f.to}
              className="intake-card-soft group text-right hover:border-primary/50 hover:shadow-lg transition-all">
              <div className="flex items-start gap-3">
                <span className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-primary" />
                </span>
                <div className="flex-1">
                  <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-muted text-muted-foreground mb-1">{f.tag}</span>
                  <h2 className="font-heading font-semibold text-base leading-tight mb-1">{f.title}</h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                למילוי הטופס <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  </div>
);

export default DigitalForms;