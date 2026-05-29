import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createSessionDB } from "@/lib/supabase-storage";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Copy, CheckCircle, Loader2, Plus, MessageCircle } from "lucide-react";
import { openWhatsApp, normalizePhone, WELCOME_MESSAGE } from "@/lib/whatsapp";

const NewIntake = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    studentName: "",
    studentIdNumber: "",
    grade: "",
    intakeDate: new Date().toISOString().split("T")[0],
    parentName: "",
    parentPhone: "",
    studentPhone: "",
    secondParentName: "",
    classGroup: "",
    academicYear: 'תשפ"ו',
    notes: "",
  });
  const [created, setCreated] = useState<{ studentCode: string; parentCode: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [classGroups, setClassGroups] = useState<string[]>(["tali", "eden"]);
  const [classGroupLabels, setClassGroupLabels] = useState<Record<string, string>>({
    tali: "הכיתה של טלי",
    eden: "הכיתה של עדן",
  });
  const [showNewClass, setShowNewClass] = useState(false);
  const [newClassName, setNewClassName] = useState("");

  useEffect(() => {
    const loadClassGroups = async () => {
      const { data } = await supabase
        .from("intake_sessions")
        .select("class_group")
        .not("class_group", "is", null)
        .not("class_group", "eq", "");
      if (data) {
        const unique = [...new Set(data.map((d) => d.class_group!).filter(Boolean))];
        const defaultLabels: Record<string, string> = { tali: "הכיתה של טלי", eden: "הכיתה של עדן" };
        const allGroups = [...new Set(["tali", "eden", ...unique])];
        setClassGroups(allGroups);
        const labels = { ...defaultLabels };
        unique.forEach((g) => { if (!labels[g]) labels[g] = g; });
        setClassGroupLabels(labels);
      }
    };
    loadClassGroups();
  }, []);

  const handleAddClass = () => {
    if (!newClassName.trim()) return;
    const key = newClassName.trim();
    if (!classGroups.includes(key)) {
      setClassGroups((prev) => [...prev, key]);
      setClassGroupLabels((prev) => ({ ...prev, [key]: key }));
    }
    updateField("classGroup", key);
    setNewClassName("");
    setShowNewClass(false);
  };

  const handleSubmit = async () => {
    if (!form.studentName.trim()) return;
    setLoading(true);
    const session = await createSessionDB(form);
    setLoading(false);
    if (session) {
      setCreated({ studentCode: session.studentCode, parentCode: session.parentCode });
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (created) {
    const APP_URL = "https://marom-welcome.vercel.app";
    const parentMessage = `${WELCOME_MESSAGE}\n\nקוד הורה: ${created.parentCode}\nכניסה ישירה: ${APP_URL}/?code=${created.parentCode}`;
    const studentMessage = `${WELCOME_MESSAGE}\n\nקוד תלמיד: ${created.studentCode}\nכניסה ישירה: ${APP_URL}/?code=${created.studentCode}`;
    const parentPhoneValid = !!normalizePhone(form.parentPhone);
    const studentPhoneValid = !!normalizePhone(form.studentPhone);
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md animate-fade-in py-6">
          <div className="intake-card text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/15 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-heading font-bold mb-2">תהליך הקליטה נוצר בהצלחה!</h2>
            <p className="text-sm text-muted-foreground mb-6">{form.studentName}</p>

            <div className="space-y-3 text-right">
              <div className="p-4 bg-muted/50 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">קוד תלמיד</p>
                  <p className="font-mono font-bold" dir="ltr">{created.studentCode}</p>
                </div>
                <button onClick={() => handleCopy(created.studentCode, "student")} className="p-2 rounded-lg hover:bg-muted">
                  {copied === "student" ? <CheckCircle className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">קוד הורה</p>
                  <p className="font-mono font-bold" dir="ltr">{created.parentCode}</p>
                </div>
                <button onClick={() => handleCopy(created.parentCode, "parent")} className="p-2 rounded-lg hover:bg-muted">
                  {copied === "parent" ? <CheckCircle className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* WhatsApp send */}
            <div className="mt-6 text-right space-y-3">
              <div className="flex items-center gap-2 text-success">
                <MessageCircle className="w-4 h-4" />
                <p className="text-sm font-semibold">שליחת הודעת ווטסאפ</p>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">טלפון הורה</label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={form.parentPhone}
                    onChange={(e) => updateField("parentPhone", e.target.value)}
                    placeholder="05X-XXXXXXX"
                    dir="ltr"
                    className="flex-1 bg-card border border-input rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={() => openWhatsApp(form.parentPhone, parentMessage)}
                    disabled={!parentPhoneValid}
                    className="btn-intake bg-success text-success-foreground px-4 py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed gap-1"
                  >
                    <MessageCircle className="w-4 h-4" /> שלח
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">טלפון תלמיד</label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={form.studentPhone}
                    onChange={(e) => updateField("studentPhone", e.target.value)}
                    placeholder="05X-XXXXXXX"
                    dir="ltr"
                    className="flex-1 bg-card border border-input rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={() => openWhatsApp(form.studentPhone, studentMessage)}
                    disabled={!studentPhoneValid}
                    className="btn-intake bg-success text-success-foreground px-4 py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed gap-1"
                  >
                    <MessageCircle className="w-4 h-4" /> שלח
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground leading-relaxed">
                ההודעה תיפתח באפליקציית הווטסאפ במכשיר. נוסח קבוע + קוד הכניסה האישי.
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setCreated(null);
                  setForm({ studentName: "", studentIdNumber: "", grade: "", intakeDate: new Date().toISOString().split("T")[0], parentName: "", parentPhone: "", studentPhone: "", secondParentName: "", classGroup: "", academicYear: 'תשפ"ו', notes: "" });
                }}
                className="btn-intake bg-secondary text-secondary-foreground flex-1"
              >
                הוסף תלמיד נוסף
              </button>
              <button onClick={() => navigate("/admin")} className="btn-intake bg-primary text-primary-foreground flex-1">
                חזרה לדשבורד
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const fields = [
    { key: "studentName", label: "שם התלמיד/ה", required: true, type: "text" },
    { key: "studentIdNumber", label: "תעודת זהות", required: false, type: "text" },
    { key: "grade", label: "כיתה / שכבה", required: false, type: "text" },
    { key: "intakeDate", label: "תאריך קליטה", required: false, type: "date" },
    { key: "parentName", label: "שם הורה", required: false, type: "text" },
    { key: "parentPhone", label: "טלפון הורה", required: false, type: "tel" },
    { key: "studentPhone", label: "טלפון תלמיד (לשליחת ווטסאפ)", required: false, type: "tel" },
    { key: "secondParentName", label: "הורה נוסף (אופציונלי)", required: false, type: "text" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/admin")} className="p-2 rounded-lg hover:bg-muted">
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-heading font-bold">קליטת תלמיד חדש</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="space-y-4">
          {fields.map(({ key, label, required, type }) => (
            <div key={key}>
              <label className="block text-sm font-medium mb-1.5">
                {label} {required && <span className="text-destructive">*</span>}
              </label>
              <input
                type={type}
                value={(form as any)[key]}
                onChange={(e) => updateField(key, e.target.value)}
                className="w-full bg-card border border-input rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}

          {/* Class group selector */}
          <div>
            <label className="block text-sm font-medium mb-1.5">כיתה / קבוצה</label>
            <div className="flex gap-2">
              <select value={form.classGroup} onChange={(e) => updateField("classGroup", e.target.value)}
                className="flex-1 bg-card border border-input rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">ללא שיוך</option>
                {classGroups.map((g) => (
                  <option key={g} value={g}>{classGroupLabels[g] || g}</option>
                ))}
              </select>
              <button type="button" onClick={() => setShowNewClass(!showNewClass)}
                className="p-3 rounded-xl border border-input bg-card hover:bg-muted transition-colors"
                title="הוסף כיתה חדשה">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {showNewClass && (
              <div className="mt-2 flex gap-2 animate-fade-in">
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="שם הכיתה החדשה..."
                  className="flex-1 bg-card border border-input rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  onKeyDown={(e) => e.key === "Enter" && handleAddClass()}
                />
                <button type="button" onClick={handleAddClass}
                  disabled={!newClassName.trim()}
                  className="px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm disabled:opacity-50">
                  הוסף
                </button>
              </div>
            )}
          </div>

          {/* Academic year selector */}
          <div>
            <label className="block text-sm font-medium mb-1.5">שנת לימודים</label>
            <select value={form.academicYear} onChange={(e) => updateField("academicYear", e.target.value)}
              className="w-full bg-card border border-input rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value='תשפ"ו'>תשפ״ו</option>
              <option value='תשפ"ז'>תשפ״ז</option>
              <option value='תשפ"ח'>תשפ״ח</option>
              <option value='תשפ"ט'>תשפ״ט</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">הערות</label>
            <textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)}
              className="w-full bg-card border border-input rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3} placeholder="הערות נוספות..." />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!form.studentName.trim() || loading}
            className={`btn-intake w-full text-lg py-4 flex items-center justify-center gap-2 ${
              form.studentName.trim() && !loading ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> יוצר...</> : "פתח תהליך קליטה"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewIntake;
