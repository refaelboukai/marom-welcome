import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import LikertScale from "@/components/LikertScale";
import { renderHTMLToPDF } from "@/lib/pdf-export";
import logo from "@/assets/logo.jpeg";
import {
  STAFF_QOL_ITEMS,
  STAFF_QOL_DOMAINS,
  computeStaffQolResults,
} from "@/data/staff-qol";
import { Brain, Compass, Sparkles, Heart, Users, Activity, Wallet, ShieldCheck, ChevronRight, Download, Loader2, RotateCcw, CheckCircle2 } from "lucide-react";

const ITEMS_PER_PAGE = 4;
const TOTAL_PAGES = Math.ceil(STAFF_QOL_ITEMS.length / ITEMS_PER_PAGE);

const DOMAIN_ICONS = { emotional: Heart, interpersonal: Users, material: Wallet, development: Sparkles, physical: Activity, self_determination: Compass, inclusion: Brain, rights: ShieldCheck } as const;

const StaffQolAssessment = () => {
  const [stage, setStage] = useState<"intro" | "quiz" | "results">("intro");
  const [name, setName] = useState("");
  const [page, setPage] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [exporting, setExporting] = useState(false);

  const results = useMemo(() => computeStaffQolResults(responses), [responses]);
  const pageItems = STAFF_QOL_ITEMS.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const pageDone = pageItems.every((i) => typeof responses[i.id] === "number");

  const handleDownload = async () => {
    setExporting(true);
    try {
      const cards = results.domains
        .map(
          (d) => `
        <div data-section style="background:#fff;border:1px solid #e2ebe7;border-right:6px solid ${d.color};border-radius:12px;padding:16px 18px;margin-bottom:14px;page-break-inside:avoid;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <h3 style="margin:0;font-size:17px;font-weight:800;color:#173f33;">${d.label}</h3>
            <span style="font-size:13px;font-weight:800;color:${d.color};">${d.score.toFixed(2)} / 5 · ${d.level}</span>
          </div>
          <div style="height:9px;border-radius:9px;background:#eef3f1;overflow:hidden;margin-bottom:10px;">
            <div style="height:9px;width:${d.percent}%;background:${d.color};border-radius:9px;"></div>
          </div>
          <p style="margin:0 0 8px 0;font-size:13px;line-height:1.7;color:#33443f;">${d.levelText}</p>
          <p style="margin:0 0 6px 0;font-size:12px;color:#4c635c;"><b>נקודות חוזק:</b> ${d.topItems.join(" · ")}</p>
          <p style="margin:0 0 10px 0;font-size:12px;color:#4c635c;"><b>מוקדי צמיחה:</b> ${d.growthItems.join(" · ")}</p>
          <div style="background:#f6faf8;border-radius:9px;padding:10px 12px;">
            <b style="font-size:12px;color:#173f33;">המלצות מעשיות</b>
            <ul style="margin:6px 0 0 0;padding-inline-start:18px;font-size:12px;line-height:1.7;color:#33443f;">
              ${d.recommendations.map((r) => `<li>${r}</li>`).join("")}
            </ul>
          </div>
        </div>`
        )
        .join("");

      const html = `
      <div style="font-family:'Assistant','Heebo',Arial,sans-serif;direction:rtl;padding:34px 30px;background:#f4f9f6;color:#1a2b26;">
        <div data-section style="text-align:center;border-bottom:3px solid #4a9a7a;padding-bottom:16px;margin-bottom:20px;">
          <img src="${logo}" style="width:76px;height:76px;object-fit:contain;margin:0 auto 8px;display:block;" onerror="this.style.display='none'" />
          <h1 style="margin:0;font-size:23px;font-weight:800;color:#173f33;">איכות חיים — תמונת מצב אישית לאנשי צוות</h1>
          <p style="margin:6px 0 0;font-size:13px;color:#4a9a7a;font-weight:700;">${STAFF_QOL_DOMAINS.map((d) => d.label).join(" · ")}</p>
          <p style="margin:6px 0 0;font-size:11px;color:#777;">${name ? name + " · " : ""}${new Date().toLocaleDateString("he-IL")}</p>
        </div>
        <div data-section style="background:#fff;border-radius:12px;padding:14px 16px;margin-bottom:14px;text-align:center;">
          <p style="margin:0;font-size:13px;color:#33443f;">ציון כולל: <b style="font-size:16px;color:#4a9a7a;">${results.overall.toFixed(2)} / 5</b></p>
        </div>
        ${cards}
        <div data-section style="margin-top:14px;text-align:center;font-size:11px;color:#777;border-top:1px solid #dce8e2;padding-top:10px;">
          דיווח עצמי לפי שמונת ממדי איכות החיים, בניסוח מותאם לצוות. אינו שאלון מדידה מתוקף ואינו אבחון. מרום — בית אקשטיין יבנה.
        </div>
      </div>`;

      await renderHTMLToPDF(html, `איכות_חיים_צוות${name ? "_" + name : ""}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  /* ---------- INTRO ---------- */
  if (stage === "intro") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="text-center mb-7">
            <img src={logo} alt="מרום" className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3" />
            <h1 className="font-heading font-bold text-2xl leading-tight">שאלון איכות חיים לאנשי צוות</h1>
            <p className="text-sm text-primary mt-2">שמונת ממדי איכות החיים · החיים האישיים וסביבת העבודה</p>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {STAFF_QOL_ITEMS.length} היגדים קצרים · כ-7 דקות · התוצאות מוצגות לך בלבד ואינן נשמרות במערכת.
            </p>
          </div>

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 mb-6">
            {STAFF_QOL_DOMAINS.map((d) => {
              const Icon = DOMAIN_ICONS[d.key];
              return (
                <div key={d.key} className="intake-card-soft">
                  <Icon className="w-6 h-6 text-primary mb-2" />
                  <h2 className="font-heading font-semibold text-sm mb-1">{d.label}</h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">{d.short}</p>
                </div>
              );
            })}
          </div>

          <div className="intake-card-soft mb-5">
            <label className="block text-sm font-medium mb-2">שם (לא חובה — יופיע רק בקובץ שתורידו)</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full bg-background border border-input rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="שם פרטי ומשפחה" />
          </div>

          <Button onClick={() => setStage("quiz")} className="btn-intake bg-primary text-primary-foreground w-full shadow-md">
            להתחלת השאלון
          </Button>
        </div>
      </div>
    );
  }

  /* ---------- QUIZ ---------- */
  if (stage === "quiz") {
    const answered = Object.keys(responses).length;
    return (
      <div className="min-h-screen bg-background py-6">
        <div className="max-w-lg mx-auto px-4 pb-10">
          <div className="flex items-center gap-2 mb-4">
            <img src={logo} alt="מרום" className="h-9 rounded-lg" />
            <div>
              <p className="text-xs text-muted-foreground">{STAFF_QOL_DOMAINS.find((d) => d.key === pageItems[0]?.domain)?.label}</p>
              <p className="font-heading font-bold text-sm">{name || "איש/אשת צוות"}</p>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>שאלה {Math.min(answered + 1, STAFF_QOL_ITEMS.length)} מתוך {STAFF_QOL_ITEMS.length}</span>
              <span>{Math.round((answered / STAFF_QOL_ITEMS.length) * 100)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(answered / STAFF_QOL_ITEMS.length) * 100}%` }} />
            </div>
          </div>

          <div className="space-y-2">
            {pageItems.map((item, idx) => (
              <LikertScale
                key={item.id}
                questionNumber={page * ITEMS_PER_PAGE + idx + 1}
                questionText={item.text}
                value={responses[item.id]}
                onChange={(val) => setResponses((p) => ({ ...p, [item.id]: val }))}
              />
            ))}
          </div>

          <div className="flex gap-3 mt-6">
            {page > 0 && (
              <Button onClick={() => { setPage((p) => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="btn-intake bg-secondary text-secondary-foreground flex-1">חזרה</Button>
            )}
            <Button
              disabled={!pageDone}
              onClick={() => {
                if (page < TOTAL_PAGES - 1) { setPage((p) => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }
                else { setStage("results"); window.scrollTo({ top: 0 }); }
              }}
              className={`btn-intake flex-1 ${pageDone ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
              {page === TOTAL_PAGES - 1 ? "הצג תוצאות" : "המשך"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- RESULTS ---------- */
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background py-8">
      <div className="max-w-2xl mx-auto px-4 pb-12 animate-fade-in">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-7 h-7 text-success" />
          </div>
          <h1 className="font-heading font-bold text-2xl">תמונת המצב האישית שלך</h1>
          <p className="text-sm text-muted-foreground mt-1">{name ? `${name} · ` : ""}ציון כולל {results.overall.toFixed(2)} מתוך 5</p>
        </div>

        <div className="space-y-4">
          {results.domains.map((d) => {
            const Icon = DOMAIN_ICONS[d.key];
            return (
              <div key={d.key} className="intake-card border-r-4" style={{ borderRightColor: d.color }}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h2 className="font-heading font-semibold flex items-center gap-2 text-base">
                    <Icon className="w-5 h-5" style={{ color: d.color }} /> {d.label}
                  </h2>
                  <span className="text-sm font-bold" style={{ color: d.color }}>{d.score.toFixed(2)} · {d.level}</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden mb-3">
                  <div className="h-full rounded-full transition-all" style={{ width: `${d.percent}%`, background: d.color }} />
                </div>
                <p className="text-sm leading-relaxed mb-3">{d.levelText}</p>
                <p className="text-xs text-muted-foreground mb-3">{d.description}</p>

                <div className="grid sm:grid-cols-2 gap-3 mb-3">
                  <div className="p-3 rounded-xl bg-success/5 border border-success/10">
                    <p className="text-xs font-semibold text-success mb-1">נקודות חוזק</p>
                    <ul className="space-y-1">
                      {d.topItems.map((t, i) => <li key={i} className="text-xs text-muted-foreground">• {t}</li>)}
                    </ul>
                  </div>
                  <div className="p-3 rounded-xl bg-warning/5 border border-warning/10">
                    <p className="text-xs font-semibold text-warning mb-1">מוקדי צמיחה</p>
                    <ul className="space-y-1">
                      {d.growthItems.map((t, i) => <li key={i} className="text-xs text-muted-foreground">• {t}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/40">
                  <p className="text-xs font-semibold mb-2">המלצות מעשיות</p>
                  <div className="space-y-1.5">
                    {d.recommendations.map((r, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-xs font-bold text-primary w-4 flex-shrink-0">{i + 1}.</span>
                        <p className="text-xs leading-relaxed">{r}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button onClick={handleDownload} disabled={exporting} className="btn-intake bg-primary text-primary-foreground flex-1 gap-2 shadow-md">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} הורדת דוח מעוצב
          </Button>
          <Button onClick={() => { setResponses({}); setPage(0); setStage("intro"); window.scrollTo({ top: 0 }); }}
            className="btn-intake bg-secondary text-secondary-foreground flex-1 gap-2">
            <RotateCcw className="w-4 h-4" /> מילוי מחדש
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground text-center mt-5 leading-relaxed">
          דיווח עצמי לפי שמונת ממדי איכות החיים של Schalock ו־Verdugo, בניסוח מותאם לצוות. אינו שאלון מדידה מתוקף ואינו אבחון. התשובות אינן נשמרות במערכת.
        </p>

        <Button onClick={() => setStage("quiz")} className="mt-4 mx-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronRight className="w-3.5 h-3.5" /> חזרה לשאלון
        </Button>
      </div>
    </div>
  );
};

export default StaffQolAssessment;
