import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { student, classes, mode = "all" } = await req.json();
    // classes: array of { key, label, aggregate }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const modeInstruction = mode === "single"
      ? "מצב: בדיקת התאמה לכיתה יחידה. בדוק עד כמה התלמיד מתאים לכיתה שנשלחה, וציין נקודות חוזק וקושי בשיבוץ. recommendedClassKey חייב להיות המפתח של אותה כיתה."
      : mode === "compare"
      ? "מצב: השוואה בין שתי כיתות. השווה את התאמת התלמיד לשתיהן, המלץ על אחת מהן ב-recommendedClassKey, והצב את השנייה ב-alternative."
      : "מצב: התאמה מלאה מכל הכיתות. בחר את הכיתה הכי מתאימה והצב אלטרנטיבה שנייה.";

    const systemPrompt = `אתה יועץ פדגוגי-טיפולי בבית ספר לחינוך מיוחד (מרום בית אקשטיין).
תפקידך: להמליץ לאיזו כיתה בבית הספר עדיף לשבץ תלמיד ספציפי, מבין הכיתות הקיימות.

שיקולים (בסדר משקל):
(1) התאמת מחנכת—תלמיד (משקל גבוה מאוד): קרא את teacherBio בעיון והפק ממנו פרופיל של המחנכת על פי הצירים הבאים, ודרג את ההתאמה לכל תלמיד (0–5) בכל ציר:
    · מבנה/סדר מול גמישות ואלתור
    · חום ואמפתיה מול אסרטיביות ומיקוד־משימה
    · גבולות ברורים מול מרחב פתוח ואוטונומי
    · שיח רגשי־חינוכי עמוק מול פוקוס לימודי־ערכי
    · עצמאות ויוזמה של התלמיד מול צורך בליווי צמוד
    · סובלנות לשונות, לפרובוקציה ולוויסות רגשי
    · קשר עם הורים ומשפחה (אינטנסיביות, שקיפות, שותפות)
    · תפיסת התפקיד (מחנכת-מלווה / מבוגר משמעותי / מובילה לימודית / דמות טיפולית)
    · יכולת התמודדות עם משבר, אירועי הסלמה ותלמידים בסיכון
    התאמה טובה = תלמיד עם צורך X ומחנכת עם חוזק תואם או משלים ב-X. חוסר התאמה חמור = דגל אזהרה.
(2) גיל/כיתה קרובים לתלמידי הכיתה.
(3) פרופיל רגשי-חברתי-למידתי דומה או משלים לתלמידים הקיימים.
(4) איזון מגדרי בכיתה.
(5) חפיפה חיובית של חוזקות ואתגרים עם ילדים ספציפיים בכיתה — ציין שמות.
(6) הימנעות מעומס — אל תערום ילדים בסיכון גבוה או ילדים דומיננטיים בכיתה אחת.

חובה: ברציונל יש להזכיר את שם המחנכת ולפרט לפחות 2–3 צירים ספציפיים מהרשימה לעיל שבהם ההתאמה חזקה (או חלשה), עם ציטוט קצר או פרפרזה מתוך ה-teacherBio.

${modeInstruction}

כללים:
- עברית מקצועית וברורה.
- אל תזכיר "בינה מלאכותית", אל תשתמש בביטוי "לא מוותרים על אף ילד".
- ציין שמות של תלמידים ספציפיים מהכיתה שהתלמיד ישתלב איתם טוב או שיווצר איתם צימוד טיפולי.
- אם המידע דל (למשל התלמיד לא מילא שאלון) — ציין זאת והורד את רמת הביטחון.
- אם teacherBio ריק עבור כיתה מסוימת — ציין זאת ב-flags והורד ביטחון עבור אותה כיתה.

החזר JSON:
{
  "recommendedClassKey": "key של הכיתה המומלצת",
  "confidence": "high" | "medium" | "low",
  "rationale": "פסקת רציונל מפורטת של 4-6 משפטים הכוללת: (א) התאמת המחנכת לתלמיד לפי צירים ספציפיים, (ב) התאמת הכיתה עצמה, (ג) שמות ילדים ספציפיים לצימוד",
  "teacherFit": {
    "teacherName": "שם המחנכת של הכיתה המומלצת",
    "strengths": ["ציר 1 שבו יש התאמה חזקה", "ציר 2"],
    "risks": ["ציר של פוטנציאל חיכוך, אם קיים"]
  },
  "alternative": { "classKey": "key חלופי", "whyLess": "למה פחות מתאים" },
  "flags": ["דגל 1 (למשל: 'סיכון להצטברות ילדים במצוקה בכיתה זו')", ...]
}`;

    const userPrompt = `פרופיל התלמיד לשיבוץ:\n${JSON.stringify(student, null, 2)}\n\nהכיתות הזמינות:\n${JSON.stringify(classes, null, 2)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("placement-suggest gateway error:", response.status, t);
      if (response.status === 429) return new Response(JSON.stringify({ error: "השירות עמוס, נסה שוב" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "אזלו הקרדיטים לשירות" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "שגיאה בשירות השיבוץ" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let result;
    try { result = JSON.parse(content); } catch { result = { rationale: content, confidence: "low", flags: [] }; }
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("placement-suggest error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});