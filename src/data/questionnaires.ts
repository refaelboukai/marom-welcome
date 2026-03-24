import { QuestionnaireItem } from "@/lib/types";

export const questionnaireItems: QuestionnaireItem[] = [
  // ====== QUALITY OF LIFE (24 items) ======
  { id: "qol_1", section: "quality_of_life", subdomain: "life_satisfaction", studentText: "באופן כללי, אני שבע רצון מהחיים שלי", parentText: "לדעתך, ילדך שבע/ת רצון מהחיים שלו/ה", isReverse: false },
  { id: "qol_2", section: "quality_of_life", subdomain: "future_orientation", studentText: "אני מרגיש אופטימי לגבי העתיד שלי", parentText: "לדעתך, ילדך מרגיש/ה אופטימי/ת לגבי העתיד", isReverse: false },
  { id: "qol_3", section: "quality_of_life", subdomain: "school_safety", studentText: "אני מרגיש בטוח בבית הספר", parentText: "לדעתך, ילדך מרגיש/ה בטוח/ה בבית הספר", isReverse: false },
  { id: "qol_4", section: "quality_of_life", subdomain: "social_relationships", studentText: "יש לי חברים טובים", parentText: "לדעתך, לילדך יש חברים טובים", isReverse: false },
  { id: "qol_5", section: "quality_of_life", subdomain: "social_functioning", studentText: "אני מסתדר/ת טוב עם ילדים אחרים בבית הספר", parentText: "לדעתך, ילדך מסתדר/ת טוב עם ילדים אחרים", isReverse: false },
  { id: "qol_6", section: "quality_of_life", subdomain: "help_seeking", studentText: "כשאני צריך/ה עזרה, אני פונה לחברים", parentText: "לדעתך, ילדך פונה לחברים כשהוא/היא צריך/ה עזרה", isReverse: false },
  { id: "qol_7", section: "quality_of_life", subdomain: "stress_coping", studentText: "אני מצליח/ה להתמודד עם לחץ", parentText: "לדעתך, ילדך מצליח/ה להתמודד עם לחץ", isReverse: false },
  { id: "qol_8", section: "quality_of_life", subdomain: "anger_coping", studentText: "כשאני כועס/ת, אני מצליח/ה להירגע", parentText: "לדעתך, כשילדך כועס/ת, הוא/היא מצליח/ה להירגע", isReverse: false },
  { id: "qol_9", section: "quality_of_life", subdomain: "failure_coping", studentText: "כשמשהו לא מצליח לי, אני מנסה שוב", parentText: "לדעתך, כשמשהו לא מצליח לילדך, הוא/היא מנסה שוב", isReverse: false },
  { id: "qol_10", section: "quality_of_life", subdomain: "daily_independence", studentText: "אני מסוגל/ת לעשות דברים בעצמי ביומיום", parentText: "לדעתך, ילדך מסוגל/ת לעשות דברים בעצמו/ה ביומיום", isReverse: false },
  { id: "qol_11", section: "quality_of_life", subdomain: "decision_making", studentText: "אני יודע/ת לקבל החלטות בעצמי", parentText: "לדעתך, ילדך יודע/ת לקבל החלטות בעצמו/ה", isReverse: false },
  { id: "qol_12", section: "quality_of_life", subdomain: "behavioral_responsibility", studentText: "אני לוקח/ת אחריות על ההתנהגות שלי", parentText: "לדעתך, ילדך לוקח/ת אחריות על ההתנהגות שלו/ה", isReverse: false },
  { id: "qol_13", section: "quality_of_life", subdomain: "learning_responsibility", studentText: "אני לוקח/ת אחריות על הלמידה שלי", parentText: "לדעתך, ילדך לוקח/ת אחריות על הלמידה שלו/ה", isReverse: false },
  { id: "qol_14", section: "quality_of_life", subdomain: "independent_learning", studentText: "אני יודע/ת ללמוד בעצמי", parentText: "לדעתך, ילדך יודע/ת ללמוד בעצמו/ה", isReverse: false },
  { id: "qol_15", section: "quality_of_life", subdomain: "academic_satisfaction", studentText: "אני שבע/ת רצון מההישגים שלי בלימודים", parentText: "לדעתך, ילדך שבע/ת רצון מהישגיו/ה בלימודים", isReverse: false },
  { id: "qol_16", section: "quality_of_life", subdomain: "physical_activity", studentText: "אני עוסק/ת בפעילות גופנית באופן קבוע", parentText: "לדעתך, ילדך עוסק/ת בפעילות גופנית באופן קבוע", isReverse: false },
  { id: "qol_17", section: "quality_of_life", subdomain: "nutrition", studentText: "אני דואג/ת לאכול אוכל בריא", parentText: "לדעתך, ילדך דואג/ת לאכול אוכל בריא", isReverse: false },
  { id: "qol_18", section: "quality_of_life", subdomain: "substance_avoidance", studentText: "אני נמנע/ת משימוש בחומרים מזיקים", parentText: "לדעתך, ילדך נמנע/ת משימוש בחומרים מזיקים", isReverse: false },
  { id: "qol_19", section: "quality_of_life", subdomain: "family_satisfaction", studentText: "אני מרוצה מהיחסים במשפחה שלי", parentText: "לדעתך, ילדך מרוצה מהיחסים במשפחה", isReverse: false },
  { id: "qol_20", section: "quality_of_life", subdomain: "support_figure", studentText: "יש לי מישהו שאני יכול/ה לדבר איתו כשקשה לי", parentText: "לדעתך, לילדך יש מישהו לדבר איתו כשקשה לו/ה", isReverse: false },
  { id: "qol_21", section: "quality_of_life", subdomain: "self_regard", studentText: "אני גאה בעצמי", parentText: "לדעתך, ילדך גאה בעצמו/ה", isReverse: false },
  { id: "qol_22", section: "quality_of_life", subdomain: "belief_in_success", studentText: "אני מאמין/ה שאני יכול/ה להצליח", parentText: "לדעתך, ילדך מאמין/ה שהוא/היא יכול/ה להצליח", isReverse: false },
  { id: "qol_23", section: "quality_of_life", subdomain: "goal_achievement", studentText: "אני מצליח/ה להשיג מטרות שאני מציב/ה לעצמי", parentText: "לדעתך, ילדך מצליח/ה להשיג מטרות שהוא/היא מציב/ה לעצמו/ה", isReverse: false },
  { id: "qol_24", section: "quality_of_life", subdomain: "self_failure", studentText: "אני מרגיש/ה שאני כישלון", parentText: "לדעתך, ילדך מרגיש/ה שהוא/היא כישלון", isReverse: true },

  // ====== SELF-EFFICACY (8 items) ======
  { id: "se_1", section: "self_efficacy", studentText: "אני מאמין/ה שאני יכול/ה להצליח במשימות שונות", parentText: "לדעתך, ילדך מאמין/ה שהוא/היא יכול/ה להצליח במשימות שונות", isReverse: false },
  { id: "se_2", section: "self_efficacy", studentText: "אני יכול/ה להשיג מטרות שאני מציב/ה לעצמי", parentText: "לדעתך, ילדך יכול/ה להשיג מטרות שהוא/היא מציב/ה", isReverse: false },
  { id: "se_3", section: "self_efficacy", studentText: "אני מרגיש/ה ביטחון כשאני ניגש/ת למשימות קשות", parentText: "לדעתך, ילדך מרגיש/ה ביטחון כשהוא/היא ניגש/ת למשימות קשות", isReverse: false },
  { id: "se_4", section: "self_efficacy", studentText: "אני יכול/ה להתמודד עם אתגרים", parentText: "לדעתך, ילדך יכול/ה להתמודד עם אתגרים", isReverse: false },
  { id: "se_5", section: "self_efficacy", studentText: "אני בטוח/ה שאני יכול/ה לבצע משימות היטב", parentText: "לדעתך, ילדך בטוח/ה שהוא/היא יכול/ה לבצע משימות היטב", isReverse: false },
  { id: "se_6", section: "self_efficacy", studentText: "אני מוצא/ת דרכים להשיג את מה שאני רוצה", parentText: "לדעתך, ילדך מוצא/ת דרכים להשיג את מה שהוא/היא רוצה", isReverse: false },
  { id: "se_7", section: "self_efficacy", studentText: "אני מרגיש/ה ביטחון כשאני מתחיל/ה משימות חדשות", parentText: "לדעתך, ילדך מרגיש/ה ביטחון כשהוא/היא מתחיל/ה משימות חדשות", isReverse: false },
  { id: "se_8", section: "self_efficacy", studentText: "אני מסוגל/ת לתפקד גם במצבים קשים", parentText: "לדעתך, ילדך מסוגל/ת לתפקד גם במצבים קשים", isReverse: false },

  // ====== LOCUS OF CONTROL (10 items) ======
  { id: "loc_1", section: "locus_of_control", subdomain: "internal", studentText: "אני יכול/ה להשפיע על מה שקורה לי", parentText: "לדעתך, ילדך מרגיש/ה שהוא/היא יכול/ה להשפיע על מה שקורה לו/ה", isReverse: false },
  { id: "loc_2", section: "locus_of_control", subdomain: "internal", studentText: "ההצלחה שלי תלויה במאמץ שלי", parentText: "לדעתך, ילדך מאמין/ה שההצלחה שלו/ה תלויה במאמץ", isReverse: false },
  { id: "loc_3", section: "locus_of_control", subdomain: "internal", studentText: "אני יכול/ה לפתור בעיות בעצמי", parentText: "לדעתך, ילדך יכול/ה לפתור בעיות בעצמו/ה", isReverse: false },
  { id: "loc_4", section: "locus_of_control", subdomain: "internal", studentText: "אני יכול/ה להשפיע על אנשים סביבי", parentText: "לדעתך, ילדך יכול/ה להשפיע על אנשים סביבו/ה", isReverse: false },
  { id: "loc_5", section: "locus_of_control", subdomain: "internal", studentText: "אני יכול/ה לקבל החלטות חשובות בעצמי", parentText: "לדעתך, ילדך יכול/ה לקבל החלטות חשובות בעצמו/ה", isReverse: false },
  { id: "loc_6", section: "locus_of_control", subdomain: "external", studentText: "דברים קורים לי בעיקר בגלל מזל", parentText: "לדעתך, ילדך מאמין/ה שדברים קורים בעיקר בגלל מזל", isReverse: true },
  { id: "loc_7", section: "locus_of_control", subdomain: "external", studentText: "אין לי שליטה על מה שקורה לי", parentText: "לדעתך, ילדך מרגיש/ה שאין לו/ה שליטה על מה שקורה", isReverse: true },
  { id: "loc_8", section: "locus_of_control", subdomain: "external", studentText: "אחרים קובעים מה יקרה לי", parentText: "לדעתך, ילדך מרגיש/ה שאחרים קובעים מה יקרה לו/ה", isReverse: true },
  { id: "loc_9", section: "locus_of_control", subdomain: "external", studentText: "אני לא יכול/ה לשנות מצבים בחיים שלי", parentText: "לדעתך, ילדך מרגיש/ה שהוא/היא לא יכול/ה לשנות מצבים", isReverse: true },
  { id: "loc_10", section: "locus_of_control", subdomain: "external", studentText: "אין לי בחירה אמיתית במה שקורה לי", parentText: "לדעתך, ילדך מרגיש/ה שאין לו/ה בחירה אמיתית", isReverse: true },

  // ====== COGNITIVE FLEXIBILITY (10 items) ======
  { id: "cf_1", section: "cognitive_flexibility", subdomain: "perspective_taking", studentText: "אני מצליח/ה להסתכל על מצבים מזוויות שונות", parentText: "לדעתך, ילדך מצליח/ה להסתכל על מצבים מזוויות שונות", isReverse: false },
  { id: "cf_2", section: "cognitive_flexibility", subdomain: "perspective_taking", studentText: "אני מבין/ה את נקודת המבט של אנשים אחרים", parentText: "לדעתך, ילדך מבין/ה את נקודת המבט של אחרים", isReverse: false },
  { id: "cf_3", section: "cognitive_flexibility", subdomain: "multiple_options", studentText: "אני שוקל/ת כמה אפשרויות לפני שאני מחליט/ה", parentText: "לדעתך, ילדך שוקל/ת כמה אפשרויות לפני שהוא/היא מחליט/ה", isReverse: false },
  { id: "cf_4", section: "cognitive_flexibility", subdomain: "problem_solving", studentText: "אני חושב/ת על יותר מפתרון אחד לבעיה", parentText: "לדעתך, ילדך חושב/ת על יותר מפתרון אחד לבעיה", isReverse: false },
  { id: "cf_5", section: "cognitive_flexibility", subdomain: "multiple_options", studentText: "אני שוקל/ת אפשרויות רבות לפני שאני מגיב/ה למצבים קשים", parentText: "לדעתך, ילדך שוקל/ת אפשרויות לפני שהוא/היא מגיב/ה למצבים קשים", isReverse: false },
  { id: "cf_6", section: "cognitive_flexibility", subdomain: "systematic_thinking", studentText: "אני מנסה לחשוב על מצבים קשים בצורה מסודרת", parentText: "לדעתך, ילדך מנסה לחשוב על מצבים קשים בצורה מסודרת", isReverse: false },
  { id: "cf_7", section: "cognitive_flexibility", subdomain: "difficulty_deciding", studentText: "קשה לי להחליט במצבים קשים", parentText: "לדעתך, קשה לילדך להחליט במצבים קשים", isReverse: true },
  { id: "cf_8", section: "cognitive_flexibility", subdomain: "losing_control", studentText: "אני מאבד/ת שליטה במצבים קשים", parentText: "לדעתך, ילדך מאבד/ת שליטה במצבים קשים", isReverse: true },
  { id: "cf_9", section: "cognitive_flexibility", subdomain: "helplessness", studentText: "אני לא יודע/ת מה לעשות במצבים קשים", parentText: "לדעתך, ילדך לא יודע/ת מה לעשות במצבים קשים", isReverse: true },
  { id: "cf_10", section: "cognitive_flexibility", subdomain: "rigidity", studentText: "אני מרגיש/ה שאני לא יכול/ה לשנות דברים במצבים קשים", parentText: "לדעתך, ילדך מרגיש/ה שהוא/היא לא יכול/ה לשנות דברים במצבים קשים", isReverse: true },
];

export const ITEMS_PER_PAGE = 4;

export const sectionOrder: Array<{ section: string; label: string }> = [
  { section: "quality_of_life", label: "איכות חיים" },
  { section: "self_efficacy", label: "מסוגלות עצמית" },
  { section: "locus_of_control", label: "מיקוד שליטה" },
  { section: "cognitive_flexibility", label: "גמישות קוגניטיבית" },
];

export const likertLabels = [
  { value: 1, label: "לא מסכים/ה בכלל" },
  { value: 2, label: "לא מסכים/ה" },
  { value: 3, label: "ככה ככה" },
  { value: 4, label: "מסכים/ה" },
  { value: 5, label: "מסכים/ה מאוד" },
];
