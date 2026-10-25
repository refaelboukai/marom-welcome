/** Staff self-report adapted from the eight QoL dimensions in the supplied document. Not a validated assessment. */

export type StaffQolDomain = "emotional" | "interpersonal" | "material" | "development" | "physical" | "self_determination" | "inclusion" | "rights";

export interface StaffQolItem {
  id: string;
  domain: StaffQolDomain;
  text: string;
  isReverse?: boolean;
}

export const STAFF_QOL_DOMAINS: { key: StaffQolDomain; label: string; short: string; description: string; color: string }[] = [
  { key: "emotional", label: "רווחה רגשית", short: "רוגע, ביטחון, סיפוק והתמודדות עם רגשות.", description: "רווחה רגשית משקפת תחושת ביטחון וסיפוק בחיים ובעבודה, ואת המשאבים הזמינים להתמודדות עם לחץ.", color: "hsl(var(--primary))" },
  { key: "interpersonal", label: "יחסים בין־אישיים", short: "קשרים משמעותיים, קרבה ותמיכה.", description: "יחסים בין־אישיים כוללים קשרים עם משפחה, חברים ועמיתים, ואפשרות לקבל ולתת תמיכה.", color: "hsl(var(--info))" },
  { key: "material", label: "רווחה חומרית", short: "תנאים, משאבים וסביבת חיים ועבודה.", description: "רווחה חומרית מתייחסת לנגישות למשאבים לצרכים האישיים ולתנאים ולציוד הדרושים לעבודה נוחה ובטוחה.", color: "hsl(var(--warning))" },
  { key: "development", label: "התפתחות אישית", short: "פיתוח יכולות, מיומנויות ומימוש עצמי.", description: "התפתחות אישית משקפת הזדמנויות לצמוח, לפתח מיומנויות אישיות ומקצועיות ולהשתמש בחוזקות.", color: "hsl(var(--success))" },
  { key: "physical", label: "רווחה פיזית", short: "בריאות, שינה, תזונה, תנועה ופנאי.", description: "רווחה פיזית כוללת תחושה גופנית, מנוחה ואנרגיה, נגישות לטיפול ושגרות של תזונה, תנועה ופנאי.", color: "hsl(var(--info))" },
  { key: "self_determination", label: "הכוונה עצמית", short: "בחירה, החלטות, מטרות והשפעה.", description: "הכוונה עצמית היא האפשרות לבחור, לקבל החלטות ולהשפיע על החיים האישיים ועל העבודה בהתאם לרצונות ולמטרות.", color: "hsl(var(--primary))" },
  { key: "inclusion", label: "הכלה חברתית", short: "שייכות, קבלה והשתתפות בקהילה.", description: "הכלה חברתית משקפת קבלה ושייכות בצוות ובקהילה, לצד הזדמנות להשתתף באופן שמתאים לצרכים ולהעדפות.", color: "hsl(var(--success))" },
  { key: "rights", label: "זכויות", short: "כבוד, הוגנות, פרטיות והשמעת קול.", description: "זכויות כוללות יחס מכבד ושוויוני, שמירה על פרטיות, הקשבה לדעה ונגישות למידע ולמענה בנושאי זכויות.", color: "hsl(var(--warning))" },
];

