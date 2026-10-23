/** Staff quality-of-life questionnaire — adapted from the student/parent QoL domains in the system. */

export type StaffQolDomain = "general_wellbeing" | "social" | "emotional" | "independence" | "health_lifestyle" | "self_view";

export interface StaffQolItem {
  id: string;
  domain: StaffQolDomain;
  text: string;
  isReverse?: boolean;
}

export const STAFF_QOL_DOMAINS: { key: StaffQolDomain; label: string; short: string; description: string; color: string }[] = [
  { key: "general_wellbeing", label: "רווחה כללית", short: "תחושת שביעות רצון, משמעות וביטחון בעבודה.", description: "רווחה כללית משקפת את תחושת שביעות הרצון מהעבודה ומהחיים, תחושת משמעות וביטחון במקום העבודה.", color: "#4a9a7a" },
  { key: "social", label: "חברתי — קשרים בצוות", short: "תחושת שייכות, שיתוף ותמיכה מהצוות.", description: "הקשרים בצוות הם משאב מרכזי: שייכות, אפשרות לבקש עזרה ותחושה שרואים אותי.", color: "#3f7fb3" },
  { key: "emotional", label: "רגשי", short: "התמודדות עם לחץ, תסכול ועומס רגשי.", description: "המצב הרגשי כולל את היכולת להתמודד עם לחץ, לווסת כעס ותסכול ולהתאושש אחרי יום קשה.", color: "#b0645a" },
  { key: "independence", label: "אוטונומיה ועצמאות", short: "מרחב החלטה ותחושת שליטה בעבודה.", description: "אוטונומיה היא התחושה שיש לי מרחב לקבל החלטות מקצועיות ולנהל את העבודה שלי.", color: "#7a5fa8" },
  { key: "health_lifestyle", label: "בריאות ואיזון", short: "שינה, אנרגיה ואיזון בין עבודה לבית.", description: "בריאות ואיזון כוללים אנרגיה, מנוחה ואיזון בין דרישות העבודה לבין החיים האישיים והמשפחתיים.", color: "#a2793f" },
  { key: "self_view", label: "תפיסה עצמית מקצועית", short: "הערכה עצמית, תחושת ערך והצלחה.", description: "תפיסה עצמית מקצועית היא האופן שבו אני רואה את עצמי ואת התרומה שלי כאיש/אשת צוות.", color: "#3f8f96" },
];

export const STAFF_QOL_ITEMS: StaffQolItem[] = [
  { id: "gw1", domain: "general_wellbeing", text: "אני מרוצה מהעבודה שלי בבית הספר" },
  { id: "gw2", domain: "general_wellbeing", text: "אני מרגיש/ה שלעבודה שלי יש משמעות" },
  { id: "gw3", domain: "general_wellbeing", text: "אני מרגיש/ה בטוח/ה במקום העבודה" },
  { id: "gw4", domain: "general_wellbeing", text: "אני אופטימי/ת לגבי העתיד המקצועי שלי" },

  { id: "so1", domain: "social", text: "אני מרוצה מהקשרים שלי עם אנשי הצוות" },
  { id: "so2", domain: "social", text: "אני מרגיש/ה חלק מהצוות" },
  { id: "so3", domain: "social", text: "אני מבקש/ת עזרה מקולגות כשצריך" },
  { id: "so4", domain: "social", text: "אני מרגיש/ה בודד/ה בעבודה", isReverse: true },

  { id: "em1", domain: "emotional", text: "אני מצליח/ה להתמודד עם לחץ בעבודה" },
  { id: "em2", domain: "emotional", text: "אני מצליח/ה לשלוט בכעס ובתסכול מול מצבים מאתגרים" },
  { id: "em3", domain: "emotional", text: "אני מצליח/ה להתאושש אחרי יום עבודה קשה" },
  { id: "em4", domain: "emotional", text: "אני מרגיש/ה שחוק/ה רגשית", isReverse: true },

  { id: "in1", domain: "independence", text: "יש לי מרחב לקבל החלטות מקצועיות בעצמי" },
  { id: "in2", domain: "independence", text: "אני מצליח/ה לנהל את הזמן והמשימות שלי" },
  { id: "in3", domain: "independence", text: "אני מרגיש/ה שסומכים על שיקול הדעת שלי" },
  { id: "in4", domain: "independence", text: "אני מרגיש/ה שהעבודה שלי מנוהלת בידי אחרים יותר מאשר בידיי", isReverse: true },

  { id: "hl1", domain: "health_lifestyle", text: "יש לי מספיק אנרגיה במהלך יום העבודה" },
  { id: "hl2", domain: "health_lifestyle", text: "אני ישן/ה ונח/ה מספיק" },
  { id: "hl3", domain: "health_lifestyle", text: "אני מצליח/ה לשמור על איזון בין העבודה לבית ולמשפחה" },
  { id: "hl4", domain: "health_lifestyle", text: "העבודה פוגעת לי בזמן הפנוי ובמשפחה", isReverse: true },

  { id: "sv1", domain: "self_view", text: "אני מרוצה מעצמי כאיש/אשת מקצוע" },
  { id: "sv2", domain: "self_view", text: "אני מרגיש/ה שהתרומה שלי מוערכת" },
  { id: "sv3", domain: "self_view", text: "אני מכיר/ה בחוזקות המקצועיות שלי" },
  { id: "sv4", domain: "self_view", text: "אני מרגיש/ה שאני לא מספיק טוב/ה בעבודה", isReverse: true },
];

