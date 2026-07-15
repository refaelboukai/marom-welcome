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
שיקולים (בסדר משקל): (1) גיל/כיתה קרובים לתלמידי הכיתה, (2) פרופיל רגשי-חברתי-למידתי דומה או משלים, (3) איזון מגדרי בכיתה, (4) חפיפה חיובית של חוזקות ואתגרים עם ילדים ספציפיים בכיתה, (5) הימנעות מעומס — אל תערום ילדים בסיכון גבוה בכיתה אחת, (6) התאמה אישית לסגנון המחנכת: כאשר קיים teacherBio, קרא אותו בעיון והתייחס באופן קונקרטי לאיך הצרכים, החוזקות והאתגרים של התלמיד מתכתבים עם הגישה החינוכית, התפיסה הרגשית וסגנון העבודה של המחנכת הספציפית (למשל: תלמיד שזקוק לגבולות ברורים לצד חום ↔ מחנכת שמתארת "גבולות וסדר לצד המון אהבה"; תלמיד שזקוק לתכנון מובנה ↔ מחנכת שמתכננת מראש עם רשימות; תלמיד עם צורך בשיח פתוח ↔ מחנכת שדוגלת בשיח מקרב). הזכר את שם המחנכת ברציונל.

${modeInstruction}

כללים:
- עברית מקצועית וברורה.
- אל תזכיר "בינה מלאכותית", אל תשתמש בביטוי "לא מוותרים על אף ילד".
- ציין שמות של תלמידים ספציפיים מהכיתה שהתלמיד ישתלב איתם טוב או שיווצר איתם צימוד טיפולי.
- אם המידע דל (למשל התלמיד לא מילא שאלון) — ציין זאת והורד את רמת הביטחון.

החזר JSON:
{
  "recommendedClassKey": "key של הכיתה המומלצת",
  "confidence": "high" | "medium" | "low",
  "rationale": "פסקת רציונל מפורטת של 3-5 משפטים המסבירה את הבחירה — כולל שמות ילדים ספציפיים בכיתה שיתאימו",
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