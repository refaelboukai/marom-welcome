/**
 * Digital enrollment form definition — mirrors the official Beit Ekstein
 * "קליטת תלמיד חדש" paper packet (forms 2, 4, 5, 6, 7, 9 + MoE health declaration).
 */

export type FieldType =
  | "text" | "tel" | "email" | "date" | "number"
  | "select" | "textarea" | "checkbox" | "checkboxGroup" | "yesno" | "radio" | "note" | "file" | "signature";

export interface FormField {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  placeholder?: string;
  full?: boolean;
  /** allow several files (type: "file") */
  multiple?: boolean;
  /** accept attribute for uploads (type: "file") */
  accept?: string;
  /** show only when another field has this value */
  showIf?: { key: string; equals: string | boolean };
  /** static explanatory text (type: "note") */
  text?: string;
}

export interface FormGroup {
  key: string;
  title: string;
  description?: string;
  fields: FormField[];
}

export interface FormStep {
  key: string;
  label: string;
  icon: "user" | "users" | "stethoscope" | "heart" | "shield" | "signature";
  groups: FormGroup[];
}

/** Keys stored as real table columns (everything else goes into form_data). */
export const COLUMN_KEYS = [
  "student_first_name", "student_last_name", "student_id_number", "birth_date", "gender",
  "grade", "address", "city", "student_phone", "previous_school",
  "parent1_name", "parent1_phone", "parent1_email", "parent1_id_number",
  "parent2_name", "parent2_phone", "parent2_email", "family_status", "siblings",
  "medical_allergies", "medical_medications", "medical_conditions", "medical_diagnoses",
  "medical_treatments", "emergency_contact_name", "emergency_contact_phone", "health_fund",
  "signature_name", "signature_id_number", "student_signature_name", "extra_notes", "academic_year",
] as const;

const YESNO = ["כן", "לא"];

export const GRADES = ["ז", "ח", "ט", "י", "יא", "יב"];

export const CHRONIC_CONDITIONS = [
  "מחלת מעיים — קרוהן", "מחלת מעיים — קוליטיס", "מחלת עור", "ניוון שרירים — דושן",
  "סוכרת מסוג 1", "אסטמה", "אפילפסיה", "בעיה קרדיולוגית", "מושתל אברים",
  "מחלה ממארת", "צליאק", "קרישיות דם — המופיליה", "קרישיות דם — טרומבוציטופניה",
  "G6PD", "בעיה כרונית אחרת",
];

export const ALLERGENS = [
  "חלב", "ביצים", "בוטנים", "אגוזים", "שקדים", "שומשום", "סויה", "פול", "גלוטן (חיטה)",
  "דגים", "קיווי", "דבש", "שמרים", "יוד", "לטקס", "צמחים (אבקנים)", "קרדית אבק הבית",
  "עקיצת דבורים", "עקיצת צרעות", "עקיצת יתושים", "חומר/מזון אחר",
];

export const ACTIVITY_LIMITS = [
  "טיול", "פעילות בחדר כושר", "פעילות גופנית", "תחרות ספורט של בתי הספר", "פעילות אחרת",
];

export const DIAGNOSES = [
  "לקות למידה", "קשיי קשב וריכוז", "קשיים רגשיים", "קשיים התנהגותיים", "קשיי תקשורת",
];

export const VACCINES = [
  "MMRV (חצבת, חזרת, אדמת, אבעבועות רוח)",
  "Tdap-IPV (טטנוס, דיפתריה, שעלת, פוליו)",
  "חיסון שפעת עונתי",
  "HPV (נגיף הפפילומה)",
];

export const SCREENING_TESTS = ["בדיקת ראייה", "בדיקת שמיעה", "בדיקת שיניים", "מדידת גדילה (גובה ומשקל)"];

