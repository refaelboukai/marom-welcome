import { QuestionnaireItem } from "@/lib/types";

export const questionnaireItems: QuestionnaireItem[] = [
  // ====== QUALITY OF LIFE (24 items) ======
  { id: "qol_01", section: "quality_of_life", subdomain: "general_wellbeing", studentText: "אני מרוצה מחיי", studentTextFemale: "אני מרוצה מחיי", parentText: "לדעתך, בנך/בתך מרוצה מחייו/ה", isReverse: false },
  { id: "qol_02", section: "quality_of_life", subdomain: "general_wellbeing", studentText: "אני מרוצה מהעתיד שלי", studentTextFemale: "אני מרוצה מהעתיד שלי", parentText: "לדעתך, בנך/בתך מרוצה מהעתיד שלו/ה", isReverse: false },
  { id: "qol_03", section: "quality_of_life", subdomain: "general_wellbeing", studentText: "אני מרגיש בטוח בבית הספר", studentTextFemale: "אני מרגישה בטוחה בבית הספר", parentText: "לדעתך, בנך/בתך מרגיש/ה בטוח/ה בבית הספר", isReverse: false },
  { id: "qol_04", section: "quality_of_life", subdomain: "social", studentText: "אני מרוצה מהקשרים החברתיים שלי", studentTextFemale: "אני מרוצה מהקשרים החברתיים שלי", parentText: "לדעתך, בנך/בתך מרוצה מהקשרים החברתיים שלו/ה", isReverse: false },
  { id: "qol_05", section: "quality_of_life", subdomain: "social", studentText: "אני מצליח להשתלב חברתית בבית הספר", studentTextFemale: "אני מצליחה להשתלב חברתית בבית הספר", parentText: "לדעתך, בנך/בתך מצליח/ה להשתלב חברתית בבית הספר", isReverse: false },
  { id: "qol_06", section: "quality_of_life", subdomain: "social", studentText: "אני מבקש עזרה מחברים כשצריך", studentTextFemale: "אני מבקשת עזרה מחברים כשצריך", parentText: "לדעתך, בנך/בתך מבקש/ת עזרה מחברים כשצריך", isReverse: false },
  { id: "qol_07", section: "quality_of_life", subdomain: "emotional", studentText: "אני מצליח להתמודד עם לחץ", studentTextFemale: "אני מצליחה להתמודד עם לחץ", parentText: "לדעתך, בנך/בתך מצליח/ה להתמודד עם לחץ", isReverse: false },
  { id: "qol_08", section: "quality_of_life", subdomain: "emotional", studentText: "אני מצליח לשלוט בכעסים ובתסכול", studentTextFemale: "אני מצליחה לשלוט בכעסים ובתסכול", parentText: "לדעתך, בנך/בתך מצליח/ה לשלוט בכעסים ובתסכול", isReverse: false },
  { id: "qol_09", section: "quality_of_life", subdomain: "emotional", studentText: "אני מצליח להתמודד עם כישלון", studentTextFemale: "אני מצליחה להתמודד עם כישלון", parentText: "לדעתך, בנך/בתך מצליח/ה להתמודד עם כישלון", isReverse: false },
  { id: "qol_10", section: "quality_of_life", subdomain: "independence", studentText: "אני עצמאי בתפקודי יום-יום", studentTextFemale: "אני עצמאית בתפקודי יום-יום", parentText: "לדעתך, בנך/בתך עצמאי/ת בתפקודי יום-יום", isReverse: false },
  { id: "qol_11", section: "quality_of_life", subdomain: "independence", studentText: "אני מקבל החלטות בעצמי", studentTextFemale: "אני מקבלת החלטות בעצמי", parentText: "לדעתך, בנך/בתך מקבל/ת החלטות בעצמו/ה", isReverse: false },
  { id: "qol_12", section: "quality_of_life", subdomain: "independence", studentText: "אני לוקח אחריות על ההתנהגות שלי", studentTextFemale: "אני לוקחת אחריות על ההתנהגות שלי", parentText: "לדעתך, בנך/בתך לוקח/ת אחריות על ההתנהגות שלו/ה", isReverse: false },
  { id: "qol_13", section: "quality_of_life", subdomain: "academic", studentText: "אני משתתף ומבצע משימות לימודיות", studentTextFemale: "אני משתתפת ומבצעת משימות לימודיות", parentText: "לדעתך, בנך/בתך משתתף/ת ומבצע/ת משימות לימודיות", isReverse: false },
  { id: "qol_14", section: "quality_of_life", subdomain: "academic", studentText: "אני מסוגל ללמוד באופן עצמאי", studentTextFemale: "אני מסוגלת ללמוד באופן עצמאי", parentText: "לדעתך, בנך/בתך מסוגל/ת ללמוד באופן עצמאי", isReverse: false },
  { id: "qol_15", section: "quality_of_life", subdomain: "academic", studentText: "אני מרוצה מהישגיי בלימודים", studentTextFemale: "אני מרוצה מהישגיי בלימודים", parentText: "לדעתך, בנך/בתך מרוצה מהישגיו/ה בלימודים", isReverse: false },
  { id: "qol_16", section: "quality_of_life", subdomain: "health_lifestyle", studentText: "אני עוסק בפעילות גופנית", studentTextFemale: "אני עוסקת בפעילות גופנית", parentText: "לדעתך, בנך/בתך עוסק/ת בפעילות גופנית", isReverse: false },
  { id: "qol_17", section: "quality_of_life", subdomain: "health_lifestyle", studentText: "אני שומר על תזונה נכונה", studentTextFemale: "אני שומרת על תזונה נכונה", parentText: "לדעתך, בנך/בתך שומר/ת על תזונה נכונה", isReverse: false },
  { id: "qol_18", section: "quality_of_life", subdomain: "health_lifestyle", studentText: "אני נמנע משימוש בחומרים מסוכנים", studentTextFemale: "אני נמנעת משימוש בחומרים מסוכנים", parentText: "לדעתך, בנך/בתך נמנע/ת משימוש בחומרים מסוכנים", isReverse: false },
  { id: "qol_19", section: "quality_of_life", subdomain: "family_support", studentText: "אני מרוצה מהקשר עם המשפחה שלי", studentTextFemale: "אני מרוצה מהקשר עם המשפחה שלי", parentText: "לדעתך, בנך/בתך מרוצה מהקשר עם המשפחה", isReverse: false },
  { id: "qol_20", section: "quality_of_life", subdomain: "family_support", studentText: "יש לי עם מי לדבר כשקשה לי", studentTextFemale: "יש לי עם מי לדבר כשקשה לי", parentText: "לדעתך, לבנך/בתך יש עם מי לדבר כשקשה לו/ה", isReverse: false },
  { id: "qol_21", section: "quality_of_life", subdomain: "self_view", studentText: "יש בי דברים טובים להתגאות בהם", studentTextFemale: "יש בי דברים טובים להתגאות בהם", parentText: "לדעתך, בנך/בתך מרגיש/ה שיש בו/ה דברים טובים להתגאות בהם", isReverse: false },
  { id: "qol_22", section: "quality_of_life", subdomain: "self_view", studentText: "אני מאמין שאני יכול להצליח", studentTextFemale: "אני מאמינה שאני יכולה להצליח", parentText: "לדעתך, בנך/בתך מאמין/ה שהוא/היא יכול/ה להצליח", isReverse: false },
  { id: "qol_23", section: "quality_of_life", subdomain: "self_view", studentText: "אני מצליח לעמוד במטרות שאני מציב לעצמי", studentTextFemale: "אני מצליחה לעמוד במטרות שאני מציבה לעצמי", parentText: "לדעתך, בנך/בתך מצליח/ה לעמוד במטרות שהוא/היא מציב/ה", isReverse: false },
  { id: "qol_24", section: "quality_of_life", subdomain: "self_view", studentText: "אני מרגיש שאני כישלון", studentTextFemale: "אני מרגישה שאני כישלון", parentText: "לדעתך, בנך/בתך מרגיש/ה שהוא/היא כישלון", isReverse: true },

  // ====== SELF-EFFICACY (8 items) ======
  { id: "se_01", section: "self_efficacy", studentText: "אני מאמין שאני יכול להצליח במשימות שונות", studentTextFemale: "אני מאמינה שאני יכולה להצליח במשימות שונות", parentText: "לדעתך, בנך/בתך מאמין/ה שהוא/היא יכול/ה להצליח במשימות שונות", isReverse: false },
  { id: "se_02", section: "self_efficacy", studentText: "אני יכול להשיג מטרות שהצבתי לעצמי", studentTextFemale: "אני יכולה להשיג מטרות שהצבתי לעצמי", parentText: "לדעתך, בנך/בתך יכול/ה להשיג מטרות שהציב/ה לעצמו/ה", isReverse: false },
  { id: "se_03", section: "self_efficacy", studentText: "אני בטוח שאצליח גם במשימות קשות", studentTextFemale: "אני בטוחה שאצליח גם במשימות קשות", parentText: "לדעתך, בנך/בתך בטוח/ה שיצליח/תצליח גם במשימות קשות", isReverse: false },
  { id: "se_04", section: "self_efficacy", studentText: "אני יכול להתמודד עם אתגרים", studentTextFemale: "אני יכולה להתמודד עם אתגרים", parentText: "לדעתך, בנך/בתך יכול/ה להתמודד עם אתגרים", isReverse: false },
  { id: "se_05", section: "self_efficacy", studentText: "אני מסוגל לבצע משימות היטב", studentTextFemale: "אני מסוגלת לבצע משימות היטב", parentText: "לדעתך, בנך/בתך מסוגל/ת לבצע משימות היטב", isReverse: false },
  { id: "se_06", section: "self_efficacy", studentText: "אני מוצא דרכים להשיג את מטרותיי", studentTextFemale: "אני מוצאת דרכים להשיג את מטרותיי", parentText: "לדעתך, בנך/בתך מוצא/ת דרכים להשיג את מטרותיו/ה", isReverse: false },
  { id: "se_07", section: "self_efficacy", studentText: "אני בטוח בעצמי במשימות חדשות", studentTextFemale: "אני בטוחה בעצמי במשימות חדשות", parentText: "לדעתך, בנך/בתך בטוח/ה בעצמו/ה במשימות חדשות", isReverse: false },
  { id: "se_08", section: "self_efficacy", studentText: "גם במצבים קשים אני מצליח לתפקד", studentTextFemale: "גם במצבים קשים אני מצליחה לתפקד", parentText: "לדעתך, גם במצבים קשים בנך/בתך מצליח/ה לתפקד", isReverse: false },

  // ====== LOCUS OF CONTROL (10 items) ======
  { id: "loc_01", section: "locus_of_control", subdomain: "internal", studentText: "אני יכול להשפיע על מה שקורה לי", studentTextFemale: "אני יכולה להשפיע על מה שקורה לי", parentText: "לדעתך, בנך/בתך יכול/ה להשפיע על מה שקורה לו/ה", isReverse: false },
  { id: "loc_02", section: "locus_of_control", subdomain: "internal", studentText: "הצלחה תלויה במאמץ שלי", studentTextFemale: "הצלחה תלויה במאמץ שלי", parentText: "לדעתך, בנך/בתך מאמין/ה שההצלחה תלויה במאמץ שלו/ה", isReverse: false },
  { id: "loc_03", section: "locus_of_control", subdomain: "internal", studentText: "אני יכול לפתור בעיות כשצריך", studentTextFemale: "אני יכולה לפתור בעיות כשצריך", parentText: "לדעתך, בנך/בתך יכול/ה לפתור בעיות כשצריך", isReverse: false },
  { id: "loc_04", section: "locus_of_control", subdomain: "internal", studentText: "אני יכול להשפיע על אחרים", studentTextFemale: "אני יכולה להשפיע על אחרים", parentText: "לדעתך, בנך/בתך יכול/ה להשפיע על אחרים", isReverse: false },
  { id: "loc_05", section: "locus_of_control", subdomain: "internal", studentText: "אני יכול לקבל החלטות בעצמי", studentTextFemale: "אני יכולה לקבל החלטות בעצמי", parentText: "לדעתך, בנך/בתך יכול/ה לקבל החלטות בעצמו/ה", isReverse: false },
  { id: "loc_06", section: "locus_of_control", subdomain: "external", studentText: "דברים שקורים לי הם בעיקר עניין של מזל", studentTextFemale: "דברים שקורים לי הם בעיקר עניין של מזל", parentText: "לדעתך, בנך/בתך מאמין/ה שדברים קורים בעיקר בגלל מזל", isReverse: true },
  { id: "loc_07", section: "locus_of_control", subdomain: "external", studentText: "אין לי שליטה על מה שקורה לי", studentTextFemale: "אין לי שליטה על מה שקורה לי", parentText: "לדעתך, בנך/בתך מרגיש/ה שאין לו/ה שליטה על מה שקורה", isReverse: true },
  { id: "loc_08", section: "locus_of_control", subdomain: "external", studentText: "אחרים קובעים מה יקרה לי", studentTextFemale: "אחרים קובעים מה יקרה לי", parentText: "לדעתך, בנך/בתך מרגיש/ה שאחרים קובעים מה יקרה לו/ה", isReverse: true },
  { id: "loc_09", section: "locus_of_control", subdomain: "external", studentText: "אין לי יכולת לשנות מצבים", studentTextFemale: "אין לי יכולת לשנות מצבים", parentText: "לדעתך, בנך/בתך מרגיש/ה שאין לו/ה יכולת לשנות מצבים", isReverse: true },
  { id: "loc_10", section: "locus_of_control", subdomain: "external", studentText: "אין לי בחירה במה שקורה לי", studentTextFemale: "אין לי בחירה במה שקורה לי", parentText: "לדעתך, בנך/בתך מרגיש/ה שאין לו/ה בחירה במה שקורה", isReverse: true },

  // ====== COGNITIVE FLEXIBILITY (10 items) ======
  { id: "cf_01", section: "cognitive_flexibility", subdomain: "perspective_taking", studentText: "אני מסתכל על מצבים מזוויות שונות", studentTextFemale: "אני מסתכלת על מצבים מזוויות שונות", parentText: "לדעתך, בנך/בתך מסתכל/ת על מצבים מזוויות שונות", isReverse: false },
  { id: "cf_02", section: "cognitive_flexibility", subdomain: "perspective_taking", studentText: "אני מנסה להבין את נקודת המבט של אחרים", studentTextFemale: "אני מנסה להבין את נקודת המבט של אחרים", parentText: "לדעתך, בנך/בתך מנסה להבין את נקודת המבט של אחרים", isReverse: false },
  { id: "cf_03", section: "cognitive_flexibility", subdomain: "multiple_options", studentText: "אני שוקל כמה אפשרויות לפני שאני מקבל החלטה", studentTextFemale: "אני שוקלת כמה אפשרויות לפני שאני מקבלת החלטה", parentText: "לדעתך, בנך/בתך שוקל/ת כמה אפשרויות לפני שהוא/היא מקבל/ת החלטה", isReverse: false },
  { id: "cf_04", section: "cognitive_flexibility", subdomain: "problem_solving", studentText: "אני יכול לחשוב על יותר מפתרון אחד למצב קשה", studentTextFemale: "אני יכולה לחשוב על יותר מפתרון אחד למצב קשה", parentText: "לדעתך, בנך/בתך יכול/ה לחשוב על יותר מפתרון אחד למצב קשה", isReverse: false },
  { id: "cf_05", section: "cognitive_flexibility", subdomain: "multiple_options", studentText: "אני שוקל אפשרויות רבות לפני שאני מגיב למצבים קשים", studentTextFemale: "אני שוקלת אפשרויות רבות לפני שאני מגיבה למצבים קשים", parentText: "לדעתך, בנך/בתך שוקל/ת אפשרויות רבות לפני שהוא/היא מגיב/ה למצבים קשים", isReverse: false },
  { id: "cf_06", section: "cognitive_flexibility", subdomain: "systematic_thinking", studentText: "גם במצבים קשים אני מנסה לחשוב על דרך פעולה", studentTextFemale: "גם במצבים קשים אני מנסה לחשוב על דרך פעולה", parentText: "לדעתך, גם במצבים קשים בנך/בתך מנסה לחשוב על דרך פעולה", isReverse: false },
  { id: "cf_07", section: "cognitive_flexibility", subdomain: "difficulty_deciding", studentText: "אני מתקשה לקבל החלטות כשאני מתמודד עם מצבים קשים", studentTextFemale: "אני מתקשה לקבל החלטות כשאני מתמודדת עם מצבים קשים", parentText: "לדעתך, בנך/בתך מתקשה לקבל החלטות במצבים קשים", isReverse: true },
  { id: "cf_08", section: "cognitive_flexibility", subdomain: "losing_control", studentText: "כשאני נתקל במצבים קשים, אני מרגיש שאני מאבד שליטה", studentTextFemale: "כשאני נתקלת במצבים קשים, אני מרגישה שאני מאבדת שליטה", parentText: "לדעתך, כשבנך/בתך נתקל/ת במצבים קשים, הוא/היא מרגיש/ה שמאבד/ת שליטה", isReverse: true },
  { id: "cf_09", section: "cognitive_flexibility", subdomain: "helplessness", studentText: "כשאני נתקל במצבים קשים, אני פשוט לא יודע מה לעשות", studentTextFemale: "כשאני נתקלת במצבים קשים, אני פשוט לא יודעת מה לעשות", parentText: "לדעתך, כשבנך/בתך נתקל/ת במצבים קשים, הוא/היא לא יודע/ת מה לעשות", isReverse: true },
  { id: "cf_10", section: "cognitive_flexibility", subdomain: "rigidity", studentText: "במצבים קשים אני מרגיש שאין לי יכולת לשנות דברים", studentTextFemale: "במצבים קשים אני מרגישה שאין לי יכולת לשנות דברים", parentText: "לדעתך, במצבים קשים בנך/בתך מרגיש/ה שאין לו/ה יכולת לשנות דברים", isReverse: true },
];

export const ITEMS_PER_PAGE = 3;

export const sectionOrder: Array<{ section: string; label: string }> = [
  { section: "quality_of_life", label: "איכות חיים" },
  { section: "self_efficacy", label: "מסוגלות עצמית" },
  { section: "locus_of_control", label: "מיקוד שליטה" },
  { section: "cognitive_flexibility", label: "גמישות קוגניטיבית" },
];

export const likertLabels = [
  { value: 1, label: "לא מסכים בכלל", labelFemale: "לא מסכימה בכלל" },
  { value: 2, label: "לא כל כך מסכים", labelFemale: "לא כל כך מסכימה" },
  { value: 3, label: "ככה ככה", labelFemale: "ככה ככה" },
  { value: 4, label: "מסכים", labelFemale: "מסכימה" },
  { value: 5, label: "מסכים מאוד", labelFemale: "מסכימה מאוד" },
];
