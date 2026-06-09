import { useEffect, useState } from "react";
import { getReminderMessage, saveReminderMessage, DEFAULT_REMINDER_MESSAGE } from "@/lib/supabase-storage";
import { Loader2, Save, RotateCcw, CheckCircle, X, Bell } from "lucide-react";

interface Props {
  onClose: () => void;
}

const ReminderMessageEditor = ({ onClose }: Props) => {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getReminderMessage().then((t) => { setText(t); setLoading(false); });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveReminderMessage(text.trim() || DEFAULT_REMINDER_MESSAGE);
    setSaving(false);
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  };

  const handleReset = () => {
    if (confirm("לאפס לטקסט ברירת המחדל?")) {
      setText(DEFAULT_REMINDER_MESSAGE);
      setSaved(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl max-w-xl w-full max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold">עריכת הודעת תזכורת</h2>
              <p className="text-xs text-muted-foreground">נשלחת לתלמידים/הורים שטרם השלימו את השאלונים</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted" title="סגור"><X className="w-5 h-5" /></button>
        </div>
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <textarea value={text} onChange={(e) => { setText(e.target.value); setSaved(false); }} rows={10}
                className="w-full bg-background border border-input rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed"
                placeholder="טקסט ההודעה..." dir="rtl" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                בסוף ההודעה יתווסף אוטומטית קוד הכניסה האישי וקישור ישיר לאפליקציה.
              </p>
            </div>
            <div className="border-t border-border p-4 flex items-center gap-2">
              <button onClick={handleReset} className="btn-intake bg-muted text-muted-foreground text-sm px-3 py-2 gap-1">
                <RotateCcw className="w-3.5 h-3.5" /> ברירת מחדל
              </button>
              {saved && (<span className="text-xs text-success flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> נשמר</span>)}
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

export default ReminderMessageEditor;