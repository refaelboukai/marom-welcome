import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowRight, Eye, Loader2, LogOut, MessageCircleHeart, PenLine, Send, Users, HeartHandshake, Wrench, Flag } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.jpeg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { coachApi, coachStream, MODE_LABELS, TOKEN_KEY } from "@/lib/parent-coach";
import { copyText } from "@/lib/clipboard";
import { genderize } from "@/lib/genderize";

type Msg = { role: "user" | "assistant"; content: string };
type Conv = { id: string; mode: string; title: string; feedback: string | null; ended_at: string | null; created_at: string };
type Scenario = { id: string; title: string; opening: string };

const MODE_ICONS: Record<string, any> = { draft: PenLine, simulate: Users, reflect: HeartHandshake, repair: Wrench };
const PLACEHOLDER: Record<string, string> = {
  draft: "הדבק כאן את הטיוטה שרצית לשלוח לבן…",
  simulate: "איך היית מגיב?",
  reflect: "ספר בקצרה מה קרה…",
  repair: "מה נאמר או נעשה?",
};
const SUPERVISION = "מרחב תרגול מלווה: מנהל המערכת יכול לקרוא את השיחות שלך כאן.";

const ParentCoach = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [me, setMe] = useState<{ name: string; child_name?: string; child_gender?: string; parent_role?: string; consent_at: string | null } | null>(null);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [child, setChild] = useState("");
  const [role, setRole] = useState<"father" | "mother">("father");
  const [gender, setGender] = useState<"son" | "daughter">("son");
  const [busy, setBusy] = useState(false);
  const [pickScenario, setPickScenario] = useState(false);
  const [active, setActive] = useState<Conv | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const load = async (t = token) => {
    if (!t) return;
    try {
      const d = await coachApi({ action: "me", token: t });
      setMe(d.me); setConvs(d.conversations ?? []); setScenarios(d.scenarios ?? []); setAiEnabled(d.ai_enabled);
    } catch (e: any) {
      if (e.status === 401) { localStorage.removeItem(TOKEN_KEY); setToken(null); }
      else toast.error(e.message);
    }
  };
  useEffect(() => { load(); }, [token]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, streaming, feedback]);

  const login = async () => {
    setBusy(true);
    try {
      const d = await coachApi({ action: "login", code, name, child_name: child, parent_role: role, child_gender: gender });
      localStorage.setItem(TOKEN_KEY, d.participant.token);
      setToken(d.participant.token);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const openConv = async (c: Conv) => {
    const d = await coachApi({ action: "messages", token, conversation_id: c.id });
    setActive(d.conversation); setMsgs(d.messages ?? []); setFeedback(d.conversation.feedback); setError(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const start = async (mode: string, scenario_id?: string) => {
    setBusy(true);
    try {
      const d = await coachApi({ action: "start", token, mode, scenario_id });
      setPickScenario(false);
      await openConv(d.conversation);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const send = async (action: "chat" | "finish") => {
    if (!active || streaming !== null) return;
    const t = text.trim();
    if (action === "chat" && !t) return;
    setError(null);
    if (action === "chat") { setMsgs((m) => [...m, { role: "user", content: t }]); setText(""); }
    setStreaming("");
    try {
      const full = await coachStream({ action, token, conversation_id: active.id, text: t }, setStreaming);
      if (action === "chat") setMsgs((m) => [...m, { role: "assistant", content: full }]);
      else { setFeedback(full); load(); }
    } catch (e: any) { setError(e.message); }
    finally { setStreaming(null); setTimeout(() => inputRef.current?.focus(), 50); }
  };

  const header = (
    <div className="bg-card border-b border-border">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
        <img src={logo} alt="בית אקשטיין" className="w-10 h-10 rounded-xl object-cover" />
        <div className="flex-1">
          <h1 className="font-heading font-bold text-base leading-tight">רגע לפני — מרחב לתקשורת מקרבת</h1>
          <p className="text-[11px] text-muted-foreground">תרגול תקשורת מקרבת להורים · בית ספר מרום</p>
        </div>
        {token && me && (
          <Button size="sm" variant="ghost" onClick={() => { localStorage.removeItem(TOKEN_KEY); setToken(null); setMe(null); setActive(null); }}>
            <LogOut /> יציאה
          </Button>
        )}
      </div>
    </div>
  );

  const g = (t: string) => genderize(t, me?.parent_role, me?.child_gender);
  const ph = (m: string) => { const mom = me?.parent_role === "mother"; const girl = me?.child_gender === "daughter"; const map: Record<string, string> = { draft: `${mom ? "הדביקי" : "הדבק"} כאן את הטיוטה שרצית לשלוח ${girl ? "לבת" : "לבן"}…`, simulate: mom ? "איך היית מגיבה?" : "איך היית מגיב?", reflect: mom ? "ספרי בקצרה מה קרה…" : "ספר בקצרה מה קרה…", repair: "מה נאמר או נעשה?" }; return map[m] ?? PLACEHOLDER[m]; };
  const wrap = (c: React.ReactNode) => (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-primary/5 to-background">{header}<div className="max-w-3xl mx-auto px-4 py-6">{c}</div></div>
  );

  if (!token) return wrap(
    <div className="intake-card-soft max-w-md mx-auto space-y-4">
      <h2 className="font-heading font-bold text-lg">כניסה למרחב התרגול</h2>
      <p className="text-sm leading-relaxed rounded-lg bg-primary/5 p-3">מערכת לתרגול תקשורת מקרבת בין הורים לילדים, בליווי צוות בית הספר.</p>
      <p className="text-sm text-muted-foreground">הזינו את קוד הכניסה, את שמכם ואת שם הילד/ה.</p>
      <Input inputMode="numeric" placeholder="קוד כניסה" value={code} onChange={(e) => setCode(e.target.value)} />
      <Seg value={role} onChange={setRole as any} options={[["father", "אבא"], ["mother", "אמא"]]} />
      <Input placeholder="שם ההורה" value={name} onChange={(e) => setName(e.target.value)} />
      <Seg value={gender} onChange={setGender as any} options={[["son", "בן"], ["daughter", "בת"]]} />
      <Input placeholder={gender === "daughter" ? "שם הבת" : "שם הבן"} value={child} onChange={(e) => setChild(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} />
      <Button className="w-full" disabled={busy || !code || name.trim().length < 2 || child.trim().length < 2} onClick={login}>
        {busy && <Loader2 className="animate-spin" />} כניסה
      </Button>
    </div>
  );

  if (!me) return wrap(<div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>);

  if (!me.consent_at) return wrap(
    <div className="intake-card-soft space-y-4">
      <h2 className="font-heading font-bold text-lg">שלום {me.name}</h2>
      <p className="text-sm leading-relaxed">זו שיחת תרגול בלבד — {me.child_gender === "daughter" ? "הבת בתרגול היא דמות דמיונית, לא" : "הבן בתרגול הוא דמות דמיונית, לא"} {me.child_name} {me.child_gender === "daughter" ? "האמיתית" : "האמיתי"}. מנהל המערכת יכול לקרוא את השיחות.</p>
      <Button onClick={async () => { await coachApi({ action: "consent", token }); load(); }}>קדימה לתרגול</Button>
    </div>
  );

  if (active) {
    const Icon = MODE_ICONS[active.mode] ?? MessageCircleHeart;
    const ended = !!feedback;
    return wrap(
      <div className="space-y-3">
        <button onClick={() => { setActive(null); load(); }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
          <ArrowRight className="w-4 h-4" /> חזרה למסך הבית
        </button>
        <div className="flex items-center gap-2"><Icon className="w-5 h-5 text-primary" /><h2 className="font-heading font-bold">{g(active.title)}</h2></div>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {SUPERVISION}</p>
        {active.mode === "simulate" && <p className="text-xs rounded-lg bg-muted p-2">זהו תרחיש דמיוני לתרגול. הוא אינו תחזית לתגובה של {me.child_name || "הילד/ה"}.</p>}
        <div className="space-y-3 min-h-[200px]">
          {msgs.map((m, i) => <Bubble key={i} m={m} canCopy={active.mode !== "simulate"} />)}
          {streaming !== null && (streaming ? <Bubble m={{ role: "assistant", content: streaming }} /> :
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> חושב…</div>)}
          {error && <div className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm p-3">{error}</div>}
          {feedback && (
            <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-4">
              <h3 className="font-heading font-semibold mb-2">משוב מסכם</h3>
              <div className="prose prose-sm max-w-none text-foreground"><ReactMarkdown>{feedback}</ReactMarkdown></div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        {!ended && (
          !aiEnabled ? <p className="text-sm text-destructive">יצירת תשובות מושבתת כרגע על ידי מנהל המערכת.</p> :
          <div className="sticky bottom-0 bg-background/95 pt-2 pb-3 space-y-2">
            <div className="flex gap-2 items-end">
              <Textarea ref={inputRef} autoFocus rows={2} value={text} placeholder={ph(active.mode)}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send("chat"); } }} className="resize-none" />
              <Button size="icon" aria-label="שליחה" disabled={!text.trim() || streaming !== null} onClick={() => send("chat")}><Send /></Button>
            </div>
            {msgs.some((m) => m.role === "user") && (
              <Button variant="outline" size="sm" disabled={streaming !== null} onClick={() => send("finish")}><Flag /> סיום וקבלת משוב</Button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (pickScenario) return wrap(
    <div className="space-y-3">
      <button onClick={() => setPickScenario(false)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"><ArrowRight className="w-4 h-4" /> חזרה</button>
      <h2 className="font-heading font-bold">{me.parent_role === "mother" ? "בחרי" : "בחר"} תרחיש לתרגול</h2>
      <p className="text-xs rounded-lg bg-muted p-2">זהו תרחיש דמיוני לתרגול. הוא אינו תחזית לתגובה של {me.child_name || "הילד/ה"}.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {scenarios.map((s) => (
          <button key={s.id} disabled={busy} onClick={() => start("simulate", s.id)} className="intake-card-soft text-right hover:border-primary/50">
            <h3 className="font-semibold">{g(s.title)}</h3>
            {s.opening && <p className="text-xs text-muted-foreground mt-1">{g(s.opening)}</p>}
          </button>
        ))}
      </div>
    </div>
  );

  const finished = convs.filter((c) => c.feedback);
  return wrap(
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-lg">שלום {me.name}, במה נתרגל היום?</h2>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1"><Eye className="w-3.5 h-3.5" /> {SUPERVISION}</p>
      </div>
      {!aiEnabled && <p className="text-sm text-destructive">יצירת תשובות מושבתת כרגע על ידי מנהל המערכת.</p>}
      <div className="grid sm:grid-cols-2 gap-3">
        {Object.entries(MODE_LABELS).map(([k, l]) => {
          const Icon = MODE_ICONS[k];
          return (
            <button key={k} disabled={busy || !aiEnabled} onClick={() => k === "simulate" ? setPickScenario(true) : start(k)}
              className="intake-card-soft text-right hover:border-primary/50 hover:shadow-lg transition-all flex items-center gap-3 disabled:opacity-50">
              <span className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center"><Icon className="w-5 h-5 text-primary" /></span>
              <span className="font-semibold">{l}</span>
            </button>
          );
        })}
      </div>
      {finished.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-heading font-semibold">מה אני לומד על התקשורת שלי</h3>
          {finished.slice(0, 3).map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground mb-1">{g(c.title)} · {new Date(c.created_at).toLocaleDateString("he-IL")}</p>
              <div className="prose prose-sm max-w-none text-foreground"><ReactMarkdown>{c.feedback!}</ReactMarkdown></div>
            </div>
          ))}
        </section>
      )}
      {convs.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-heading font-semibold">התרגולים שלי</h3>
          {convs.map((c) => (
            <button key={c.id} onClick={() => openConv(c)} className="w-full text-right rounded-xl border border-border bg-card p-3 hover:border-primary/40 flex justify-between">
              <span className="text-sm">{g(c.title)}</span>
              <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("he-IL")}{c.feedback ? " · הושלם" : ""}</span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
};

const Seg = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) => (
  <div className="grid grid-cols-2 gap-2">
    {options.map(([k, l]) => (
      <button key={k} type="button" onClick={() => onChange(k)}
        className={`rounded-xl border-2 py-2 text-sm font-medium ${value === k ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>{l}</button>
    ))}
  </div>
);

const Bubble = ({ m, canCopy }: { m: Msg; canCopy?: boolean }) =>
  m.role === "user" ? (
    <div className="flex justify-start"><div className="max-w-[85%] rounded-2xl bg-primary text-primary-foreground px-4 py-2 text-sm whitespace-pre-wrap">{m.content}</div></div>
  ) : (
    <div>
      <div className="prose prose-sm max-w-none text-foreground"><ReactMarkdown>{m.content}</ReactMarkdown></div>
      {canCopy && /אפשר לנסח כך/.test(m.content) && (
        <button className="text-xs text-primary mt-1 underline" onClick={async () => {
          const match = m.content.match(/אפשר לנסח כך\**\s*\n+([\s\S]*?)(\n\n|$)/);
          const ok = await copyText((match?.[1] ?? m.content).replace(/[״"*]/g, "").trim());
          toast[ok ? "success" : "error"](ok ? "הנוסח הועתק — ההעתקה אינה שליחה" : "לא ניתן להעתיק");
        }}>העתקת הנוסח</button>
      )}
    </div>
  );

export default ParentCoach;
