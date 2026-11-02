export function genderize(text: string, parentRole?: string | null, childGender?: string | null): string {
  if (!text) return text;
  let t = text;
  const mom = parentRole === "mother", girl = childGender === "daughter";
  const sub = (pairs: [string, string][]) => { for (const [a, b] of pairs) t = t.replace(new RegExp(`(^|[^\\u0590-\\u05FF])${a}(?=$|[^\\u0590-\\u05FF])`, "g"), `$1${b}`); };
  if (girl) sub([["הבן", "הבת"], ["בן", "בת"], ["קרא", "קראה"], ["נכנס", "נכנסת"], ["מסתכל", "מסתכלת"], ["עונה", "עונה"]]);
  if (mom) sub([["האב", "האם"], ["אבא", "אמא"], ["אתה", "את"], ["מבין", "מבינה"], ["תעזוב", "תעזבי"], ["שואל", "שואלת"], ["חושב", "חושבת"], ["שלך", "שלך"], ["עליך", "עלייך"], ["איתך", "איתך"], ["מגיב", "מגיבה"], ["נפגע", "נפגעת"]]);
  return t;
}
