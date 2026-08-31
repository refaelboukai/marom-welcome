import { useEffect, useState } from "react";
import { getSchoolRules, saveSchoolRules, DEFAULT_SCHOOL_RULES } from "@/lib/supabase-storage";
import { renderHTMLToPDF } from "@/lib/pdf-export";
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, Save, RotateCcw, CheckCircle, X, BookOpen, Download } from "lucide-react";

interface Props {
  onClose: () => void;
}

const SchoolRulesEditor = ({ onClose }: Props) => {
  const [rules, setRules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSchoolRules().then((r) => { setRules(r); setLoading(false); });
  }, []);

  const update = (i: number, value: string) => {
    setRules((prev) => prev.map((r, idx) => (idx === i ? value : r)));
    setSaved(false);
  };

  const add = () => { setRules((prev) => [...prev, ""]); setSaved(false); };
  const remove = (i: number) => { setRules((prev) => prev.filter((_, idx) => idx !== i)); setSaved(false); };
  const move = (i: number, dir: -1 | 1) => {
    setRules((prev) => {
      const next = [...prev];
      const target = i + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[i], next[target]] = [next[target], next[i]];
      return next;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveSchoolRules(rules);
    setSaving(false);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const handleReset = () => {
    if (confirm("לאפס לכללי ברירת המחדל?")) {
      setRules([...DEFAULT_SCHOOL_RULES]);
      setSaved(false);
    }
  };

  const [exporting, setExporting] = useState(false);
  const handleDownload = async () => {
    const clean = rules.map((r) => r.trim()).filter(Boolean);
    if (clean.length === 0) return;
    setExporting(true);
    try {
      const rows = clean
        .map(
          (rule, i) => `
        <div data-section style="display:flex;gap:14px;align-items:flex-start;background:#fff;border:1px solid #dce8e2;border-right:5px solid #4a9a7a;border-radius:10px;padding:14px 16px;margin-bottom:12px;page-break-inside:avoid;">
          <div style="flex-shrink:0;width:34px;height:34px;border-radius:50%;background:#4a9a7a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;">${i + 1}</div>
          <p style="flex:1;font-size:14px;line-height:1.7;color:#1a2b26;margin:0;">${rule}</p>
        </div>`
        )
        .join("");

      const html = `
      <div style="font-family:'Assistant','Heebo',Arial,sans-serif;direction:rtl;padding:36px 32px;background:#f4f9f6;color:#1a2b26;">
        <div data-section style="text-align:center;border-bottom:3px solid #4a9a7a;padding-bottom:18px;margin-bottom:22px;">
          <img src="${window.location.origin}/logo.png" alt="מרום בית אקשטיין" style="width:84px;height:84px;object-fit:contain;margin:0 auto 10px auto;display:block;" onerror="this.style.display='none'" />
          <h1 style="font-size:24px;font-weight:800;margin:0;color:#173f33;">כללי בית הספר</h1>
          <p style="font-size:14px;color:#4a9a7a;font-weight:700;margin:6px 0 0 0;">מרום — בית אקשטיין יבנה</p>
          <p style="font-size:11px;color:#777;margin:6px 0 0 0;">הופק בתאריך ${new Date().toLocaleDateString("he-IL")}</p>
        </div>
        ${rows}
        <div data-section style="margin-top:20px;text-align:center;font-size:11px;color:#777;border-top:1px solid #dce8e2;padding-top:12px;">
          הכללים נועדו ליצור סביבת למידה בטוחה, מכבדת ומטפחת — לכל תלמידה ותלמיד.
        </div>
      </div>`;

      await renderHTMLToPDF(html, "כללי_בית_הספר.pdf");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold">עריכת כללי בית הספר</h2>
              <p className="text-xs text-muted-foreground">הכללים מוצגים לתלמידים לפני חתימת ההסכמה</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted" title="סגור">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {rules.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">אין כללים — הוסיפו כלל ראשון.</p>
              )}
              {rules.map((rule, i) => (
                <div key={i} className="flex gap-2 items-start group">
                  <div className="flex flex-col gap-1 pt-1">
                    <span className="text-xs font-bold text-primary w-6 text-center">{i + 1}</span>
                    <button onClick={() => move(i, -1)} disabled={i === 0}
                      className="p-1 rounded hover:bg-muted disabled:opacity-30" title="הזז למעלה">
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button onClick={() => move(i, 1)} disabled={i === rules.length - 1}
                      className="p-1 rounded hover:bg-muted disabled:opacity-30" title="הזז למטה">
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                  <textarea
                    value={rule}
                    onChange={(e) => update(i, e.target.value)}
                    rows={2}
                    className="flex-1 bg-background border border-input rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed"
                    placeholder="טקסט הכלל..."
                  />
                  <button onClick={() => remove(i)} className="p-2 rounded-lg text-destructive hover:bg-destructive/10" title="מחק">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button onClick={add} className="w-full mt-2 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-2 transition-all">
                <Plus className="w-4 h-4" /> הוסף כלל חדש
              </button>
            </div>

            <div className="border-t border-border p-4 flex items-center gap-2">
              <button onClick={handleReset} className="btn-intake bg-muted text-muted-foreground text-sm px-3 py-2 gap-1">
                <RotateCcw className="w-3.5 h-3.5" /> ברירת מחדל
              </button>
              {saved && (
                <span className="text-xs text-success flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> נשמר
                </span>
              )}
              <button onClick={handleSave} disabled={saving}
                className="btn-intake bg-primary text-primary-foreground text-sm px-4 py-2 gap-1 mr-auto disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                שמור שינויים
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SchoolRulesEditor;