# שדרוג מנוע השיבוץ — סעיפים 1, 2, 3, 4, 6, 9

## 1. כימיה בין־אישית וסיכוני קונפליקט
- **סכימה**: הוספת עמודה `relationships` (jsonb) ל־`intake_sessions` — מבנה: `{ avoid: [studentId,...], prefer: [studentId,...], notes: string }`.
- **UI**: בפרופיל התלמיד (`StudentProfile.tsx`) — סקציה חדשה "כימיה חברתית" עם שני multi-select מתוך רשימת התלמידים (הימנעות / רצוי יחד) + שדה הערות.
- **מנוע**: `placement-batch` יקבל `relationships` לכל תלמיד. אילוץ קשיח = לא לשבץ יחד "avoid"; אילוץ רך = לנסות לאחד "prefer".
- **טריאדות בעייתיות**: אחרי השיבוץ, בדיקה בצד לקוח — אם בכיתה יש 3+ תלמידים עם `ca_04` (אימפולסיביות) ≤ 2.5, מוצג דגל אדום בכרטיס הכיתה.

## 2. פרופיל חושי/עומס סביבתי
- שימוש קיים ב־`arousal_sensory` (subdomain של `learning_characteristics`, פריטים lc_19–lc_24). היום זה לא מגיע לפרומפט של השיבוץ.
- **`class-aggregations.ts`**: הוספת שדה `sensorySensitivity` (ממוצע 4 פריטי arousal_sensory) לכל `StudentProfileForAI`.
- **`placement-batch` prompt**: הוראה מפורשת — תלמיד עם `sensorySensitivity` ≤ 2.5 → העדף מחנכת עם `teacherMetrics.structure` ו־`patience` גבוהים; הימנע מלערום 4+ רגישים בכיתה אחת.

## 3. איזון פרופילים ומדד גיוון + עוגנים
- **`class-aggregations.ts`**: פונקציה חדשה `computeClassDiversity(students)` שמחזירה:
  - `regulationSpread` (סטיית תקן של ממוצע ההתנהגות)
  - `styleMix` (פיזור סגנונות למידה לפי 4 תת-קלאסטרים)
  - `anchorCount` (תלמידים עם ממוצע התנהגות ≥ 4 ו־QoL ≥ 4)
- **דגל UI ב־`SmartPlacement.tsx`**: כרטיס כיתה מציג "ללא עוגן ⚠️" אם `anchorCount === 0`, ו־"גיוון נמוך" אם `regulationSpread < 0.4`.
- **פרומפט**: הנחיה — לוודא לפחות עוגן אחד לכל כיתה; אם אין מועמד לעוגן — לציין ב־`flags`.

## 4. תחזית עומס טיפולי למחנכת
- חישוב `classLoad = Σ (riskWeight per student)` — כל דגל `urgent` = 3, `concern` = 2, `attention` = 1, +2 לכל ממוצע ca ≤ 2.5.
- **`teacherCapacity`** = פונקציה של `teacherMetrics.patience + structure + warmth` (סקאלה 3–15, מנורמל 0–1).
- **דגל**: אם `classLoad / teacherCapacity > threshold` (מכויל דינמית) — התראה "עומס גבוה מיכולת הכיתה".
- מוצג בכרטיס כיתה ב־`SmartPlacement.tsx` כפס טעינה (עומס / קיבולת) עם צבע.

## 6. Explainability — פירוק גורמים באחוזים
- **`placement-batch` — JSON schema מורחב**: כל assignment יכיל `factors: [{ name: string, weight: number, note: string }]` (3 גורמים דומיננטיים, סכום 100%).
- הפרומפט יכפה: המשקלים לפי סדר עדיפויות המוצהר (התאמה התנהגותית, שכבה, מגדר, חברים, מחנכת).
- **UI**: ב־`DetailsModal` של תלמיד משובץ — קומפוננטת bar-chart קטן שמציג את שלושת הגורמים ואת המשקל שלהם + note קצר לכל אחד.

## 9. Second Opinion — שני מודלים במקביל
- Edge function חדש: `placement-second-opinion` — מריץ את אותו פרומפט על `openai/gpt-5.4-mini` (או מודל שני שנבחר), מקבל אותו JSON.
- **`SmartPlacement.tsx`**: כפתור עליון "חוות דעת שנייה" (רץ אחרי שיבוץ ראשוני). משווה `classKey` לכל תלמיד בין שתי הריצות:
  - הסכמה → סימון ירוק "שני מודלים מסכימים".
  - אי־הסכמה → סימון כתום + הצגת ההצעה החלופית ב־tooltip.
- שומר את שתי התוצאות ב־`localStorage` כטיוטה נפרדת.

---

## שינויי סכימה

```sql
ALTER TABLE public.intake_sessions
  ADD COLUMN IF NOT EXISTS relationships jsonb DEFAULT '{"avoid":[],"prefer":[],"notes":""}'::jsonb;
```

## קבצים מושפעים

**חדשים**
- `supabase/functions/placement-second-opinion/index.ts`
- `src/components/placement/FactorsBreakdown.tsx`
- `src/components/placement/ClassLoadBar.tsx`

**עדכון**
- `src/lib/class-aggregations.ts` — `sensorySensitivity`, `computeClassDiversity`, `computeClassLoad`, `relationships`
- `supabase/functions/placement-batch/index.ts` — פרומפט מורחב + `factors` ב־schema + קלט `relationships`, `sensorySensitivity`, `diversity`
- `src/pages/admin/SmartPlacement.tsx` — דגלים חדשים (עוגן, גיוון, עומס, טריאדה), כפתור "חוות דעת שנייה", השוואת מודלים, factors ב־DetailsModal
- `src/pages/admin/StudentProfile.tsx` — סקציית "כימיה חברתית"
- `src/lib/types.ts` — טיפוסים חדשים (`Relationships`, `PlacementFactor`)

## סדר ביצוע
1. Migration (`relationships`).
2. `class-aggregations.ts` — כל הפונקציות החדשות.
3. UI כימיה חברתית ב־`StudentProfile.tsx`.
4. עדכון `placement-batch` (פרומפט + factors + קלטים חדשים).
5. Edge function `placement-second-opinion`.
6. עדכון `SmartPlacement.tsx` — דגלים, factors, השוואת מודלים.
7. קומפוננטות `FactorsBreakdown` ו־`ClassLoadBar`.

מאשר להתחיל?