export const SCHOOL_RULES: string[] = [
  "חובה לכבד את הצוות החינוכי של הכיתה ואת כל צוות בית הספר ולפעול לפי הוראותיהם.",
  "חובה להשתתף בכל סדר היום הבית ספרי ולהגיע עם הציוד הנדרש ללמידה.",
  "חל איסור להתנהג באלימות פיזית ומילולית (קללות, הצקות, הטרדות, משחקי ידיים וכדומה), ואסור לפגוע ברכוש של אחרים או ברכוש בית הספר. השחתת רכוש תחייב עבודות תיקון או גבייה מההורים בעבור הנזק.",
  "חל איסור על פעילויות הפוגעות בגוף או בבריאות, כגון עישון, אלכוהול וחתכים בגוף.",
  "חל איסור על יציאה משטח בית הספר בשעות הלימודים, למעט פעילויות חינוכיות מאושרות ובליווי הצוות.",
  "חובה לשמור על הופעה המכבדת את עצמכם, את גופכם ואת הסביבה (בגדים שאינם חושפים מעבר לכתף, חזה, בטן וברכיים), ואין להגיע עם כפכפי אצבע.",
  "חובה לשמור ולכבד את מרחב גופו ופרטיותו של כל ילד בבית הספר; אסורה כל נגיעה מינית, בהסכמה או שלא בהסכמה.",
  "חל איסור חמור להתייחד עם אדם נוסף במקומות נסתרים, בחדרי שירותים או בכל שטח בית הספר.",
  "שכבה בוגרת: טלפונים ניידים אסורים לשימוש במהלך השיעורים ונשמרים אצל צוות הכיתה. שכבת ביניים וצעירה: הטלפונים נמצאים אצל צוות הכיתה במהלך כל יום הלימודים.",
  "חובה על-פי חוק ועל-פי כללי בית הספר לדווח מיד לצוות החינוכי על כל פגיעה באחד הילדים, בין שנעשתה כלפיך ובין שכלפי אחר.",
];

const person = (prefix: string, title: string): FormField[] => [
  { key: `${prefix}_name`, label: "שם", type: "text" },
  { key: `${prefix}_phone`, label: "טלפון", type: "tel" },
  { key: `${prefix}_email`, label: "דוא״ל", type: "email" },
];

