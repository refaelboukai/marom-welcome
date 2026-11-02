const URL_ = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parent-coach`;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const TOKEN_KEY = "parent-coach-token";

export const MODE_LABELS: Record<string, string> = {
  draft: "לפני שאני שולח הודעה",
  simulate: "אני רוצה לתרגל שיחה",
  reflect: "אני צריך רגע להבין מה עובר עליי",
  repair: "אמרתי משהו פוגע — איך מתקנים?",
  learn: "רוצה להבין לעומק — הסברים על גיל ההתבגרות",
};

const headers = { "Content-Type": "application/json", apikey: KEY, Authorization: `Bearer ${KEY}` };

export async function coachApi<T = any>(body: Record<string, unknown>): Promise<T> {
  const r = await fetch(URL_, { method: "POST", headers, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || "אירעה תקלה בחיבור לשירות"), { status: r.status });
  return data;
}

export async function coachStream(body: Record<string, unknown>, onText: (full: string) => void, signal?: AbortSignal) {
  const r = await fetch(URL_, { method: "POST", headers, body: JSON.stringify(body), signal });
  if (!r.ok || !r.body) {
    const data = await r.json().catch(() => ({}));
    throw new Error(data.error || "אירעה תקלה ביצירת התשובה");
  }
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += dec.decode(value, { stream: true });
    onText(full);
  }
  if (!full.trim()) throw new Error("לא התקבלה תשובה. נסה שוב בעוד רגע.");
  return full;
}
