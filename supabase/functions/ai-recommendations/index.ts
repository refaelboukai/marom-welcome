import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { students } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `אתה יועץ חינוכי-טיפולי מומחה בבית ספר לחינוך מיוחד בישראל.
אתה מקבל נתוני שאלונים של תלמידים (ציונים בסולם 1-5 בתחומים: איכות חיים, מסוגלות עצמית, מיקוד שליטה, גמישות קוגניטיבית).
עליך לנתח את הנתונים ולהפיק המלצות מקצועיות ברמת הכיתה והפרט.

כללים:
- כתוב בעברית מקצועית-פדגוגית
- הציע 3-5 המלצות ממוקדות ומעשיות
- זהה דפוסים ברמת הכיתה
- הצבע על תלמידים שדורשים תשומת לב מיוחדת (בלי לציין שמות, רק כמות)
- השתמש בשפה חמה ומקצועית
- התייחס לפערים בין תפיסת תלמיד להורה אם קיימים

פורמט התשובה:
החזר JSON עם המבנה הבא:
{
  "classInsight": "תובנה כללית על הכיתה",
  "recommendations": ["המלצה 1", "המלצה 2", ...],
  "attentionCount": מספר תלמידים שדורשים תשומת לב,
  "strengths": ["חוזקה 1", "חוזקה 2"],
  "focusAreas": ["תחום מיקוד 1", "תחום מיקוד 2"]
}`;

    const userPrompt = `הנה נתוני התלמידים (ציונים ממוצעים בסולם 1-5):\n${JSON.stringify(students, null, 2)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_recommendations",
              description: "Provide structured educational recommendations",
              parameters: {
                type: "object",
                properties: {
                  classInsight: { type: "string", description: "Overall class insight in Hebrew" },
                  recommendations: { type: "array", items: { type: "string" }, description: "3-5 actionable recommendations in Hebrew" },
                  attentionCount: { type: "number", description: "Number of students needing attention" },
                  strengths: { type: "array", items: { type: "string" }, description: "Class strengths" },
                  focusAreas: { type: "array", items: { type: "string" }, description: "Areas to focus on" },
                },
                required: ["classInsight", "recommendations", "attentionCount", "strengths", "focusAreas"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_recommendations" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "שירות ה-AI עמוס כרגע, נסה שוב מאוחר יותר" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "נדרש חידוש מנוי לשירות ה-AI" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "שגיאה בשירות ה-AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    let result;
    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      const content = data.choices?.[0]?.message?.content || "";
      try {
        result = JSON.parse(content);
      } catch {
        result = {
          classInsight: content,
          recommendations: [],
          attentionCount: 0,
          strengths: [],
          focusAreas: [],
        };
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("AI recommendations error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