export const FORM_STEPS: FormStep[] = [
  {
    key: "student",
    label: "פרטי התלמיד/ה",
    icon: "user",
    groups: [
      {
        key: "basic",
        title: "פרטי הרשמה",
        description: "טופס הרשמה ופרטים אישיים לתלמיד/ה חדש/ה — בית ספר מרום, בית אקשטיין יבנה.",
        fields: [
          { key: "academic_year", label: "שנת הלימודים", type: "select", options: ['תשפ"ו', 'תשפ"ז', 'תשפ"ח'], required: true },
          { key: "grade", label: "כיתה", type: "select", options: GRADES, required: true },
          { key: "student_first_name", label: "שם פרטי", type: "text", required: true },
          { key: "student_last_name", label: "שם משפחה", type: "text", required: true },
          { key: "student_id_number", label: "תעודת זהות", type: "text", required: true },
          { key: "birth_date", label: "תאריך לידה", type: "date" },
          { key: "birth_country", label: "ארץ לידה", type: "text" },
          { key: "immigration_date", label: "תאריך עלייה", type: "date" },
          { key: "gender", label: "מין", type: "select", options: ["זכר", "נקבה"] },
          { key: "address", label: "כתובת מגורים", type: "text" },
          { key: "city", label: "יישוב", type: "text" },
          { key: "health_fund", label: "קופת חולים", type: "select", options: ["כללית", "מכבי", "מאוחדת", "לאומית", "אחר"] },
          { key: "home_phone", label: "טלפון בית", type: "tel" },
          { key: "student_phone", label: "נייד התלמיד/ה", type: "tel" },
          { key: "student_email", label: "דוא״ל התלמיד/ה", type: "email" },
          { key: "previous_school", label: "בית ספר קודם", type: "text" },
        ],
      },
      {
        key: "documents",
        title: "מסמכים לצירוף",
        description: "יש לצלם או לסרוק את המסמכים ולהעלות אותם. חובה לצלם את תעודת הזהות הדיגיטלית משני הצדדים — צד קדמי וצד אחורי. הקבצים נשמרים באחסון מאובטח של בית הספר ונגישים לצוות המזכירות בלבד (עד 10MB לקובץ).",
        fields: [
          { key: "doc_student_photo", label: "תמונת פספורט של התלמיד/ה", type: "file", accept: "image/*", full: true },
          { key: "doc_student_id", label: "צילום תעודת זהות של התלמיד/ה — צד קדמי (אם קיימת)", type: "file", accept: "image/*,application/pdf", multiple: true, full: true },
          { key: "doc_student_id_back", label: "צילום תעודת זהות של התלמיד/ה — צד אחורי (אם קיימת)", type: "file", accept: "image/*,application/pdf", multiple: true, full: true },
          { key: "doc_parent_id", label: "צילום תעודת זהות של ההורה — צד קדמי", type: "file", accept: "image/*,application/pdf", multiple: true, full: true },
          { key: "doc_parent_id_back", label: "צילום תעודת זהות של ההורה — צד אחורי (תעודה דיגיטלית: חובה)", type: "file", accept: "image/*,application/pdf", multiple: true, full: true },
          { key: "doc_id_appendix", label: "צילום ספח תעודת הזהות (כולל פרטי הילדים)", type: "file", accept: "image/*,application/pdf", multiple: true, full: true },
        ],
      },
    ],
  },
  {
    key: "parents",
    label: "הורים ומשפחה",
    icon: "users",
    groups: [
      {
        key: "parent1",
        title: "הורה 1",
        fields: [
          { key: "parent1_name", label: "שם ההורה", type: "text", required: true },
          { key: "parent1_id_number", label: "תעודת זהות", type: "text" },
          { key: "family_status", label: "מצב משפחתי", type: "select", options: ["נשואים", "גרושים", "פרודים", "אלמן/ה", "הורה יחיד", "אחר"] },
          { key: "parent1_occupation", label: "מקצוע", type: "text" },
          { key: "parent1_education", label: "השכלה", type: "text" },
          { key: "parent1_workplace", label: "מקום עבודה", type: "text" },
          { key: "parent1_work_phone", label: "טלפון בעבודה", type: "tel" },
          { key: "parent1_phone", label: "נייד אישי", type: "tel", required: true },
          { key: "parent1_email", label: "דואר אלקטרוני", type: "email" },
        ],
      },
      {
        key: "parent2",
        title: "הורה 2",
        fields: [
          { key: "parent2_name", label: "שם ההורה", type: "text" },
          { key: "parent2_id_number", label: "תעודת זהות", type: "text" },
          { key: "parent2_occupation", label: "מקצוע", type: "text" },
          { key: "parent2_education", label: "השכלה", type: "text" },
          { key: "parent2_workplace", label: "מקום עבודה", type: "text" },
          { key: "parent2_work_phone", label: "טלפון בעבודה", type: "tel" },
          { key: "parent2_phone", label: "נייד אישי", type: "tel" },
          { key: "parent2_email", label: "דואר אלקטרוני", type: "email" },
        ],
      },
      {
        key: "guardian",
        title: "אפוטרופוס",
        description: "יש למלא רק אם ההורים אינם האפוטרופוס של התלמיד/ה.",
        fields: [
          { key: "guardian_name", label: "שם האפוטרופוס", type: "text" },
          { key: "guardian_phone", label: "טלפון", type: "tel" },
          { key: "guardian_mobile", label: "נייד", type: "tel" },
          { key: "guardian_address", label: "כתובת", type: "text" },
          { key: "guardian_email", label: "דואר אלקטרוני", type: "email" },
        ],
      },
      {
        key: "family",
        title: "אחים, אחיות ואנשי קשר",
        fields: [
          { key: "siblings", label: "אחים ואחיות (שם ותאריך לידה בכל שורה)", type: "textarea", full: true },
          { key: "significant_contacts", label: "דמויות משמעותיות נוספות למקרה חירום (שם וטלפון בכל שורה)", type: "textarea", full: true },
          { key: "emergency_contact_name", label: "איש קשר לחירום — שם מלא", type: "text", required: true },
          { key: "emergency_contact_phone", label: "איש קשר לחירום — טלפון", type: "tel", required: true },
          { key: "emergency_contact2_name", label: "איש קשר נוסף — שם מלא", type: "text" },
          { key: "emergency_contact2_phone", label: "איש קשר נוסף — טלפון", type: "tel" },
          { key: "updates_notes", label: "עדכונים או שינויים שחשוב שביה\"ס יידע (כתובת, טיפול תרופתי ועוד)", type: "textarea", full: true },
        ],
      },
    ],
  },
  {
    key: "care",
    label: "גורמים מטפלים ואבחנה",
    icon: "stethoscope",
    groups: [
      {
        key: "therapists",
        title: "התלמיד/ה מטופל/ת על ידי",
        fields: [
          ...person("psychologist", "פסיכולוג/ית").map((f, i) => ({ ...f, label: `פסיכולוג/ית — ${f.label}` })),
          ...person("psychiatrist", "פסיכיאטר/ית").map((f) => ({ ...f, label: `פסיכיאטר/ית — ${f.label}` })),
          ...person("social_worker", "עו״ס").map((f) => ({ ...f, label: `עו״ס — ${f.label}` })),
          ...person("other_therapist", "אחר").map((f) => ({ ...f, label: `גורם מטפל נוסף — ${f.label}` })),
        ],
      },
      {
        key: "diagnosis",
        title: "אבחנה ורקע",
        fields: [
          { key: "medical_diagnoses_list", label: "אבחנות (ניתן לסמן יותר מאחת)", type: "checkboxGroup", options: DIAGNOSES, full: true },
          { key: "medical_diagnoses", label: "פירוט האבחנות והמסמכים הקיימים", type: "textarea", full: true },
          { key: "medical_treatments", label: "טיפולים נוכחיים (רגשי, פארא-רפואי וכו')", type: "textarea", full: true },
          { key: "medical_conditions", label: "מגבלות רפואיות", type: "textarea", full: true },
        ],
      },
      {
        key: "meds",
        title: "טיפול תרופתי במסגרת בית הספר",
        description: "למתן תרופה בבית הספר יש לצרף אישור רופא. הבקשה תקפה לשנת לימודים אחת.",
        fields: [
          { key: "meds_request", label: "האם אתם מבקשים שבית הספר ייתן תרופה לתלמיד/ה?", type: "yesno", full: true },
          { key: "medical_medications", label: "שם התרופה", type: "text", showIf: { key: "meds_request", equals: "כן" } },
          { key: "meds_dosage", label: "מינון / במקרים כגון", type: "text", showIf: { key: "meds_request", equals: "כן" } },
          { key: "meds_side_effects", label: "תופעות לוואי אפשריות", type: "text", showIf: { key: "meds_request", equals: "כן" } },
          { key: "meds_contact", label: "למי להודיע במקרה של תופעות לוואי (שם וטלפון)", type: "text", showIf: { key: "meds_request", equals: "כן" } },
          { key: "meds_from", label: "בתוקף מתאריך", type: "date", showIf: { key: "meds_request", equals: "כן" } },
          { key: "meds_to", label: "עד תאריך", type: "date", showIf: { key: "meds_request", equals: "כן" } },
          { key: "meds_doctor_approval", label: "אנו מצהירים כי אישור הרופא המטפל יימסר לבית הספר", type: "checkbox", full: true, showIf: { key: "meds_request", equals: "כן" } },
        ],
      },
      {
        key: "doctor_order",
        title: "פרטי הוראת רופא/ה למתן טיפול תרופתי (טופס 8)",
        description: "יש למלא על פי ההוראה הרפואית החתומה. את ההוראה המקורית החתומה יש להעביר לבית הספר.",
        fields: [
          { key: "dr_diagnosis", label: "אבחנה רפואית", type: "text", showIf: { key: "meds_request", equals: "כן" } },
          { key: "dr_frequency", label: "תדירות / מאפייני האירועים", type: "text", showIf: { key: "meds_request", equals: "כן" } },
          { key: "dr_drug_latin", label: "שם התרופה (בלטינית)", type: "text", showIf: { key: "meds_request", equals: "כן" } },
          { key: "dr_dosage", label: "מינון ואופן מתן", type: "text", showIf: { key: "meds_request", equals: "כן" } },
          { key: "dr_emergency_instructions", label: "הנחיות לתופעות לוואי ולמצבי חירום", type: "textarea", full: true, showIf: { key: "meds_request", equals: "כן" } },
          { key: "dr_valid_until", label: "תוקף ההוראה עד תאריך", type: "date", showIf: { key: "meds_request", equals: "כן" } },
          { key: "dr_name", label: "שם הרופא/ה", type: "text", showIf: { key: "meds_request", equals: "כן" } },
          { key: "dr_license", label: "מספר רישיון", type: "text", showIf: { key: "meds_request", equals: "כן" } },
          { key: "dr_institution", label: "מוסד רפואי / מרפאה", type: "text", showIf: { key: "meds_request", equals: "כן" } },
          { key: "dr_phone", label: "טלפון הרופא/ה", type: "tel", showIf: { key: "meds_request", equals: "כן" } },
        ],
      },
    ],
  },
  {
    key: "health",
    label: "הצהרת בריאות",
    icon: "heart",
    groups: [
      {
        key: "health_decl",
        title: "הצהרת בריאות שנתית — משרד החינוך",
        description: "מתן מידע מלא ומפורט יאפשר לצוות החינוכי לדעת על מגבלות רפואיות שונות. יש לצרף מסמכים רפואיים רלוונטיים.",
        fields: [
          { key: "h_activity_limit", label: "1. האם קיימת מגבלה בריאותית המונעת השתתפות בפעילות בית ספרית?", type: "yesno", full: true },
          { key: "h_activity_types", label: "סוג הפעילות המוגבלת", type: "checkboxGroup", options: ACTIVITY_LIMITS, full: true, showIf: { key: "h_activity_limit", equals: "כן" } },
          { key: "h_activity_details", label: "פירוט המגבלה והאישור הרפואי", type: "textarea", full: true, showIf: { key: "h_activity_limit", equals: "כן" } },
          { key: "h_chronic", label: "2. האם קיימת בעיה בריאותית כרונית?", type: "yesno", full: true },
          { key: "h_chronic_types", label: "סוג הבעיה", type: "checkboxGroup", options: CHRONIC_CONDITIONS, full: true, showIf: { key: "h_chronic", equals: "כן" } },
          { key: "h_chronic_details", label: "פירוט", type: "textarea", full: true, showIf: { key: "h_chronic", equals: "כן" } },
          { key: "h_regular_meds", label: "3. האם התלמיד/ה נוטל/ת תרופות באופן קבוע?", type: "yesno", full: true },
          { key: "h_regular_meds_details", label: "פירוט התרופות", type: "textarea", full: true, showIf: { key: "h_regular_meds", equals: "כן" } },
          { key: "h_drug_allergy", label: "4. האם קיימת רגישות לתרופות?", type: "yesno", full: true },
          { key: "h_drug_allergy_details", label: "פירוט", type: "textarea", full: true, showIf: { key: "h_drug_allergy", equals: "כן" } },
          { key: "h_food_allergy", label: "5. האם קיימת רגישות למזון או לחומרים אחרים?", type: "yesno", full: true },
          { key: "medical_allergies_list", label: "סוג הרגישות", type: "checkboxGroup", options: ALLERGENS, full: true, showIf: { key: "h_food_allergy", equals: "כן" } },
          { key: "medical_allergies", label: "פירוט הרגישות", type: "textarea", full: true, showIf: { key: "h_food_allergy", equals: "כן" } },
          { key: "h_epipen", label: "6. האם התלמיד/ה נושא/ת מזרק אפיפן אישי?", type: "yesno", full: true },
          { key: "h_sms_consent", label: "7. הסכמה לקבלת מסרון ודוא\"ל על חיסונים, בדיקות סקר ותוצאות במסגרת שירותי בריאות התלמיד", type: "yesno", full: true },
          { key: "h_vaccines_consent", label: "8. ידוע לי שבמסגרת שירותי הבריאות לתלמיד יינתן לבני/בתי חיסון לפי תוכנית משרד הבריאות", type: "yesno", full: true },
          { key: "h_extra_info", label: "מידע נוסף על בריאות ילדי שברצוני ליידע את בית הספר", type: "textarea", full: true },
          { key: "h_declaration", label: "אני מאשר/ת מתן מידע והעברת הצהרת הבריאות לצוות החינוכי ולצוות בריאות התלמיד, ומתחייב/ת להודיע למחנך/ת על כל שינוי במצב הבריאותי", type: "checkbox", required: true, full: true },
        ],
      },
      {
        key: "vaccines",
        title: "חיסונים ובדיקות סקר (טופס 4)",
        description: "החיסונים ובדיקות הסקר ניתנים במסגרת שירותי הבריאות לתלמיד, בהתאם לשכבת הגיל ולתוכנית משרד הבריאות.",
        fields: [
          { key: "v_consent", label: "אני מאשר/ת מתן חיסונים לבני/בתי במסגרת שירותי הבריאות לתלמיד", type: "yesno", full: true },
          { key: "v_vaccines_list", label: "החיסונים שאני מאשר/ת (לפי שכבת הגיל)", type: "checkboxGroup", options: VACCINES, full: true, showIf: { key: "v_consent", equals: "כן" } },
          { key: "v_refusal_reason", label: "נימוק לאי-הסכמה למתן חיסונים", type: "textarea", full: true, showIf: { key: "v_consent", equals: "לא" } },
          { key: "v_screening_consent", label: "אני מאשר/ת ביצוע בדיקות סקר", type: "yesno", full: true },
          { key: "v_screening_list", label: "בדיקות הסקר שאני מאשר/ת", type: "checkboxGroup", options: SCREENING_TESTS, full: true, showIf: { key: "v_screening_consent", equals: "כן" } },
          { key: "v_past_reaction", label: "האם הייתה בעבר תגובה חריגה לחיסון?", type: "yesno", full: true },
          { key: "v_past_reaction_details", label: "פירוט התגובה החריגה", type: "textarea", full: true, showIf: { key: "v_past_reaction", equals: "כן" } },
          { key: "v_booklet_commit", label: "אני מתחייב/ת להעביר לבית הספר צילום של פנקס החיסונים", type: "checkbox", full: true },
        ],
      },
    ],
  },
  {
    key: "consents",
    label: "הצהרות והסכמות",
    icon: "shield",
    groups: [
      {
        key: "confidentiality",
        title: "ויתור סודיות (טופס 9)",
        description: "אני מביע/ה את הסכמתי שצוות ביה\"ס יקבל ויעיין בכל חומר הנדרש לטיפול בבני/בתי, כגון:",
        fields: [
          { key: "c_edu_opinion", label: "חוות דעת חינוכית", type: "checkbox", full: true },
          { key: "c_psych_opinion", label: "חוות דעת אבחון פסיכולוגי", type: "checkbox", full: true },
          { key: "c_medical_opinion", label: "חוות דעת רפואית", type: "checkbox", full: true },
          { key: "c_therapy_opinion", label: "חוות דעת טיפולית/ייעוצית", type: "checkbox", full: true },
        ],
      },
      {
        key: "therapy_consent",
        title: "אישור הורים לטיפול (טופס 6)",
        description: "במסגרת תוכנית התמיכות האישית ייתכן שיומלץ על תמיכה טיפולית על ידי איש טיפול במסגרת ביה\"ס.",
        fields: [
          { key: "c_therapy", label: "אני מאשר/ת כי בני/בתי יקבל/תקבל תמיכה טיפולית בבית הספר בשנה\"ל זו", type: "checkbox", full: true },
          { key: "c_therapy_type", label: "סוג הטיפול שהומלץ (אם ידוע)", type: "text", full: true },
        ],
      },
      {
        key: "photos",
        title: "אישור צילום ופרסום תמונות (טופס 5)",
        fields: [
          { key: "c_photos", label: "אני מסכים/ה לצילום בני/בתי במהלך פעילויות בית ספריות ולפרסום התמונות ו/או סרט והצגתם בפני הורים / משרד החינוך / ארגון בית אקשטיין", type: "checkbox", full: true },
        ],
      },
      {
        key: "ai_tools",
        title: "שימוש בכלי בינה יוצרת לצרכים פדגוגיים — משרד החינוך",
        description: "השימוש יהיה לצרכים פדגוגיים בלבד, בהתאם לגיל, תחת הדרכת מבוגר או מורה אחראי/ת, ובהתאם להמלצות משרד החינוך לשימוש אחראי ומאובטח.",
        fields: [
          { key: "c_ai_tools", label: "אני מאשר/ת את השימוש של בני/בתי בכלי בינה יוצרת בבית הספר בהתאם לעקרונות שלעיל", type: "checkbox", full: true },
        ],
      },
      {
        key: "short_sunday",
        title: "קיצור יום הלימודים בימי ראשון",
        description: "בית הספר בוחן סיום יום הלימודים בשעה 13:00 בימי ראשון, לצורך הכשרה ופיתוח מקצועי של צוותי ההוראה והטיפול. הסעות יסופקו בהתאם. תלמיד/ה שהוריו אינם מעוניינים בקיצור יישאר/תישאר במסגרת עד 15:30 בליווי צוות.",
        fields: [
          { key: "c_short_sunday", label: "עמדתכם בנוגע לקיצור יום הלימודים בימי ראשון", type: "radio", options: ["מסכים/ה", "לא מסכים/ה"], full: true },
        ],
      },
      {
        key: "rules",
        title: "כללי התנהגות בבית הספר",
        fields: [
          { key: "rules_note", label: "", type: "note", full: true, text: "rules" },
          { key: "c_rules", label: "קראנו את כללי ההתנהגות, אנו מסכימים להם ומתחייבים לפעול לפיהם", type: "checkbox", required: true, full: true },
        ],
      },
    ],
  },
  {
    key: "signature",
    label: "חתימה ואישור",
    icon: "signature",
    groups: [
      {
        key: "sign",
        title: "חתימה דיגיטלית",
        description: "החתימה הדיגיטלית מהווה אישור לכל הפרטים וההצהרות שמולאו בטופס זה.",
        fields: [
          { key: "signature_name", label: "שם מלא (הורה / אפוטרופוס)", type: "text", required: true },
          { key: "signature_id_number", label: "תעודת זהות של החותם/ת", type: "text", required: true },
          { key: "signature_draw", label: "חתימת ההורה / אפוטרופוס (חתימה ידנית)", type: "signature", required: true, full: true },
          { key: "student_signature_name", label: "שם התלמיד/ה (חתימה על כללי ההתנהגות)", type: "text" },
          { key: "student_signature_draw", label: "חתימת התלמיד/ה (חתימה ידנית)", type: "signature", full: true },
          { key: "extra_notes", label: "הערות נוספות", type: "textarea", full: true },
          { key: "c_accuracy", label: "אנו מצהירים כי כל הפרטים שמסרנו נכונים ומלאים, ומתחייבים לעדכן את בית הספר בכל שינוי", type: "checkbox", required: true, full: true },
        ],
      },
    ],
  },
];
