import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Download, Loader2 } from "lucide-react";
import SignaturePad from "@/components/SignaturePad";
import logo from "@/assets/logo.jpeg";
import { ExitData, LIABILITY, MODE_TEXT, generateExitPDF, getExitByToken, saveExitDraft, submitExit } from "@/lib/exit-consent";

const inp = "w-full px-3 py-2 rounded-xl border-2 border-border bg-card text-sm focus:outline-none focus:border-primary/60";
const today = () => new Date().toISOString().slice(0, 10);

const IndependentExit = () => {
  const [sp] = useSearchParams();
  const token = sp.get("t")?.toLowerCase() || null;
  const [d, setD] = useState<ExitData>({ sign_date: today() });
  const [loading, setLoading] = useState(!!token);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState("");
  const ready = useRef(false);

  useEffect(() => {
    if (!token) return;
    getExitByToken(token).then((r) => {
      if (r) { setD({ sign_date: today(), ...r.data }); if (r.status === "submitted") setDone(true); }
      setLoading(false); setTimeout(() => (ready.current = true), 100);
    });
  }, [token]);

  useEffect(() => {
    if (!token || !ready.current || done) return;
    const t = setTimeout(async () => { await saveExitDraft(token, d); setSaved(new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })); }, 1200);
    return () => clearTimeout(t);
  }, [d, token, done]);

  const set = (k: keyof ExitData, v: unknown) => setD((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e: string[] = [];
    if (!d.student_name?.trim()) e.push("שם התלמיד/ה — חסר");
    if (!/^\d{9}$/.test(d.student_id || "")) e.push(`ת.ז. התלמיד/ה — חייבת להכיל 9 ספרות${d.student_id ? ` (הוזנו ${d.student_id.replace(/\D/g, "").length})` : ""}`);
    if (!d.mode_a && !d.mode_b && !d.mode_c) e.push("יש לסמן לפחות מודל אחד (א/ב/ג)");
    if (d.mode_a && !d.mode_a_way) e.push("מודל א — יש לבחור תחבורה ציבורית או הליכה ברגל");
    if (d.mode_a && !d.from_date) e.push("מודל א — חסר תאריך התחלה");
    if (!d.parent1_name?.trim()) e.push("שם הורה 1 — חסר");
    if (!/^\d{9}$/.test(d.parent1_id || "")) e.push("ת.ז. הורה 1 — חייבת להכיל 9 ספרות");
    if (!d.parent1_signature) e.push("חתימת הורה 1 — חסרה");
    if (d.parent2_id && !/^\d{9}$/.test(d.parent2_id)) e.push("ת.ז. הורה 2 — חייבת להכיל 9 ספרות");
    return e;
  };

  const submit = async () => {
    const e = validate(); setErrors(e);
    if (e.length) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setBusy(true);
    const ok = await submitExit(token, d);
    setBusy(false);
    if (ok) setDone(true); else setErrors(["השליחה נכשלה — נסו שוב"]);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <div className="bg-card border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <img src={logo} alt="בית אקשטיין" className="w-11 h-11 rounded-xl object-cover" />
          <div className="flex-1">
            <h1 className="font-heading font-bold text-base leading-tight">אישור לשחרור תלמיד ללא ליווי הורי וללא הסעה</h1>
            <p className="text-[11px] text-muted-foreground">בית ספר בית אקשטיין, יבנה · לכבוד מחלקת היסעים</p>
          </div>
          {saved && !done && <span className="text-[11px] text-muted-foreground">נשמר {saved}</span>}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {done ? (
          <div className="intake-card-soft text-center py-8 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
            <h2 className="font-heading font-bold text-lg">האישור נשלח לבית הספר</h2>
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 mx-auto max-w-md">
              <p className="text-sm font-semibold text-destructive">יש להוריד את ה-PDF, להדפיס ולאמת את החתימות אצל עו"ד, ולמסור למזכירות.</p>
            </div>
            <button onClick={() => generateExitPDF(d)} className="btn-intake bg-primary text-primary-foreground inline-flex items-center gap-1.5">
              <Download className="w-4 h-4" /> הורדת PDF
            </button>
          </div>
        ) : (<>
          {errors.length > 0 && (
            <div className="rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-4">
              <p className="font-semibold text-sm text-destructive mb-1">יש לתקן את השדות הבאים:</p>
              <ul className="list-disc pr-5 text-sm text-destructive space-y-0.5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
          )}
          <div className="intake-card-soft space-y-3">
            <p className="text-sm">לכבוד: מחלקת היסעים · הנהלת בית ספר בית אקשטיין, יבנה</p>
            <input className={inp} placeholder="לכבוד (שם הפונה במחלקת ההיסעים — לא חובה)" value={d.addressee || ""} onChange={(e) => set("addressee", e.target.value)} />
            <h3 className="font-heading font-semibold">פרטי התלמיד/ה</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <input className={inp} placeholder="שם התלמיד/ה *" value={d.student_name || ""} onChange={(e) => set("student_name", e.target.value)} />
              <input className={inp} inputMode="numeric" maxLength={9} placeholder="ת.ז. (9 ספרות) *" value={d.student_id || ""} onChange={(e) => set("student_id", e.target.value.replace(/\D/g, ""))} />
              <input className={inp} placeholder="כיתה" value={d.grade || ""} onChange={(e) => set("grade", e.target.value)} />
            </div>
          </div>

          <div className="intake-card-soft space-y-3 text-sm leading-relaxed">
            <h3 className="font-heading font-semibold">המודל המבוקש (נא לסמן)</h3>
            <p className="text-muted-foreground">אנו הח"מ, הורי התלמיד/ה, נותנים את הסכמתנו המפורשת לכך כי ילדנו ישוחרר מבית הספר ללא ליווי הורי וללא הסעה או השגחה, ע"פ המודל הבא:</p>
            <label className="flex gap-2 items-start"><input type="checkbox" className="mt-1" checked={!!d.mode_a} onChange={(e) => set("mode_a", e.target.checked)} /><span><b>א.</b> {MODE_TEXT.a}</span></label>
            {d.mode_a && (
              <div className="pr-6 grid sm:grid-cols-2 gap-3">
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5"><input type="radio" checked={d.mode_a_way === "public"} onChange={() => set("mode_a_way", "public")} /> תחבורה ציבורית</label>
                  <label className="flex items-center gap-1.5"><input type="radio" checked={d.mode_a_way === "walk"} onChange={() => set("mode_a_way", "walk")} /> הליכה ברגל</label>
                </div>
                <label className="flex items-center gap-2">מיום <input type="date" className={inp} value={d.from_date || ""} onChange={(e) => set("from_date", e.target.value)} /></label>
              </div>
            )}
            <label className="flex gap-2 items-start"><input type="checkbox" className="mt-1" checked={!!d.mode_b} onChange={(e) => set("mode_b", e.target.checked)} /><span><b>ב.</b> {MODE_TEXT.b}</span></label>
            <label className="flex gap-2 items-start"><input type="checkbox" className="mt-1" checked={!!d.mode_c} onChange={(e) => set("mode_c", e.target.checked)} /><span><b>ג.</b> {MODE_TEXT.c}</span></label>
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3">{LIABILITY}</p>
          </div>

          <div className="intake-card-soft space-y-4">
            <h3 className="font-heading font-semibold">חתימות הורי התלמיד/ה</h3>
            {([1, 2] as const).map((n) => (
              <div key={n} className="space-y-2">
                <p className="text-sm font-medium">הורה {n}{n === 2 ? " (אם רלוונטי)" : " *"}</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input className={inp} placeholder="שם מלא" value={(d as any)[`parent${n}_name`] || ""} onChange={(e) => set(`parent${n}_name` as any, e.target.value)} />
                  <input className={inp} inputMode="numeric" maxLength={9} placeholder="ת.ז." value={(d as any)[`parent${n}_id`] || ""} onChange={(e) => set(`parent${n}_id` as any, e.target.value.replace(/\D/g, ""))} />
                </div>
                <SignaturePad label={`חתימת הורה ${n}`} value={(d as any)[`parent${n}_signature`] || ""} onChange={(v) => set(`parent${n}_signature` as any, v)} />
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm">תאריך <input type="date" className={inp + " max-w-[200px]"} value={d.sign_date || ""} onChange={(e) => set("sign_date", e.target.value)} /></label>
            <p className="text-xs font-semibold text-destructive rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2">לאחר השליחה יש להוריד את ה-PDF ולאמת את החתימות אצל עו"ד (אימות חתימה בלבד).</p>
          </div>

          <button onClick={submit} disabled={busy} className="btn-intake w-full bg-primary text-primary-foreground flex items-center justify-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} שליחת האישור
          </button>
        </>)}
      </div>
    </div>
  );
};

export default IndependentExit;