export const STAFF_QOL_ITEMS: StaffQolItem[] = [
  { id: "emotional_1", domain: "emotional", text: "אני חווה רגעים של שמחה וסיפוק בחיי היום־יום ובעבודה" },
  { id: "emotional_2", domain: "emotional", text: "אני מרגיש/ה רגוע/ה ובטוח/ה בסביבת העבודה שלי" },
  { id: "emotional_3", domain: "emotional", text: "יש לי דרכים שעוזרות לי להתמודד עם עצב, כעס או לחץ" },
  { id: "emotional_4", domain: "emotional", text: "אני מרגיש/ה מוצף/ת רגשית לאורך זמן", isReverse: true },
  { id: "interpersonal_1", domain: "interpersonal", text: "יש בחיי אנשים שאני מרגיש/ה קרוב/ה אליהם" },
  { id: "interpersonal_2", domain: "interpersonal", text: "יש לי אדם שאפשר לשתף בקושי ולקבל ממנו תמיכה" },
  { id: "interpersonal_3", domain: "interpersonal", text: "אני מרוצה מהקשרים שלי עם עמיתים לעבודה" },
  { id: "interpersonal_4", domain: "interpersonal", text: "יש לי זמן והזדמנויות לטפח קשרים עם משפחה או חברים" },
  { id: "material_1", domain: "material", text: "יש לי המשאבים הנדרשים לצרכים הבסיסיים שלי" },
  { id: "material_2", domain: "material", text: "יש לי ציוד וכלים מתאימים לביצוע העבודה שלי" },
  { id: "material_3", domain: "material", text: "יש לי סביבת עבודה נוחה ומותאמת לצרכיי" },
  { id: "material_4", domain: "material", text: "יש לי בבית מקום נעים למנוחה ולזמן אישי" },
  { id: "development_1", domain: "development", text: "אני מכיר/ה את החוזקות והיכולות שלי" },
  { id: "development_2", domain: "development", text: "יש לי הזדמנויות לפתח מיומנויות חדשות שמעניינות אותי" },
  { id: "development_3", domain: "development", text: "אני מקבל/ת משוב או הדרכה שמסייעים לי להתפתח מקצועית" },
  { id: "development_4", domain: "development", text: "אני מרגיש/ה שיש לי אפשרות לממש את היכולות שלי בחיים ובעבודה" },
  { id: "physical_1", domain: "physical", text: "אני מרגיש/ה טוב מבחינה גופנית ברוב הימים" },
  { id: "physical_2", domain: "physical", text: "אני ישן/ה ונח/ה מספיק כדי להרגיש שיש לי אנרגיה" },
  { id: "physical_3", domain: "physical", text: "אני מצליח/ה לשלב אכילה סדירה, תנועה ופעילות פנאי בשגרה" },
  { id: "physical_4", domain: "physical", text: "יש לי אפשרות לקבל טיפול רפואי או התאמות גופניות כשאני זקוק/ה להם" },
  { id: "self_determination_1", domain: "self_determination", text: "אני יכול/ה לבחור ולקבל החלטות בנושאים שחשובים לי" },
  { id: "self_determination_2", domain: "self_determination", text: "יש לי מרחב להפעיל שיקול דעת מקצועי בעבודה" },
  { id: "self_determination_3", domain: "self_determination", text: "אני יכול/ה להציב מטרות אישיות ולפעול לקידומן" },
  { id: "self_determination_4", domain: "self_determination", text: "אני מרגיש/ה שיש לי השפעה על האיזון בין העבודה לחיי האישיים" },
  { id: "inclusion_1", domain: "inclusion", text: "אני מרגיש/ה שייך/ת ומקובל/ת בצוות בית הספר" },
  { id: "inclusion_2", domain: "inclusion", text: "יש לי הזדמנות להשתתף בפעילויות וביוזמות של הצוות" },
  { id: "inclusion_3", domain: "inclusion", text: "אני מרגיש/ה שיש לי מקום בקהילה או בקבוצה מחוץ לעבודה" },
  { id: "inclusion_4", domain: "inclusion", text: "הפעילויות החברתיות נגישות לי ומאפשרות השתתפות שמתאימה לצרכיי" },
  { id: "rights_1", domain: "rights", text: "מתייחסים אליי בכבוד ובהוגנות במקום העבודה" },
  { id: "rights_2", domain: "rights", text: "מקשיבים לדעתי גם כשלא מסכימים איתי" },
  { id: "rights_3", domain: "rights", text: "הפרטיות שלי והמידע האישי שלי נשמרים" },
  { id: "rights_4", domain: "rights", text: "אני יודע/ת למי לפנות כשאני זקוק/ה למידע או למענה בנוגע לזכויותיי" },
];

