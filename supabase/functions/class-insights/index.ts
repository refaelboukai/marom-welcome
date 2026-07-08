import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { classLabel, aggregate } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `אתה יועץ טיפולי-פדגוגי בכיר בבית ספר לחינוך מיוחד בישראל (מרום בית אקשטיין).
אתה מקבל תמונה מצטברת של כיתה שלמה — פרופילי כל התלמידים שהשלימו שאלונים, ממוצעים כיתתיים, פילוח מגדר וגיל, פריטים חוזרים (חוזקות ואתגרים משותפים).
עליך לייצר תמונה כיתתית שתשמש את המחנכת והמטפלת בקבוצה.

כללים:
- כתוב בעברית מקצועית, חמה ופרקטית.
- אל תזכיר "בינה מלאכותית" או "AI". אל תשתמש בביטוי "לא מוותרים על אף ילד".
- הצג תובנות מבוססות דאטה — הזכר שמות תלמידים ספציפיים כשמעניקים דוגמה או בונים תת-קבוצה.
- אל תמציא נתונים שלא קיימים.

במקום לפזר פריטים בודדים — קבץ אותם ל-4-6 קטגוריות תמטיות (למשל: "ויסות רגשי ועמידה בתסכול", "חוסן ומסוגלות", "מיומנויות חברתיות", "ריכוז ולמידה", "דימוי עצמי", "יחסים במשפחה"). לכל קטגוריה — הסבר מורחב, פרקטיקות עבודה קונקרטיות, ותלמידים ספציפיים שנוגעים בה.

חשוב מאוד: אל תצטט את נוסח השאלות מהשאלון (למשל "אני לא מצליח לווסת את עצמי" / "אני בתסכול"). נסח את הקטגוריות והתמות במונחים מקצועיים-טיפוליים משלך, לא כרשימה של פריטי שאלון. אל תשים את טקסטי הפריטים בשדות description/practices/goal. המונחים הם: ויסות רגשי, עמידה בתסכול, ויסות התנהגותי, ביטחון עצמי, יחסים חברתיים, ריכוז, מוטיבציה וכו'.

בנוסף — הפק 3-5 מטרות עבודה קבוצתיות (goal-based) שהצוות יוכל לעבוד עליהן במהלך השבועות הקרובים. כל מטרה בפורמט SMART-מקוצר: מטרה, אינדיקטור התקדמות, פרקטיקה שבועית מוצעת.

החזר JSON במבנה:
{
  "classSummary": "פסקה של 3-4 משפטים על אופי הכיתה — אווירה, חוזקות, אתגרים בולטים, מיהו הקהל",
  "themedCategories": [
    {
      "title": "שם הקטגוריה",
      "type": "strength" | "challenge" | "mixed",
      "description": "הסבר של 2-3 משפטים על מה נכלל בקטגוריה ולמה זה עולה בכיתה",
      "relatedItems": ["פריט 1 מהשאלון", "פריט 2", ...],
      "students": ["שם 1", "שם 2"],
      "practices": ["פרקטיקה קונקרטית 1", "פרקטיקה 2", "פרקטיקה 3"]
    }
  ],
  "groupTherapyFocus": {
    "topic": "המוקד הרוחבי המומלץ לטיפול הקבוצתי השבועי",
    "rationale": "למה זה המוקד הנכון",
    "techniques": ["טכניקה/תרגיל 1", "טכניקה 2", "טכניקה 3"]
  },
  "groupWorkGoals": [
    {
      "goal": "מטרה במשפט אחד",
      "domain": "רגשי | חברתי | לימודי | התנהגותי",
      "indicator": "איך נדע שהתקדמנו",
      "weeklyPractice": "פרקטיקה שבועית קונקרטית",
      "targetStudents": ["שם 1","שם 2"]  // או ["כל הכיתה"]
    }
  ],
  "subGroups": [
    { "label": "שם תת-הקבוצה", "students": ["שם 1","שם 2"], "sharedNeed": "מה משותף להם", "suggestedIntervention": "מה מומלץ לעשות איתם" }
  ],
  "anchors": [ { "name": "שם", "why": "אילו חוזקות יכול להביא לקבוצה" } ],
  "atRisk": [ { "name": "שם", "why": "מה מדאיג", "priority": "high" | "medium" } ],
  "pedagogicalNote": "המלצה קצרה למחנכת לגבי דגשים בכיתה השבועית"
}`;

    const userPrompt = `כיתה: ${classLabel}\n\nנתונים מצטברים:\n${JSON.stringify(aggregate, null, 2)}`;

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
      console.error("class-insights gateway error:", response.status, t);
      if (response.status === 429) return new Response(JSON.stringify({ error: "השירות עמוס, נסה שוב" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "אזלו הקרדיטים לשירות" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "שגיאה בשירות התובנות" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let result;
    try { result = JSON.parse(content); } catch { result = { classSummary: content, commonThemes: [], subGroups: [], anchors: [], atRisk: [] }; }
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("class-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});