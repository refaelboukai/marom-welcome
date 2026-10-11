import { useEffect, useState } from "react";
import { Download, Loader2, RefreshCw, Trash2 } from "lucide-react";
import {
  InclusionConsent, RETURN_DESTINATIONS,
  deleteInclusionConsent, generateInclusionConsentPDF, getInclusionConsents,
} from "@/lib/inclusion-consent";

const heDate = (d?: string | null) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString("he-IL");
};

const InclusionAdmin = () => {
  const [rows, setRows] = useState<InclusionConsent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError("");
    try { setRows(await getInclusionConsents()); }
    catch (e: any) { setError(e?.message || "טעינה נכשלה"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const pdf = async (r: InclusionConsent) => {
    setBusyId(r.id);
    try { await generateInclusionConsentPDF(r, { compact: true }); }
    catch (e) { console.error("inclusion pdf failed", e); }
    finally { setBusyId(null); }
  };

  const remove = async (r: InclusionConsent) => {
    if (!window.confirm(`למחוק את האישור של ${r.student_name}?`)) return;
    setBusyId(r.id);
    await deleteInclusionConsent(r.id);
    setBusyId(null);
    load();
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{rows.length} אישורים התקבלו</p>
        <button onClick={load} className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
          <RefreshCw className="w-3.5 h-3.5" /> רענון
        </button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {rows.length === 0 && !error && (
        <div className="intake-card-soft text-center py-8 text-sm text-muted-foreground">
          עדיין לא התקבלו אישורים. שלחו להורים את הקישור הציבורי של הטופס.
        </div>
      )}
      {rows.map((r) => (
        <div key={r.id} className="intake-card-soft flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <p className="font-heading font-semibold text-sm">{r.student_name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              כיתה {r.grade} · שילוב ב{r.receiving_school} · יום {r.inclusion_day} {r.inclusion_hours}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              הוגש: {heDate(r.created_at)} · יעד חזרה: {RETURN_DESTINATIONS[r.return_destination] || "—"}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => pdf(r)} disabled={busyId === r.id}
              className="btn-intake bg-primary text-primary-foreground text-xs flex items-center gap-1.5 disabled:opacity-60">
              {busyId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PDF
            </button>
            <button onClick={() => remove(r)} disabled={busyId === r.id}
              className="p-2 rounded-xl text-destructive hover:bg-destructive/10" title="מחיקה">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default InclusionAdmin;