export interface QolDomainResult {
  key: StaffQolDomain;
  label: string;
  color: string;
  description: string;
  score: number;
  percent: number;
  level: "מתפתח" | "מתגבש" | "יציב" | "גבוה" | "אין מידע";
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
  emotional: { low: ["זהו מצב שמכביד עליכם ובקשו תמיכה מותאמת מקולגה, מהממונה או מאיש/אשת מקצוע.", "שלבו זמן קבוע לפעילות שמרגיעה ומשמחת אתכם."], mid: ["שמרו על הפסקות קצרות ועל שגרות התאוששות אחרי יום עמוס.", "זהו מה מחזק את תחושת הביטחון שלכם וטפחו אותו."], high: ["המשיכו בשגרות שמעניקות לכם רוגע וסיפוק.", "שמרו על גבולות גם בתקופות שבהן אתם מרגישים טוב."] },
  interpersonal: { low: ["בחרו קשר משמעותי אחד וקבעו זמן לשיחה או למפגש.", "חפשו עמית/ה שאפשר להתייעץ איתו/ה באופן קבוע."], mid: ["יזמו קשר עם אדם שהייתם רוצים להתקרב אליו.", "פנו זמן לקשרים מחוץ לעבודה לצד קשרי הצוות."], high: ["טפחו את הקשרים ההדדיים שכבר תומכים בכם.", "שמרו על זמן למפגשים משמעותיים גם בתקופות עומס."] },
  material: { low: ["מפו משאב או ציוד שחסר לכם ופנו לגורם המתאים לבירור מענה.", "אם יש קושי חומרי אישי, שקלו התייעצות חסויה עם גורם סיוע מתאים."], mid: ["בחרו התאמה מעשית אחת שתשפר את סביבת העבודה או המנוחה.", "בדקו אילו משאבים קיימים זמינים לכם ואינם מנוצלים."], high: ["שמרו על תנאי העבודה והמנוחה שמשרתים אתכם.", "היערכו לצרכים משתנים ובקשו התאמות כשנדרש."] },
  development: { low: ["בחרו מיומנות אחת שהייתם רוצים לפתח והגדירו צעד ראשון קטן.", "בקשו הדרכה או משוב ממוקד בתחום שחשוב לכם."], mid: ["הקדישו זמן קבוע להתנסות או ללמידה מקצועית לפי בחירתכם.", "בדקו כיצד להשתמש בחוזקה קיימת במשימה חדשה."], high: ["המשיכו לפתח יכולת שמעניינת אתכם בקצב מתאים.", "שתפו ידע עם עמיתים תוך שמירה על הזמן שלכם."] },
  physical: { low: ["בחרו שינוי קטן וישים בשגרת השינה, הארוחות או המנוחה.", "אם קושי גופני מתמשך, פנו לייעוץ רפואי ובדקו התאמות נדרשות בעבודה."], mid: ["פנו זמן לפעילות גופנית או לפנאי שמתאימים לכם.", "היערכו לימי עומס עם ארוחות והפסקות מתוכננות."], high: ["שמרו על הרגלי הבריאות והמנוחה שתומכים בכם.", "התאימו את השגרה לצרכים גופניים משתנים."] },
  self_determination: { low: ["זהו החלטה אחת שבה חשוב לכם להרחיב את מרחב הבחירה.", "שוחחו עם הממונה על גבולות האחריות והעצמאות המקצועית שלכם."], mid: ["הגדירו מטרה אישית קטנה וצעד שנמצא בשליטתכם.", "הביעו העדפה ברורה לגבי נושא שמשפיע על שגרתכם."], high: ["שמרו על מרחב בחירה שמתאים לערכים ולצרכים שלכם.", "עדכנו מטרות אישיות בהתאם למה שחשוב לכם כעת."] },
  inclusion: { low: ["בחרו מסגרת צוותית או קהילתית אחת שתרצו להשתתף בה.", "שתפו גורם מתאים בחסם שמקשה על ההשתתפות ובקשו התאמה."], mid: ["יזמו השתתפות בפעילות שמתאימה לתחומי העניין שלכם.", "בדקו מה יכול לחזק את תחושת המקום שלכם בקבוצה."], high: ["המשיכו להשתתף במסגרות שמעניקות לכם שייכות.", "תרמו לקבלה ולהשתתפות של אחרים בלי להעמיס על עצמכם."] },
  rights: { low: ["בררו מי הגורם המתאים לפנייה חסויה בנושא פרטיות או יחס לא הוגן.", "בקשו מידע ברור לגבי זכויותיכם ואפשרויות הפנייה העומדות לרשותכם."], mid: ["הבהירו גבול אישי שחשוב לכם לשמור עליו.", "העלו את דעתכם במסגרת שבה אתם מרגישים בטוחים."], high: ["המשיכו לשמור על גבולות ועל פרטיותכם.", "טפחו שיח מכבד שמאפשר גם דעות שונות."] },
};

export interface QolProfile {
  domains: typeof STAFF_QOL_DOMAINS;
  items: StaffQolItem[];
  levelText: Record<string, string>;
  recommendations: typeof RECS;
}

export function computeStaffQolResults(responses: Record<string, number>, profile?: QolProfile) {
  const domainDefinitions = profile?.domains ?? STAFF_QOL_DOMAINS;
  const items = profile?.items ?? STAFF_QOL_ITEMS;
  const domains: QolDomainResult[] = domainDefinitions.map((d) => {
    const scored = items.filter((i) => i.domain === d.key)
      .filter((i) => Number.isInteger(responses[i.id]) && responses[i.id] >= 1 && responses[i.id] <= 5)
      .map((i) => ({ item: i, value: i.isReverse ? 6 - responses[i.id] : responses[i.id] }));
    const score = scored.length ? scored.reduce((s, x) => s + x.value, 0) / scored.length : 0;
    const percent = score ? Math.round(((score - 1) / 4) * 100) : 0;
    const level: QolDomainResult["level"] = !scored.length ? "אין מידע" : score >= 4.3 ? "גבוה" : score >= 3.6 ? "יציב" : score >= 2.8 ? "מתגבש" : "מתפתח";
    const bucket = score >= 4.3 ? "high" : score >= 3.2 ? "mid" : "low";
    const sorted = [...scored].sort((a, b) => b.value - a.value);
    return {
      key: d.key, label: d.label, color: d.color, description: d.description,
      score: Number(score.toFixed(2)), percent, level,
      levelText: !scored.length ? "אין מספיק מידע להערכת התחום. לא חושב ציון, ואין להסיק מכך על קושי או על חוזקה." : (profile?.levelText ?? LEVEL_TEXT)[level],
      recommendations: !scored.length ? ["אספו מידע נוסף בשיחה מכבדת לפני קביעת מענה בתחום זה."] : (profile?.recommendations ?? RECS)[d.key][bucket],
      topItems: sorted.slice(0, 2).map((x) => x.item.text),
      growthItems: sorted.slice(-2).reverse().map((x) => x.item.text),
    };
  });
  const valid = domains.filter((d) => d.score > 0);
  const overall = valid.length ? Number((valid.reduce((s, d) => s + d.score, 0) / valid.length).toFixed(2)) : 0;
  const answered = items.filter((i) => Number.isInteger(responses[i.id]) && responses[i.id] >= 1 && responses[i.id] <= 5).length;
  return { domains, overall, answered, total: items.length };
}
