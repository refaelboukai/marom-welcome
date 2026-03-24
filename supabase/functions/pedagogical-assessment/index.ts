import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Role & Expertise:
You are the "Pedagogical Assessment & Mapping Expert," a specialized AI designed for the Israeli education system. Your expertise is based on the standards of RAMA (The National Authority for Measurement and Evaluation in Education) and the Ministry of Education's (MoE) curriculum. Your goal is to generate diagnostic tests (Mapping Tools) and analyze student performance in Hebrew (Mother Tongue), Mathematics, and English (EFL).

Core Instructions:
- Evidence-Based Assessment: Every test or analysis must be grounded in the official MoE proficiency levels.
- Bilingual Capability: You communicate with the teacher/user in Hebrew, but English content must follow the CEFR levels.
- Structured Output: Always provide data in structured JSON format.

Domain-Specific Guidelines:
1. Hebrew (Hebrew as a Mother Tongue):
   - Primary (Grades 1-6): Focus on "MIFA" (מיפ"ה) standards. Test for: Phonological awareness, reading fluency, accuracy, and 4 dimensions of comprehension (Literal, Inferential, Evaluative, and Applied).
   - Secondary (Grades 7-12): Focus on "Mezimot Ha'aracha" (משימות הערכה). Test for: Academic vocabulary, text synthesis, and argumentative writing conventions (Mifmar standards).

2. Mathematics:
   - Levels: Adjust tasks based on Elementary (Number sense, 4 operations, Geometry), Middle School (Algebraic thinking, Functions), and High School (3/4/5 Units - Calculus, Trig, Probability).
   - Thinking Levels: Map performance according to: Algorithmic Knowledge (Procedural execution), Conceptual Understanding (Explaining the "Why"), Problem Solving (Applying math to real-world or verbal scenarios).

3. English (EFL):
   - Standards: Use the CEFR (A1, A2, B1, B2) and MoE Vocabulary Bands (Band I, II, III).
   - Mapping Criteria: Access to Information (Reading/Listening), Written Production (Grammatical accuracy, coherence), Spoken Interaction (Fluency, vocabulary range).

Output Style:
- Use professional, pedagogical Hebrew.
- Maintain academic reliability — do not hallucinate scores; if data is insufficient, request clarification.
- Always return valid JSON.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode, subject, gradeLevel, topic, studentAnswers, existingScores, studentName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let userPrompt = "";

    if (mode === "generate_test") {
      userPrompt = `צור מבחן אבחוני במקצוע: ${subject}, לכיתה: ${gradeLevel}${topic ? `, נושא: ${topic}` : ''}.

החזר JSON בפורמט הבא:
{
  "title": "כותרת המבחן",
  "instructions": "הוראות לתלמיד",
  "questions": [
    {
      "id": "q1",
      "text": "טקסט השאלה",
      "type": "open" | "multiple_choice" | "fill_blank",
      "options": ["א", "ב", "ג", "ד"],
      "difficulty": "basic" | "intermediate" | "advanced",
      "skill": "שם המיומנות הנבדקת",
      "rubric": "תשובה נכונה / קריטריון הערכה",
      "maxPoints": 10
    }
  ],
  "totalPoints": 100
}

צור 8-12 שאלות ברמות קושי שונות.`;
    } else if (mode === "analyze") {
      userPrompt = `נתח את ביצועי התלמיד ${studentName || ''} במקצוע ${subject}, כיתה ${gradeLevel}.

תשובות התלמיד:
${JSON.stringify(studentAnswers, null, 2)}

${existingScores ? `ציונים פסיכו-סוציאליים קיימים:\n${JSON.stringify(existingScores, null, 2)}` : ''}

החזר JSON בפורמט הבא:
{
  "performanceLevel": "mastery" | "partial" | "needs_intervention",
  "overallScore": 0-100,
  "dimensionScores": {
    "שם מיומנות": { "score": 0-100, "level": "שליטה/שליטה חלקית/דורש התערבות", "details": "פירוט" }
  },
  "misconceptions": [
    { "type": "technical" | "conceptual", "description": "תיאור הטעות", "evidence": "הדוגמה מהתשובה" }
  ],
  "actionPlan": [
    { "step": 1, "action": "פעולה קונקרטית למורה", "rationale": "הסבר מקצועי" }
  ],
  "summary": "סיכום מקצועי בעברית פדגוגית",
  "strengths": ["חוזקות"],
  "areasForImprovement": ["תחומים לשיפור"],
  "cefrLevel": "A1/A2/B1/B2 (לאנגלית בלבד, null לשאר)"
}`;
    } else if (mode === "insights") {
      userPrompt = `בהתבסס על הנתונים הבאים של תלמיד ${studentName || ''} בכיתה ${gradeLevel || ''}:

ציונים פסיכו-סוציאליים:
${JSON.stringify(existingScores, null, 2)}

${studentAnswers ? `תוצאות הערכה אקדמית:\n${JSON.stringify(studentAnswers, null, 2)}` : ''}

צור דוח תובנות מקצועי בעברית פדגוגית. החזר JSON:
{
  "overallProfile": "תמונת מצב כוללת",
  "academicReadiness": "מוכנות אקדמית",
  "psychosocialIntegration": "אינטגרציה פסיכו-סוציאלית-אקדמית",
  "prioritizedRecommendations": [
    { "priority": 1, "domain": "תחום", "recommendation": "המלצה", "rationale": "נימוק" }
  ],
  "supportPlan": {
    "immediate": ["פעולות מיידיות"],
    "shortTerm": ["פעולות לטווח קצר"],
    "longTerm": ["פעולות לטווח ארוך"]
  },
  "monitoringIndicators": ["אינדיקטורים למעקב"]
}`;
    } else {
      throw new Error("Invalid mode. Use 'generate_test', 'analyze', or 'insights'.");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "מגבלת בקשות. נסה שוב בעוד מספר שניות." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "נדרש חידוש קרדיטים." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Extract JSON from the response
    let parsed;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = { rawContent: content };
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pedagogical-assessment error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
