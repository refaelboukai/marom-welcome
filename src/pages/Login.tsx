import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { findSessionByCodeDB, isAdminCode, initializeSessionsDB } from "@/lib/supabase-storage";
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

    if (isAdminCode(trimmed)) {
      navigate("/admin");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await findSessionByCodeDB(trimmed);
      if (result) {
        if (result.role === "student") {
          navigate(`/student/${result.session.id}`);
        } else {
          navigate(`/parent/${result.session.id}`);
        }
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm animate-fade-in text-center">
        <img src={logo} alt="מרום בית אקשטיין" className="h-20 mx-auto mb-6 rounded-2xl shadow-sm" />
        <h1 className="text-2xl font-heading font-bold mb-1">מרום בית אקשטיין</h1>
        <p className="text-muted-foreground text-sm mb-8">מערכת קליטה והערכה</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-right">הזן קוד גישה</label>
            <input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(""); }}
              placeholder="הזן את הקוד שקיבלת"
              className="w-full bg-card border border-input rounded-2xl px-4 py-3 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-ring"
              dir="ltr"
              autoFocus
              disabled={loading}
            />
          </div>
          {error && (
            <p className="text-destructive text-sm animate-fade-in">{error}</p>
          )}
          <button
            type="submit"
            disabled={!code.trim() || loading || !initialized}
            className={`btn-intake w-full text-lg py-4 flex items-center justify-center gap-2 ${
              code.trim() && !loading
                ? "bg-primary text-primary-foreground shadow-md hover:shadow-lg"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                מתחבר...
              </>
            ) : (
              "כניסה"
            )}
          </button>
        </form>

        <p className="text-xs text-muted-foreground mt-6">
          קוד הגישה ניתן על ידי צוות בית הספר
        </p>
      </div>
    </div>
  );
};

export default Login;
