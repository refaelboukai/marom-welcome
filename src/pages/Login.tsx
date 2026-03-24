import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { findSessionByCode, isAdminCode } from "@/lib/storage";
import logo from "@/assets/logo.jpeg";

const Login = () => {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError("יש להזין קוד");
      return;
    }

    if (isAdminCode(trimmed)) {
      navigate("/admin");
      return;
    }

    const result = findSessionByCode(trimmed);
    if (result) {
      const { session, role } = result;
      if (role === "student") {
        navigate(`/student/${session.id}`);
      } else {
        navigate(`/parent/${session.id}`);
      }
      return;
    }

    setError("הקוד שהוזן אינו תקין");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex justify-center mb-8">
          <img src={logo} alt="בית אקשטיין - מרום" className="h-20 object-contain" />
        </div>

        <div className="intake-card text-center">
          <h1 className="text-2xl font-heading font-bold mb-2">מרום בית אקשטיין</h1>
          <p className="text-muted-foreground text-sm mb-6">מערכת קליטת תלמידים</p>

          <div className="space-y-4">
            <div>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="הזן קוד גישה"
                className="w-full text-center text-lg tracking-widest bg-background border-2 border-input rounded-xl p-4 focus:outline-none focus:border-primary transition-colors font-mono"
                dir="ltr"
                autoComplete="off"
              />
            </div>

            {error && (
              <p className="text-destructive text-sm animate-fade-in">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              className="btn-intake w-full bg-primary text-primary-foreground shadow-md hover:shadow-lg text-lg py-4"
            >
              כניסה
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          קבוצת דנאל · לבחור חכם בלב שלם
        </p>
      </div>
    </div>
  );
};

export default Login;
