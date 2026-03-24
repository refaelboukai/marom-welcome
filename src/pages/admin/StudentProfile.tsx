import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSession, updateSession } from "@/lib/storage";
import { IntakeSession, SECTION_LABELS, OPEN_QUESTION_LABELS } from "@/lib/types";
import { calculateScores, generateRiskFlags, getScoreLabel } from "@/lib/scoring";
import StatusBadge from "@/components/StatusBadge";
import { ArrowRight, AlertTriangle, Copy, CheckCircle, Lock, Unlock, FileText } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

const StudentProfile = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<IntakeSession | null>(null);
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const s = getSession(sessionId);
    if (!s) {
      navigate("/admin");
      return;
    }
    setSession(s);
    setNotes(s.adminNotes || "");
  }, [sessionId, navigate]);

  if (!session) return null;

  const scores = calculateScores(session.studentResponses, session.parentResponses);
  const riskFlags = generateRiskFlags(scores);

  const radarData = [
    { subject: "איכות חיים", student: scores.qualityOfLife.studentNormalized, parent: scores.qualityOfLife.parentNormalized },
    { subject: "מסוגלות עצמית", student: scores.selfEfficacy.studentNormalized, parent: scores.selfEfficacy.parentNormalized },
    { subject: "מיקוד שליטה", student: scores.locusOfControl.studentNormalized, parent: scores.locusOfControl.parentNormalized },
    { subject: "גמישות קוגניטיבית", student: scores.cognitiveFlexibility.studentNormalized, parent: scores.cognitiveFlexibility.parentNormalized },
  ].map((d) => ({
    ...d,
    student: d.student >= 0 ? d.student : 0,
    parent: d.parent >= 0 ? d.parent : 0,
  }));

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSaveNotes = () => {
    updateSession(session.id, { adminNotes: notes });
  };

  const handleCloseIntake = () => {
    updateSession(session.id, { status: "completed", closedAt: new Date().toISOString() });
    setSession((prev) => prev ? { ...prev, status: "completed", closedAt: new Date().toISOString() } : null);
  };

  const handleReopenIntake = () => {
    updateSession(session.id, { status: "under_review", closedAt: undefined });
    setSession((prev) => prev ? { ...prev, status: "under_review", closedAt: undefined } : null);
  };

  const scoreCards = [
    { key: "qualityOfLife" as const, label: SECTION_LABELS.quality_of_life },
    { key: "selfEfficacy" as const, label: SECTION_LABELS.self_efficacy },
    { key: "locusOfControl" as const, label: SECTION_LABELS.locus_of_control },
    { key: "cognitiveFlexibility" as const, label: SECTION_LABELS.cognitive_flexibility },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/admin")} className="p-2 rounded-lg hover:bg-muted">
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-heading font-bold">{session.studentName}</h1>
            <div className="flex items-center gap-2">
              <StatusBadge status={session.status} />
              {session.grade && <span className="text-xs text-muted-foreground">כיתה {session.grade}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Codes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="intake-card-soft flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">קוד תלמיד</p>
              <p className="font-mono font-bold text-sm" dir="ltr">{session.studentCode}</p>
            </div>
            <button onClick={() => handleCopy(session.studentCode, "student")} className="p-2 rounded-lg hover:bg-muted">
              {copied === "student" ? <CheckCircle className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>
          <div className="intake-card-soft flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">קוד הורה</p>
              <p className="font-mono font-bold text-sm" dir="ltr">{session.parentCode}</p>
            </div>
            <button onClick={() => handleCopy(session.parentCode, "parent")} className="p-2 rounded-lg hover:bg-muted">
              {copied === "parent" ? <CheckCircle className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>
        </div>

        {/* Radar Chart */}
        {(scores.qualityOfLife.studentNormalized >= 0 || scores.qualityOfLife.parentNormalized >= 0) && (
          <div className="intake-card">
            <h3 className="font-heading font-semibold mb-4">פרופיל תלמיד</h3>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name="תלמיד" dataKey="student" stroke="hsl(165, 35%, 42%)" fill="hsl(165, 35%, 42%)" fillOpacity={0.2} />
                <Radar name="הורה" dataKey="parent" stroke="hsl(200, 60%, 50%)" fill="hsl(200, 60%, 50%)" fillOpacity={0.15} />
              </RadarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 text-xs mt-2">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-primary inline-block" /> תלמיד</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-info inline-block" /> הורה</span>
            </div>
          </div>
        )}

        {/* Score Cards */}
        <div className="grid grid-cols-2 gap-3">
          {scoreCards.map(({ key, label }) => {
            const s = scores[key];
            return (
              <div key={key} className="intake-card-soft text-center">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className="text-2xl font-bold">{s.normalized >= 0 ? s.normalized : "—"}</p>
                <p className="text-xs text-muted-foreground">{getScoreLabel(s.normalized)}</p>
                {s.studentNormalized >= 0 && s.parentNormalized >= 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    תלמיד: {s.studentNormalized} | הורה: {s.parentNormalized}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Risk Flags */}
        {riskFlags.length > 0 && (
          <div className="intake-card border-warning/30">
            <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              דגלי זהירות
            </h3>
            <div className="space-y-2">
              {riskFlags.map((flag, i) => (
                <div key={i} className={`p-3 rounded-xl text-sm ${
                  flag.severity === "urgent" ? "bg-destructive/10" :
                  flag.severity === "concern" ? "bg-warning/10" :
                  "bg-accent"
                }`}>
                  <p className="font-medium text-xs mb-0.5">{flag.domain}</p>
                  <p className="text-muted-foreground text-xs">{flag.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Open-ended Responses */}
        {Object.keys(session.studentOpenResponses).length > 0 && (
          <div className="intake-card">
            <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              תשובות פתוחות
            </h3>
            <div className="space-y-3">
              {Object.entries(session.studentOpenResponses).map(([key, val]) => (
                val ? (
                  <div key={key} className="p-3 bg-muted/50 rounded-xl">
                    <p className="text-xs text-muted-foreground font-medium mb-1">{OPEN_QUESTION_LABELS[key] || key}</p>
                    <p className="text-sm">{val}</p>
                  </div>
                ) : null
              ))}
            </div>
          </div>
        )}

        {/* Admin Notes */}
        <div className="intake-card">
          <h3 className="font-heading font-semibold mb-3">הערות צוות</h3>
          <textarea
            className="w-full bg-background border border-input rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="הוסף הערות..."
          />
          <button
            onClick={handleSaveNotes}
            className="btn-intake bg-secondary text-secondary-foreground text-sm mt-2"
          >
            שמור הערות
          </button>
        </div>

        {/* Close / Reopen */}
        <div className="flex gap-3">
          {session.status !== "completed" ? (
            <button
              onClick={handleCloseIntake}
              className="btn-intake bg-primary text-primary-foreground flex-1 flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              סגור תהליך קליטה
            </button>
          ) : (
            <button
              onClick={handleReopenIntake}
              className="btn-intake bg-secondary text-secondary-foreground flex-1 flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              פתח מחדש
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
