/** Staff self-assessment: cognitive flexibility, locus of control, self-efficacy. */

export type StaffSelfDomain = "cognitive_flexibility" | "locus_of_control" | "self_efficacy";

export interface StaffSelfItem {
  id: string;
  domain: StaffSelfDomain;
  text: string;
  isReverse?: boolean;
}

export const STAFF_SELF_DOMAINS: { key: StaffSelfDomain; label: string; short: string; description: string; color: string }[] = [
  {
    key: "cognitive_flexibility",
    label: "גמישות מחשבתית",
    short: "היכולת לשנות זווית, להחזיק כמה פתרונות ולהתאים את עצמי למצב משתנה.",
    description:
      "גמישות מחשבתית היא היכולת לעבור בין נקודות מבט, לוותר על פתרון שלא עובד ולייצר חלופות — במיוחד ברגעי לחץ בכיתה.",
    color: "#4a9a7a",
  },
  {
    key: "locus_of_control",
    label: "מיקוד שליטה",
    short: "המידה שבה אני מרגיש/ה שיש בידיי השפעה על מה שקורה בעבודה שלי.",
    description:
      "מיקוד שליטה פנימי מתבטא בתחושה שהמאמץ, הבחירות והפעולות שלי משפיעים על התוצאה — בניגוד לתחושה שהכול תלוי בנסיבות חיצוניות.",
    color: "#3f7fb3",
  },
  {
    key: "self_efficacy",
    label: "מסוגלות עצמית",
    short: "האמון שלי ביכולתי להתמודד בהצלחה עם משימות ואתגרים מקצועיים.",
    description:
      "מסוגלות עצמית מקצועית היא האמונה שאני מסוגל/ת להתמודד עם מצבים מורכבים, ללמוד מהם ולהוביל שינוי אצל תלמידים.",
    color: "#a2793f",
  },
];

export const STAFF_SELF_ITEMS: StaffSelfItem[] = [
  // גמישות מחשבתית (10)
  { id: "cf1", domain: "cognitive_flexibility", text: "כשדרך פעולה לא עובדת עם תלמיד/ה, אני מנסה גישה אחרת בלי להיתקע" },
  { id: "cf2", domain: "cognitive_flexibility", text: "אני מצליח/ה לראות מצב גם מנקודת המבט של התלמיד/ה או ההורה" },
  { id: "cf3", domain: "cognitive_flexibility", text: "אני שוקל/ת כמה אפשרויות לפני שאני מקבל/ת החלטה חינוכית" },
  { id: "cf4", domain: "cognitive_flexibility", text: "שינויים פתאומיים במערכת או בלוח הזמנים מוציאים אותי מאיזון", isReverse: true },
  { id: "cf5", domain: "cognitive_flexibility", text: "גם ברגעי לחץ אני מצליח/ה לחשוב על דרך פעולה ולא רק להגיב" },
  { id: "cf6", domain: "cognitive_flexibility", text: "קשה לי לוותר על התוכנית שהכנתי גם כשהיא לא מתאימה למה שקורה בכיתה", isReverse: true },
  { id: "cf7", domain: "cognitive_flexibility", text: "אני פתוח/ה לרעיונות של קולגות גם כשהם שונים מהתפיסה שלי" },
  { id: "cf8", domain: "cognitive_flexibility", text: "אני מזהה מתי אני נצמד/ת לפרשנות אחת ובודק/ת פרשנויות נוספות" },
  { id: "cf9", domain: "cognitive_flexibility", text: "אני מסוגל/ת להחזיק מורכבות — גם כשאין תשובה אחת נכונה" },
  { id: "cf10", domain: "cognitive_flexibility", text: "אחרי אירוע קשה אני מצליח/ה לחזור לאיזון ולחשוב בבהירות" },

  // מיקוד שליטה (9)
  { id: "loc1", domain: "locus_of_control", text: "יש לי השפעה אמיתית על מה שקורה בכיתה שלי" },
  { id: "loc2", domain: "locus_of_control", text: "ההצלחה שלי בעבודה תלויה בעיקר במאמץ ובבחירות שלי" },
  { id: "loc3", domain: "locus_of_control", text: "כשמשהו לא מצליח, אני בודק/ת מה בידיי לשנות" },
  { id: "loc4", domain: "locus_of_control", text: "רוב מה שקורה בעבודה שלי נקבע על ידי גורמים שאין לי שליטה עליהם", isReverse: true },
  { id: "loc5", domain: "locus_of_control", text: "אני יוזם/ת פתרונות ולא רק ממתין/ה להנחיות" },
  { id: "loc6", domain: "locus_of_control", text: "התקדמות של תלמיד/ה קשה תלויה בעיקר במזל ובנסיבות", isReverse: true },
  { id: "loc7", domain: "locus_of_control", text: "אני מרגיש/ה שיש לי דרכים להשפיע גם על מצבים מורכבים" },
  { id: "loc8", domain: "locus_of_control", text: "כשאני נתקל/ת בקושי מערכתי, אני פועל/ת כדי לקדם שינוי" },
  { id: "loc9", domain: "locus_of_control", text: "אני נוטה להרגיש חסר/ת אונים מול התנהגות מאתגרת", isReverse: true },

  // מסוגלות עצמית (9)
  { id: "se1", domain: "self_efficacy", text: "אני בטוח/ה ביכולתי להתמודד עם מצבים מאתגרים בכיתה" },
  { id: "se2", domain: "self_efficacy", text: "אני מסוגל/ת ליצור קשר משמעותי גם עם תלמיד/ה שקשה להתחבר אליו/ה" },
  { id: "se3", domain: "self_efficacy", text: "אני משיג/ה את המטרות החינוכיות שאני מציב/ה לעצמי" },
  { id: "se4", domain: "self_efficacy", text: "אני מטיל/ה ספק ביכולות המקצועיות שלי", isReverse: true },
  { id: "se5", domain: "self_efficacy", text: "אני יודע/ת לבקש עזרה או ייעוץ כשצריך, מבלי שזה פוגע בביטחון שלי" },
  { id: "se6", domain: "self_efficacy", text: "אני מצליח/ה להוביל תהליך למידה גם כשהתנאים אינם אידיאליים" },
  { id: "se7", domain: "self_efficacy", text: "משוב ביקורתי מרתיע אותי ומערער אותי לאורך זמן", isReverse: true },
  { id: "se8", domain: "self_efficacy", text: "אני לומד/ת מטעויות ומיישם/ת את התובנות בפעם הבאה" },
  { id: "se9", domain: "self_efficacy", text: "אני מאמין/ה שאני משפיע/ה לטובה על התלמידים שלי" },
];

