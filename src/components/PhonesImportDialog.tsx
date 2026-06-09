import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { IntakeSession } from "@/lib/types";
import { updateSessionDB } from "@/lib/supabase-storage";
import { normalizePhone } from "@/lib/whatsapp";
import { Loader2, Upload, X, CheckCircle, AlertTriangle, FileSpreadsheet } from "lucide-react";

interface Props {
  sessions: IntakeSession[];
  onClose: () => void;
  onDone: () => void;
}

type Row = {
  rawName: string;
  rawId: string;
  parentPhone: string;
  studentPhone: string;
};

type MatchedRow = Row & {
  session: IntakeSession | null;
  reason?: string;
};

const normalize = (s: string) => (s || "").toString().trim().toLowerCase().replace(/\s+/g, " ");

const findCol = (keys: string[], candidates: string[]) => {
  const lower = keys.map((k) => k.toLowerCase().trim());
  for (const c of candidates) {
    const i = lower.indexOf(c.toLowerCase());
    if (i >= 0) return keys[i];
  }
  // partial match
  for (let i = 0; i < lower.length; i++) {
    if (candidates.some((c) => lower[i].includes(c.toLowerCase()))) return keys[i];
  }
  return null;
};

const PhonesImportDialog = ({ sessions, onClose, onDone }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string>("");
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<{ updated: number; skipped: number } | null>(null);

  const handleFile = async (file: File) => {
    setError(""); setResult(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (json.length === 0) { setError("הקובץ ריק"); return; }
      const keys = Object.keys(json[0]);
      const nameCol = findCol(keys, ["שם", "שם תלמיד", "name", "student", "תלמיד"]);
      const idCol = findCol(keys, ["ת.ז", "תז", "תעודת זהות", "id", "id_number", "ת\"ז"]);
      const parentPhoneCol = findCol(keys, ["טלפון הורה", "הורה", "parent", "parent_phone", "phone_parent"]);
      const studentPhoneCol = findCol(keys, ["טלפון תלמיד", "תלמיד", "student_phone", "phone", "טלפון"]);
      if (!nameCol && !idCol) { setError("חסר עמודת שם או ת.ז בקובץ"); return; }
      if (!parentPhoneCol && !studentPhoneCol) { setError("חסר עמודת טלפון בקובץ"); return; }
      const parsed: Row[] = json.map((r) => ({
        rawName: nameCol ? String(r[nameCol] ?? "") : "",
        rawId: idCol ? String(r[idCol] ?? "") : "",
        parentPhone: parentPhoneCol ? String(r[parentPhoneCol] ?? "") : "",
        studentPhone: studentPhoneCol && studentPhoneCol !== parentPhoneCol ? String(r[studentPhoneCol] ?? "") : "",
      })).filter((r) => (r.rawName || r.rawId) && (r.parentPhone || r.studentPhone));
      setRows(parsed);
    } catch (e: any) {
      setError("שגיאה בקריאת הקובץ: " + (e?.message || e));
    }
  };

  const matched: MatchedRow[] = useMemo(() => {
    const byId = new Map<string, IntakeSession>();
    const byName = new Map<string, IntakeSession>();
    for (const s of sessions) {
      if (s.studentIdNumber) byId.set(s.studentIdNumber.trim(), s);
      if (s.studentName) byName.set(normalize(s.studentName), s);
    }
    return rows.map((r) => {
      let session: IntakeSession | null = null;
      if (r.rawId && byId.has(r.rawId.trim())) session = byId.get(r.rawId.trim())!;
      else if (r.rawName && byName.has(normalize(r.rawName))) session = byName.get(normalize(r.rawName))!;
      const reason = !session ? "לא נמצאה התאמה במערכת" : undefined;
      return { ...r, session, reason };
    });
  }, [rows, sessions]);

  const counts = useMemo(() => {
    const m = matched.filter((r) => r.session).length;
    return { matched: m, unmatched: matched.length - m };
  }, [matched]);

  const handleApply = async () => {
    setApplying(true);
    let updated = 0, skipped = 0;
    for (const r of matched) {
      if (!r.session) { skipped++; continue; }
      const update: any = {};
      if (r.parentPhone && normalizePhone(r.parentPhone)) update.parentPhone = r.parentPhone.trim();
      if (r.studentPhone && normalizePhone(r.studentPhone)) update.studentPhone = r.studentPhone.trim();
      if (Object.keys(update).length === 0) { skipped++; continue; }
      const res = await updateSessionDB(r.session.id, update);
      if (res) updated++; else skipped++;
    }
    setApplying(false);
    setResult({ updated, skipped });
    onDone();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !applying && onClose()}>
      <div className="bg-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-info/10 text-info flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold">ייבוא טלפונים מקובץ</h2>
              <p className="text-xs text-muted-foreground">Excel / CSV — שיוך לפי ת.ז או שם</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted" title="סגור"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="text-xs text-muted-foreground bg-muted/40 rounded-xl p-3 leading-relaxed">
            יש לכלול לפחות עמודת זיהוי (<b>שם תלמיד</b> או <b>ת.ז</b>) ועמודת טלפון (<b>טלפון הורה</b> ו/או <b>טלפון תלמיד</b>).
            ההתאמה מתבצעת קודם לפי ת.ז ואחר כך לפי שם מלא.
          </div>

          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <button onClick={() => fileRef.current?.click()} className="btn-intake bg-info text-info-foreground w-full py-3 gap-2 justify-center">
            <Upload className="w-4 h-4" /> בחר קובץ
          </button>

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>}

          {matched.length > 0 && (
            <>
              <div className="flex gap-3 text-sm">
                <span className="flex items-center gap-1 text-success"><CheckCircle className="w-4 h-4" /> {counts.matched} נמצאו</span>
                {counts.unmatched > 0 && <span className="flex items-center gap-1 text-warning"><AlertTriangle className="w-4 h-4" /> {counts.unmatched} ללא התאמה</span>}
              </div>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="text-right px-2 py-2">שם / ת.ז</th>
                      <th className="text-right px-2 py-2">טלפון הורה</th>
                      <th className="text-right px-2 py-2">טלפון תלמיד</th>
                      <th className="text-right px-2 py-2">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matched.map((r, i) => (
                      <tr key={i} className={`border-t border-border ${!r.session ? "bg-warning/5" : ""}`}>
                        <td className="px-2 py-1.5">{r.rawName || r.rawId}</td>
                        <td className="px-2 py-1.5" dir="ltr">{r.parentPhone || "—"}</td>
                        <td className="px-2 py-1.5" dir="ltr">{r.studentPhone || "—"}</td>
                        <td className="px-2 py-1.5">{r.session ? <span className="text-success">{r.session.studentName}</span> : <span className="text-warning">{r.reason}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {result && (
            <p className="text-sm text-success text-center bg-success/10 rounded-lg py-2">
              עודכנו {result.updated} תלמידים{result.skipped ? ` · דולגו ${result.skipped}` : ""}
            </p>
          )}
        </div>

        <div className="border-t border-border p-4 flex items-center gap-2">
          <button onClick={onClose} disabled={applying} className="btn-intake bg-muted text-muted-foreground flex-1">סגור</button>
          <button onClick={handleApply} disabled={applying || counts.matched === 0}
            className="btn-intake bg-primary text-primary-foreground flex-1 disabled:opacity-50">
            {applying ? <><Loader2 className="w-4 h-4 animate-spin inline ml-1" /> מעדכן...</> : `עדכן ${counts.matched} תלמידים`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhonesImportDialog;