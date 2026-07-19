import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { text, students } = await req.json();
    if (!text || !Array.isArray(students) || students.length === 0) {
      return new Response(JSON.stringify({ error: "חסרים טקסט או רשימת תלמידים" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `אתה עוזר שמפצל מסמך אחד המכיל תיאורים על מספר תלמידים לפי שמות.
קיבלת רשימת תלמידים (עם id ושם) וטקסט מסמך.
המשימה: עבור כל תלמיד ברשימה, חלץ מהטקסט את הקטע/הקטעים שמתייחסים אליו והחזר סיכום מילולי נקי בעברית (לא ציטוט מודגש, אלא הטקסט הרלוונטי בשלמותו, כולל אבחונים/רקע/המלצות אם מופיעים).
כללים:
- זהה התאמות גם על סמך שם פרטי, שם משפחה, ראשי תיבות, או וריאציות כתיב.
- אם לא מצאת כלום עבור תלמיד — החזר summary ריק ("") ו-found=false.
- אל תמציא מידע. אל תכתוב פרשנויות משלך.
- החזר JSON תקין בלבד.

פורמט:
{
  "results": [
    { "studentId": "...", "studentName": "...", "found": true|false, "summary": "..." }
  ]
}`;

    const userPrompt = `רשימת תלמידים:\n${JSON.stringify(students, null, 2)}\n\nטקסט המסמך:\n"""\n${text}\n"""`;

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
      console.error("split-narratives gateway error:", response.status, t);
      if (response.status === 429) return new Response(JSON.stringify({ error: "השירות עמוס, נסה שוב" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "אזלו הקרדיטים לשירות" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "שגיאה בפיצול הקובץ" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try { parsed = JSON.parse(content); } catch { parsed = { results: [] }; }
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("split-narratives error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});