export const LIKERT_LABELS = ["כלל לא", "מעט", "במידה בינונית", "במידה רבה", "במידה רבה מאוד"];

export interface DomainResult {
  key: StaffSelfDomain;
  label: string;
  color: string;
  description: string;
  score: number; // 1-5
  percent: number; // 0-100
  level: "מתפתח" | "מתגבש" | "יציב" | "גבוה";
  levelText: string;
  recommendations: string[];
  topItems: string[];
  growthItems: string[];
}

const LEVEL_TEXT: Record<StaffSelfDomain, Record<string, string>> = {
  cognitive_flexibility: {
    מתפתח: "כרגע נוח לך יותר עם מסגרת קבועה וברורה. שינויים בלתי צפויים דורשים ממך אנרגיה רבה.",
    מתגבש: "את/ה מצליח/ה להתגמש בחלק מהמצבים, ובעיקר כשיש זמן להיערך מראש.",
    יציב: "את/ה נע/ה בין אפשרויות בצורה טובה ומתאים/ה את עצמך לרוב המצבים בכיתה.",
    גבוה: "גמישות מחשבתית היא משאב בולט שלך — את/ה מייצר/ת חלופות במהירות גם תחת לחץ.",
  },
  locus_of_control: {
    מתפתח: "לעיתים קרובות התחושה היא שהתוצאה נקבעת על ידי גורמים חיצוניים, וזה מקטין את מרחב הפעולה.",
    מתגבש: "את/ה מזהה את ההשפעה שלך בחלק מהמצבים, אך פחות במצבים מערכתיים או מורכבים.",
    יציב: "יש לך תחושת השפעה ברורה ואת/ה פועל/ת מתוכה ברוב המצבים.",
    גבוה: "מיקוד שליטה פנימי חזק — את/ה רואה את עצמך כגורם משמעותי בתוצאה, וזה מניע יוזמה.",
  },
  self_efficacy: {
    מתפתח: "האמון ביכולת המקצועית מתערער בקלות, במיוחד מול משוב או כישלון.",
    מתגבש: "יש בך ביטחון מקצועי, אך הוא תלוי הצלחה ומושפע ממצבים קשים.",
    יציב: "את/ה מגיע/ה למשימות עם ביטחון מקצועי ומתמודד/ת גם עם קשיים.",
    גבוה: "מסוגלות עצמית גבוהה — את/ה מאמין/ה ביכולתך להשפיע ומתרגם/ת זאת לפעולה.",
  },
};

