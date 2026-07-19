import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { filename, mimeType, base64 } = await req.json();
    if (!base64) throw new Error("missing base64");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Plain text — decode directly (no AI needed)
    if ((mimeType || "").startsWith("text/") || /\.txt$/i.test(filename || "")) {
      try {
        const bin = atob(base64);
        return new Response(JSON.stringify({ text: bin }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch {}
    }

    const dataUrl = `data:${mimeType || "application/octet-stream"};base64,${base64}`;
    const instruction = `חלץ את הטקסט המלא מהקובץ המצורף בעברית ברורה, ללא סיכום וללא עריכה. שמור על מבנה כללי (כותרות, פסקאות, רשימות). אל תוסיף פרשנות משלך. החזר טקסט בלבד.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: instruction },
              { type: "file", file: { filename: filename || "document", file_data: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("extract-document-text gateway error:", response.status, t);
      if (response.status === 429) return new Response(JSON.stringify({ error: "השירות עמוס, נסה שוב" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "אזלו הקרדיטים לשירות" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "שגיאה בחילוץ הקובץ" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ text }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("extract-document-text error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});