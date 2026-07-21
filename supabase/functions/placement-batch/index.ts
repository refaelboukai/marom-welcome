import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { students, classes, chatMessages = [] } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!Array.isArray(students) || students.length === 0) {
      return new Response(JSON.stringify({ error: "אין תלמידים לשיבוץ" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const systemPrompt = `אתה יועץ פדגוגי-טיפולי בבית ספר מרום בית אקשטיין (חינוך מיוחד).
תפקידך: לחלק אצווה של תלמידים בין הכיתות הקיימות בצורה שקולה — כך שהכיתות יהיו מאוזנות, ההתאמה למחנכת אופטימלית, ותתקבל דינמיקה קבוצתית טובה.

שיקולים לפי סדר עדיפויות (מהחשוב לפחות חשוב):
(1) **התאמת שכבת גיל (קריטי) — teacherGrades**: לכל כיתה יש רשימת שכבות (ז/ח/ט/י) שהמחנכת מלמדת. שבץ תלמיד רק לכיתה שבה שכבתו מופיעה ב-teacherGrades. אם teacherGrades ריק, אין מגבלת שכבה. אם אין אף כיתה מתאימה לשכבת התלמיד — הוסף flag ואל תשבץ.
(2) **תוצאות השאלונים (מרכזי)** — פרופיל הציונים והסיכונים (scores, riskFlags) של התלמיד, בכל 5 התחומים.
(3) **מגדר** — איזון מגדרי סביר בכיתה.
(4) **פרופיל המחנכת (teacherBio)** — סגנון עבודה, ערכים ותפיסה חינוכית — התאמה בין צורכי התלמיד למחנכת.
(5) איזון עומס בכיתה: אל תערום מספר רב של תלמידים בסיכון גבוה או עם קשיים דומים בכיתה אחת.
(6) סיכום מילולי (narrativeSummary) כמידע איכותני משלים כשקיים.
(7) גודל כיתה סופי מאוזן יחסית (קיים + חדשים).

חשוב מאוד — אם חסר לך מידע קריטי כדי לשבץ תלמיד בביטחון, אל תנחש. הוסף שאלה ל-openQuestions עם שם התלמיד ומה בדיוק חסר לך (למשל: "האם לתלמיד יש היסטוריית התפרצויות?", "מה יחסי הגומלין עם דמויות סמכות?"). המשתמש יענה בצ'אט ונחזור להחליט.

אם המשתמש כבר ענה על שאלות קודמות (chatMessages), שלב את התשובות בשיקול הדעת ועדכן את השיבוצים בהתאם.

החזר JSON תקין בלבד במבנה:
{
  "assignments": [
    {
      "studentId": "id",
      "studentName": "שם",
      "classKey": "key של הכיתה",
      "confidence": "high" | "medium" | "low",
      "rationale": "משפט או שניים ספציפיים — מדוע דווקא כיתה זו, מי המחנכת ולמה מתאימה, ומי מהתלמידים ישמש עוגן/חבר טוב"
    }
  ],
  "overallRationale": "פסקה קצרה (3-5 משפטים) המסבירה את ההיגיון הכולל של החלוקה: איזה איזון הושג בכל כיתה, אילו קבוצות תמיכה נוצרו, ואילו סיכונים נמנעו",
  "classSummaries": [
    { "classKey": "key", "newStudents": ["שם1", "שם2"], "note": "משפט קצר על מה הכיתה הזו מקבלת מהאצווה" }
  ],
  "openQuestions": [
    { "studentId": "id", "studentName": "שם", "question": "שאלה ספציפית שתשפר את הביטחון בשיבוץ" }
  ],
  "flags": ["דגל אזהרה כללי אם יש"]
}

כללים:
- עברית מקצועית וברורה, ללא סלנג.
- אל תזכיר "בינה מלאכותית". אל תשתמש בביטוי "לא מוותרים על אף ילד".
- classKey חייב להיות אחד מהמפתחות שסופקו.
- שבץ את כל התלמידים שסופקו. אל תשמיט.
- openQuestions נדרשות רק כשבאמת חסר מידע — לא סתם.`;
- שמור על רציונלים קצרים (עד 2 משפטים), overallRationale עד 4 משפטים, כדי לא לחרוג באורך התשובה.`;

    const userContent = `רשימת תלמידים לשיבוץ:\n${JSON.stringify(students, null, 2)}\n\nהכיתות הזמינות (כולל מחנכת ותלמידים קיימים):\n${JSON.stringify(classes, null, 2)}`;

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ];
    // Append conversation turns (user answers, assistant follow-ups)
    for (const m of chatMessages) {
      if (!m?.role || !m?.content) continue;
      messages.push({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content) });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        response_format: { type: "json_object" },
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("placement-batch gateway error:", response.status, t);
      if (response.status === 429) return new Response(JSON.stringify({ error: "השירות עמוס, נסה שוב" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "אזלו הקרדיטים לשירות" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "שגיאה בשירות השיבוץ" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const rawContent: string = data.choices?.[0]?.message?.content || "{}";
    const finishReason: string | undefined = data.choices?.[0]?.finish_reason;
    console.log("placement-batch finish_reason:", finishReason, "content_len:", rawContent.length);
    let cleaned = rawContent.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    if (!cleaned.startsWith("{")) {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) cleaned = m[0];
    }
    let result: any;
    try {
      result = JSON.parse(cleaned);
    } catch {
      console.error("placement-batch JSON parse failed. finish_reason:", finishReason, "raw sample:", cleaned.slice(0, 500), "…", cleaned.slice(-300));
      // Try to salvage a truncated JSON by trimming to last complete assignment
      const salvaged = trySalvageJson(cleaned);
      result = salvaged ?? {
        assignments: [],
        overallRationale: finishReason === "length"
          ? "התשובה נחתכה באורך. נסה/י שוב — הרציונלים יקוצרו."
          : "לא הצלחתי לפרסר את התשובה. נסה/י שוב.",
        openQuestions: [],
        flags: [finishReason === "length" ? "התשובה נחתכה (finish_reason=length)" : "שגיאת פרסינג"],
      };
    }
    if (!Array.isArray(result?.assignments)) result.assignments = [];
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("placement-batch error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

// Attempt to salvage a truncated JSON object by closing at the last complete assignment entry.
function trySalvageJson(text: string): any | null {
  try {
    // find "assignments": [ ... ] portion and close after last complete }
    const startIdx = text.indexOf('"assignments"');
    if (startIdx === -1) return null;
    const arrStart = text.indexOf("[", startIdx);
    if (arrStart === -1) return null;
    // Walk forward tracking braces to collect complete objects.
    const items: string[] = [];
    let i = arrStart + 1;
    while (i < text.length) {
      // skip whitespace/commas
      while (i < text.length && /[\s,]/.test(text[i])) i++;
      if (text[i] !== "{") break;
      let depth = 0, inStr = false, esc = false, objStart = i;
      for (; i < text.length; i++) {
        const ch = text[i];
        if (inStr) { if (esc) { esc = false; } else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
        if (ch === '"') inStr = true;
        else if (ch === "{") depth++;
        else if (ch === "}") { depth--; if (depth === 0) { items.push(text.slice(objStart, i + 1)); i++; break; } }
      }
      if (depth !== 0) break;
    }
    if (items.length === 0) return null;
    const rebuilt = `{"assignments":[${items.join(",")}]}`;
    const parsed = JSON.parse(rebuilt);
    parsed.overallRationale = "התשובה שוחזרה חלקית מפלט חתוך.";
    parsed.flags = ["התשובה נחתכה — שוחזרו רק שיבוצים מלאים"];
    return parsed;
  } catch {
    return null;
  }
}