const RECS: Record<StaffSelfDomain, { low: string[]; mid: string[]; high: string[] }> = {
  cognitive_flexibility: {
    low: [
      "לפני כל שיעור, הכינו תוכנית ב' קצרה למקרה שהתוכנית המקורית לא עובדת.",
      "תרגלו עצירה של 10 שניות לפני תגובה לאירוע — נשימה, שאלה, ואז פעולה.",
      "בכל אירוע מאתגר, נסחו שתי פרשנויות אפשריות להתנהגות התלמיד/ה לפני שמחליטים.",
    ],
    mid: [
      "אחת לשבוע בחרו מקרה אחד והתייעצו עם קולגה מזווית שונה משלכם.",
      "נסו \"ניסוי קטן\": שנו אלמנט אחד בשיעור ובדקו מה קרה.",
      "סמנו לעצמכם מתי אתם נצמדים לפתרון יחיד — זו נקודת הבחירה שלכם.",
    ],
    high: [
      "שתפו קולגות בדרכי ההתמודדות שלכם — הגמישות שלכם היא מודל לחיקוי.",
      "קחו על עצמכם ליווי של מקרה מורכב בצוות.",
      "שמרו על גבולות: גמישות גבוהה עלולה להוביל לעומס יתר.",
    ],
  },
  locus_of_control: {
    low: [
      "בכל קושי, כתבו שלוש פעולות שכן בשליטתכם והתחילו מאחת מהן.",
      "הפרידו בין \"מה שאני יכול/ה להשפיע\" לבין \"מה שאינו בידיי\" — והשקיעו אנרגיה רק בראשון.",
      "תעדו הצלחות קטנות שנבעו מפעולה שלכם, כדי לחזק את תחושת ההשפעה.",
    ],
    mid: [
      "בחרו יעד מערכתי אחד שתרצו לקדם השנה ופרקו אותו לצעדים.",
      "בישיבות צוות הציעו פתרון אחד ולא רק תיאור הקושי.",
      "בקשו משוב על השפעתכם בפועל — לעיתים היא גדולה מהתחושה.",
    ],
    high: [
      "השתמשו בתחושת ההשפעה כדי להוביל יוזמה כיתתית או בית-ספרית.",
      "שימו לב לא לקחת אחריות על מה שאינו בידיכם — כדי למנוע שחיקה.",
      "לוו איש/אשת צוות שמתקשה לזהות את מרחב ההשפעה שלו/ה.",
    ],
  },
  self_efficacy: {
    low: [
      "התחילו כל שבוע ממשימה אחת שאתם יודעים שתצליחו בה — הצלחה בונה מסוגלות.",
      "תעדו שלושה רגעים מקצועיים טובים בכל שבוע.",
      "בקשו ליווי או הדרכה קבועה — זו פעולה של חוזק ולא של חולשה.",
    ],
    mid: [
      "הציבו יעד מקצועי מדיד אחד לחודש והעריכו את עצמכם מולו.",
      "בקשו משוב ממוקד מקולגה על תחום אחד שאתם רוצים לחזק.",
      "זהו את הסיטואציות שמערערות אתכם והתכוננו אליהן מראש.",
    ],
    high: [
      "קחו על עצמכם אתגר מקצועי חדש שירחיב אתכם.",
      "שמשו כמנטור/ית לאיש/אשת צוות חדש/ה.",
      "שמרו על סקרנות ובקשו משוב גם כשהכול עובד.",
    ],
  },
};

export function computeStaffSelfResults(responses: Record<string, number>): {
  domains: DomainResult[];
  overall: number;
  answered: number;
  total: number;
} {
  const domains = STAFF_SELF_DOMAINS.map((d) => {
    const items = STAFF_SELF_ITEMS.filter((i) => i.domain === d.key);
    const scored = items
      .map((i) => ({ item: i, raw: responses[i.id] }))
      .filter((x) => typeof x.raw === "number")
      .map((x) => ({ item: x.item, value: x.item.isReverse ? 6 - x.raw : x.raw }));

    const score = scored.length ? scored.reduce((s, x) => s + x.value, 0) / scored.length : 0;
    const percent = score ? Math.round(((score - 1) / 4) * 100) : 0;
    const level: DomainResult["level"] =
      score >= 4.3 ? "גבוה" : score >= 3.6 ? "יציב" : score >= 2.8 ? "מתגבש" : "מתפתח";
    const bucket = score >= 4.3 ? "high" : score >= 3.2 ? "mid" : "low";

    const sorted = [...scored].sort((a, b) => b.value - a.value);
    return {
      key: d.key,
      label: d.label,
      color: d.color,
      description: d.description,
      score: Number(score.toFixed(2)),
      percent,
      level,
      levelText: LEVEL_TEXT[d.key][level],
      recommendations: RECS[d.key][bucket as "low" | "mid" | "high"],
      topItems: sorted.slice(0, 2).map((x) => x.item.text),
      growthItems: sorted.slice(-2).reverse().map((x) => x.item.text),
    };
  });

  const valid = domains.filter((d) => d.score > 0);
  const overall = valid.length ? Number((valid.reduce((s, d) => s + d.score, 0) / valid.length).toFixed(2)) : 0;
  const answered = STAFF_SELF_ITEMS.filter((i) => typeof responses[i.id] === "number").length;

  return { domains, overall, answered, total: STAFF_SELF_ITEMS.length };
}