export interface QolDomainResult {
  key: StaffQolDomain;
  label: string;
  color: string;
  description: string;
  score: number;
  percent: number;
  level: "מתפתח" | "מתגבש" | "יציב" | "גבוה";
  levelText: string;
  recommendations: string[];
  topItems: string[];
  growthItems: string[];
}

const LEVEL_TEXT: Record<string, string> = {
  מתפתח: "תחום זה נחווה כרגע כמאתגר ודורש תשומת לב ותמיכה.",
  מתגבש: "יש בתחום זה בסיס טוב, לצד נקודות שכדאי לחזק.",
  יציב: "התחום יציב ומהווה משאב טוב עבורך ברוב המצבים.",
  גבוה: "תחום זה הוא משאב בולט ומשמעותי עבורך.",
};

const RECS: Record<StaffQolDomain, { low: string[]; mid: string[]; high: string[] }> = {
  general_wellbeing: {
    low: ["שוחחו עם הממונה על מה שמקשה עליכם כרגע בעבודה.", "בחרו רגע אחד בשבוע שבו הרגשתם משמעות ותעדו אותו.", "זהו גורם אחד שפוגע בתחושת הביטחון ופנו לטפל בו."],
    mid: ["הגדירו יעד מקצועי שמחבר אתכם למשמעות.", "שימו לב מה מעלה את שביעות הרצון שלכם וחזקו זאת.", "שתפו קולגה ברגע מוצלח מהשבוע."],
    high: ["שתפו אחרים במה שמחזיק אתכם — זה משאב לצוות.", "שמרו על הרגלים שמזינים את הרווחה שלכם.", "הובילו יוזמה קטנה לחיזוק האווירה בצוות."],
  },
  social: {
    low: ["בחרו קולגה אחד/ת ליצירת קשר קבוע של התייעצות.", "השתתפו בפעילות צוות אחת החודש.", "פנו לרכז/ת או ליועצת כשקשה — אין צורך להתמודד לבד."],
    mid: ["יזמו שיחת עמיתים על מקרה משותף.", "הציעו עזרה לקולגה — זה מחזק קשר הדדי.", "חפשו שותף/ה לפרויקט קטן."],
    high: ["לוו איש/אשת צוות חדש/ה בשילוב בצוות.", "המשיכו לטפח את הקשרים — הם משאב חוסן.", "שימו לב לחברי צוות שנראים מבודדים."],
  },
  emotional: {
    low: ["תרגלו עצירה ונשימה לפני תגובה במצבים טעונים.", "קבעו שגרת פריקה קבועה אחרי יום קשה.", "שקלו פנייה להדרכה או לתמיכה רגשית."],
    mid: ["זהו את המצבים שמעוררים בכם לחץ והתכוננו אליהם.", "שתפו קולגה אחרי אירוע מאתגר.", "שלבו הפסקות קצרות במהלך היום."],
    high: ["היו כתובת לקולגות ברגעים קשים.", "שמרו על גבולות כדי לא להישחק.", "המשיכו בשגרות שעוזרות לכם להתאושש."],
  },
  independence: {
    low: ["בקשו להגדיר יחד עם הממונה תחום שבאחריותכם המלאה.", "תכננו את השבוע מראש בבלוקים של זמן.", "זהו החלטה אחת השבוע שתוכלו לקבל בעצמכם."],
    mid: ["הציעו דרך פעולה משלכם בישיבות צוות.", "תעדו החלטות מקצועיות שהצליחו.", "צמצמו משימה אחת שאינה הכרחית."],
    high: ["קחו אחריות על תחום או יוזמה חדשה.", "שתפו בדרכי ההתארגנות שלכם.", "שמרו על איזון בין עצמאות לשיתוף."],
  },
  health_lifestyle: {
    low: ["קבעו שעה קבועה לסיום עבודה בבית.", "הקפידו על שינה והפסקות במהלך היום.", "שוחחו על העומס עם הממונה."],
    mid: ["שלבו פעילות גופנית קצרה בשבוע.", "הגדירו זמן ללא מסכים ועבודה.", "שימו לב לסימני עייפות מוקדמים."],
    high: ["המשיכו לשמור על האיזון — הוא משאב חשוב.", "שתפו קולגות בהרגלים שעובדים עבורכם.", "שימו לב לתקופות עומס והיערכו מראש."],
  },
  self_view: {
    low: ["כתבו שלוש הצלחות מקצועיות מהחודש האחרון.", "בקשו משוב חיובי וממוקד מקולגה.", "זכרו שקושי אינו מעיד על חוסר יכולת."],
    mid: ["זהו חוזקה אחת והשתמשו בה במכוון השבוע.", "הציבו יעד מקצועי ובדקו את ההתקדמות.", "שתפו בהצלחה בישיבת צוות."],
    high: ["שמשו מנטור/ית לאיש/אשת צוות.", "קחו על עצמכם אתגר מקצועי חדש.", "המשיכו לבקש משוב גם כשהכול עובד."],
  },
};

