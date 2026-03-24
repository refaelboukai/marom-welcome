import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { findSessionByCodeDB, isAdminCode, initializeSessionsDB } from "@/lib/supabase-storage";
import { STAFF_CODE } from "@/data/students";
import logo from "@/assets/logo.jpeg";
import { Loader2 } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    initializeSessionsDB().then(() => setInitialized(true));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    if (isAdminCode(trimmed)) { navigate("/admin"); return; }
    if (trimmed === STAFF_CODE) { navigate("/staff"); return; }

    setLoading(true);
    setError("");

    try {
      const result = await findSessionByCodeDB(trimmed);
      if (result) {
        navigate(result.role === "student" ? `/student/${result.session.id}` : `/parent/${result.session.id}`);
      } else {
        setError("הקוד שהוזן אינו תקין. נסה שוב.");
      }
    } catch {
      setError("שגיאה בחיבור לשרת. נסה שוב.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-background via-background to-primary/5">
      <div className="w-full max-w-sm animate-fade-in text-center">
        <img src={logo} alt="מרום בית אקשטיין" className="h-28 mx-auto mb-6 rounded-3xl shadow-lg ring-4 ring-primary/10" />
        <h1 className="text-3xl font-heading font-bold mb-1 bg-gradient-to-l from-primary to-primary/70 bg-clip-text text-transparent">מרום בית אקשטיין</h1>
        <p className="text-muted-foreground text-sm mb-8">מערכת קליטה, הערכה ומיפוי</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-right">הזן קוד גישה</label>
            <input
              type="text" value={code}
              onChange={(e) => { setCode(e.target.value); setError(""); }}
              placeholder="הזן את הקוד שקיבלת"
              className="w-full bg-card border-2 border-input rounded-2xl px-4 py-4 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              dir="ltr" autoFocus disabled={loading}
            />
          </div>
          {error && <p className="text-destructive text-sm animate-fade-in">{error}</p>}
          <button type="submit" disabled={!code.trim() || loading || !initialized}
            className={`btn-intake w-full text-lg py-4 flex items-center justify-center gap-2 shadow-lg ${
              code.trim() && !loading ? "bg-primary text-primary-foreground hover:shadow-xl hover:scale-[1.01] transition-all" : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}>
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" />מתחבר...</> : "כניסה"}
          </button>
        </form>
        <p className="text-xs text-muted-foreground mt-6">קוד הגישה ניתן על ידי צוות בית הספר</p>
      </div>
    </div>
  );
};

export default Login;
