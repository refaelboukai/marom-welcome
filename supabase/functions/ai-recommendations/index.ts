import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { student, openResponses, staffOpenResponses } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `אתה יועץ חינוכי-טיפולי מומחה בבית ספר לחינוך מיוחד בישראל (בית ספר מרום בית אקשטיין).
אתה מקבל נתונים של תלמיד בודד — ציונים בסולם 1-5 בארבעה תחומים (איכות חיים, מסוגלות עצמית, מיקוד שליטה, גמישות קוגניטיבית), 
פערים בין תפיסת התלמיד לתפיסת ההורה, ותשובות פתוחות של התלמיד.

עליך לנתח את הנתונים ולהפיק המלצות אישיות ומותאמות לתלמיד הספציפי.

כללים:
- כתוב בעברית מקצועית-פדגוגית אך חמה
- הציע 3-5 המלצות ממוקדות ומעשיות שמותאמות אישית לתלמיד
- התייחס לחוזקות ולתחומים שדורשים תמיכה
- אם יש פערים בין תפיסת התלמיד להורה — התייחס לזה
- אם יש תשובות פתוחות (חלום, תחומי עניין, דמות משמעותית) — השתמש בהן כדי לייצר המלצות רלוונטיות
- התייחס לתפיסת איכות החיים: זיהוי צרכים, העצמת מיומנויות בחירה, חשיפה להזדמנויות
- הצע דרכי פעולה קונקרטיות שהצוות החינוכי יכול ליישם

פורמט התשובה:
החזר JSON עם המבנה הבא:
{
  "personalInsight": "תובנה אישית על התלמיד (2-3 משפטים)",
  "strengths": ["חוזקה 1", "חוזקה 2"],
  "areasForSupport": ["תחום לתמיכה 1", "תחום לתמיכה 2"],
  "recommendations": ["המלצה מעשית 1", "המלצה מעשית 2", ...],
  "suggestedGoals": ["יעד מוצע 1", "יעד מוצע 2"],
  "parentGuidance": "המלצה קצרה להורים (משפט אחד-שניים)"
}`;

    const userPrompt = `נתוני התלמיד:\n${JSON.stringify(student, null, 2)}${openResponses ? `\n\nתשובות פתוחות של התלמיד:\n${JSON.stringify(openResponses, null, 2)}` : ""}${staffOpenResponses ? `\n\nהערות צוות:\n${JSON.stringify(staffOpenResponses, null, 2)}` : ""}`;

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
              name: "provide_student_recommendations",
              description: "Provide personalized educational recommendations for a specific student",
              parameters: {
                type: "object",
                properties: {
                  personalInsight: { type: "string", description: "Personal insight about the student in Hebrew" },
                  strengths: { type: "array", items: { type: "string" }, description: "Student strengths" },
                  areasForSupport: { type: "array", items: { type: "string" }, description: "Areas needing support" },
                  recommendations: { type: "array", items: { type: "string" }, description: "3-5 actionable personalized recommendations in Hebrew" },
                  suggestedGoals: { type: "array", items: { type: "string" }, description: "Suggested goals for the student" },
                  parentGuidance: { type: "string", description: "Brief guidance for parents in Hebrew" },
                },
                required: ["personalInsight", "strengths", "areasForSupport", "recommendations", "suggestedGoals", "parentGuidance"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_student_recommendations" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "השירות עמוס כרגע, נסה שוב מאוחר יותר" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "נדרש חידוש מנוי לשירות" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "שגיאה בשירות ההמלצות" }), {
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
          personalInsight: content,
          strengths: [],
          areasForSupport: [],
          recommendations: [],
          suggestedGoals: [],
          parentGuidance: "",
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