export function computeStaffQolResults(responses: Record<string, number>) {
  const domains: QolDomainResult[] = STAFF_QOL_DOMAINS.map((d) => {
    const scored = STAFF_QOL_ITEMS.filter((i) => i.domain === d.key)
      .filter((i) => typeof responses[i.id] === "number")
      .map((i) => ({ item: i, value: i.isReverse ? 6 - responses[i.id] : responses[i.id] }));
    const score = scored.length ? scored.reduce((s, x) => s + x.value, 0) / scored.length : 0;
    const percent = score ? Math.round(((score - 1) / 4) * 100) : 0;
    const level: QolDomainResult["level"] = score >= 4.3 ? "גבוה" : score >= 3.6 ? "יציב" : score >= 2.8 ? "מתגבש" : "מתפתח";
    const bucket = score >= 4.3 ? "high" : score >= 3.2 ? "mid" : "low";
    const sorted = [...scored].sort((a, b) => b.value - a.value);
    return {
      key: d.key, label: d.label, color: d.color, description: d.description,
      score: Number(score.toFixed(2)), percent, level, levelText: LEVEL_TEXT[level],
      recommendations: RECS[d.key][bucket],
      topItems: sorted.slice(0, 2).map((x) => x.item.text),
      growthItems: sorted.slice(-2).reverse().map((x) => x.item.text),
    };
  });
  const valid = domains.filter((d) => d.score > 0);
  const overall = valid.length ? Number((valid.reduce((s, d) => s + d.score, 0) / valid.length).toFixed(2)) : 0;
  const answered = STAFF_QOL_ITEMS.filter((i) => typeof responses[i.id] === "number").length;
  return { domains, overall, answered, total: STAFF_QOL_ITEMS.length };
}
