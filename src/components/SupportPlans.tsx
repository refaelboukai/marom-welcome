import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Heart, CheckCircle } from "lucide-react";

interface SupportPlan {
  id: string;
  session_id: string;
  domain: string;
  description: string;
  status: string;
  created_at: string;
}

interface Props {
  sessionId: string;
}

const DOMAIN_OPTIONS = [
  "איכות חיים",
  "מסוגלות עצמית",
  "מיקוד שליטה",
  "גמישות קוגניטיבית",
  "רגשי",
  "חברתי",
  "לימודי",
  "משפחתי",
  "אחר",
];

const SupportPlans = ({ sessionId }: Props) => {
  const [plans, setPlans] = useState<SupportPlan[]>([]);
  const [newDomain, setNewDomain] = useState(DOMAIN_OPTIONS[0]);
  const [newDescription, setNewDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const loadPlans = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("support_plans")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (data) setPlans(data as SupportPlan[]);
  }, [sessionId]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const handleAdd = async () => {
    if (!newDescription.trim()) return;
    setSaving(true);
    await (supabase as any).from("support_plans").insert({
      session_id: sessionId,
      domain: newDomain,
      description: newDescription.trim(),
    });
    setNewDescription("");
    await loadPlans();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from("support_plans").delete().eq("id", id);
    setPlans((prev) => prev.filter((p) => p.id !== id));
  };

  const handleToggleStatus = async (plan: SupportPlan) => {
    const newStatus = plan.status === "active" ? "completed" : "active";
    await (supabase as any).from("support_plans").update({ status: newStatus }).eq("id", plan.id);
    setPlans((prev) => prev.map((p) => p.id === plan.id ? { ...p, status: newStatus } : p));
  };

  return (
    <div className="intake-card">
      <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
        <Heart className="w-5 h-5 text-primary" />
        תכנית תמיכות אישית
      </h3>

      {plans.length > 0 && (
        <div className="space-y-2 mb-4">
          {plans.map((plan) => (
            <div key={plan.id} className={`flex items-start gap-2 p-3 rounded-xl text-sm ${plan.status === "completed" ? "bg-success/5 border border-success/20" : "bg-muted/30 border border-border/50"}`}>
              <button onClick={() => handleToggleStatus(plan)} className="mt-0.5 flex-shrink-0">
                <CheckCircle className={`w-4 h-4 ${plan.status === "completed" ? "text-success" : "text-muted-foreground/40"}`} />
              </button>
              <div className="flex-1 min-w-0">
                <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary mb-1">{plan.domain}</span>
                <p className={`text-sm ${plan.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{plan.description}</p>
              </div>
              <button onClick={() => handleDelete(plan.id)} className="p-1 rounded-lg hover:bg-destructive/10 flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5 text-destructive/60" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 p-3 bg-muted/20 rounded-xl border border-border/30">
        <select value={newDomain} onChange={(e) => setNewDomain(e.target.value)}
          className="bg-card border border-input rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring">
          {DOMAIN_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <textarea
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="תאר את התמיכה המוצעת..."
          className="w-full bg-card border border-input rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          rows={2}
        />
        <button onClick={handleAdd} disabled={saving || !newDescription.trim()}
          className="btn-intake bg-primary text-primary-foreground text-xs px-4 py-2 gap-1 disabled:opacity-50">
          <Plus className="w-3.5 h-3.5" /> הוסף תמיכה
        </button>
      </div>
    </div>
  );
};

export default SupportPlans;
