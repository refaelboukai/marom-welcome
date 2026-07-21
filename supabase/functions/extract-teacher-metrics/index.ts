import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const METRIC_LABELS: Record<string, string> = {
  flexibility: "גמישות — הסתגלות לשינויים ולצרכים משתנים",
  structure: "שליטה ומסגרת — הצבת גבולות ברורים",
  organization: "ארגון וסדר — ניהול זמן ותהליכים",
  warmth: "קשר וחום — קרבה, אמפתיה, זמינות רגשית",
  authority: "סמכותיות — נוכחות והובלה",
  creativity: "יצירתיות — גיוון פדגוגי וחשיבה יצירתית",
  patience: "סבלנות — התמודדות עם התנהגויות מאתגרות",
  academicFocus: "התמקדות לימודית — דגש על הישגים ולמידה",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { bio, notes, name } = await req.json();
    const text = [name ? `שם המחנכת: ${name}` : "", bio || "", notes || ""].filter(Boolean).join("\n\n");
    if (!text.trim()) {
      return new Response(JSON.stringify({ error: "אין טקסט לניתוח" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const metricList = Object.entries(METRIC_LABELS).map(([k, v]) => `- ${k}: ${v}`).join("\n");

    const systemPrompt = `אתה מנתח פרופיל מקצועי של מחנכת ומחלץ ציונים מספריים בסולם 1–5 עבור מדדים פדגוגיים.
1 = חלש/נמוך מאוד, 3 = בינוני, 5 = חזק/בולט מאוד.
אם מדד אינו מוזכר או שאין רמז — החזר 3 (ברירת מחדל ניטרלית). אל תמציא מידע חורג מהטקסט.
החזר JSON תקין בלבד ללא markdown, במבנה:
{ "metrics": { "flexibility": n, "structure": n, "organization": n, "warmth": n, "authority": n, "creativity": n, "patience": n, "academicFocus": n }, "reasoning": "משפט קצר בעברית" }

המדדים:
${metricList}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `הטקסט לניתוח:\n"""\n${text}\n"""` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      return new Response(JSON.stringify({ error: "AI gateway error", status: response.status, details: body }), { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await response.json();
    let content: string = data?.choices?.[0]?.message?.content ?? "{}";
    content = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }
    const raw = parsed?.metrics || {};
    const metrics: Record<string, number> = {};
    for (const k of Object.keys(METRIC_LABELS)) {
      const v = Number(raw[k]);
      metrics[k] = Number.isFinite(v) ? Math.max(1, Math.min(5, Math.round(v))) : 3;
    }
    return new Response(JSON.stringify({ metrics, reasoning: parsed?.reasoning || "" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});