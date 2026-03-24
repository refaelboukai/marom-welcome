import { useState, useMemo } from "react";
import { IntakeSession } from "@/lib/types";
import { Copy, CheckCircle, Download, Search, Key } from "lucide-react";
import { exportCodesExcel } from "@/lib/export-utils";

interface CodeManagementProps {
  sessions: IntakeSession[];
}

const CodeManagement = ({ sessions }: CodeManagementProps) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return sessions;
    const q = search.toLowerCase();
    return sessions.filter((s) => s.studentName.toLowerCase().includes(q));
  }, [sessions, search]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-lg flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          ניהול קודים
        </h2>
        <button
          onClick={() => exportCodesExcel(sessions)}
          className="btn-intake bg-secondary text-secondary-foreground text-xs px-3 py-2 gap-1"
        >
          <Download className="w-3.5 h-3.5" />
          ייצוא Excel
        </button>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="חיפוש תלמיד..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-card border border-input rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((s) => (
          <div key={s.id} className="intake-card-soft">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-sm">{s.studentName}</p>
                <p className="text-xs text-muted-foreground">
                  {s.classGroup === "tali" ? "הכיתה של טלי" : s.classGroup === "eden" ? "הכיתה של עדן" : ""}
                  {s.grade ? ` · כיתה ${s.grade}` : ""}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { label: "קוד תלמיד", code: s.studentCode, key: `s-${s.id}`, color: "bg-primary/5 border-primary/20" },
                { label: "קוד הורה", code: s.parentCode, key: `p-${s.id}`, color: "bg-info/5 border-info/20" },
                { label: "קוד צוות", code: s.staffCode || "—", key: `st-${s.id}`, color: "bg-warning/5 border-warning/20" },
              ].map(({ label, code, key, color }) => (
                <div key={key} className={`flex items-center justify-between p-2.5 rounded-xl border ${color}`}>
                  <div>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="font-mono text-xs font-bold" dir="ltr">{code}</p>
                  </div>
                  {code !== "—" && (
                    <button onClick={() => handleCopy(code, key)} className="p-1.5 rounded-lg hover:bg-muted">
                      {copied === key ? <CheckCircle className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CodeManagement;
