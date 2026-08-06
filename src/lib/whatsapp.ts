// WhatsApp deep-link helper. Opens the WhatsApp app (mobile) or WhatsApp Web (desktop).
// We rely on wa.me click-to-chat — no API key required.

export const WELCOME_MESSAGE = `ברוכים הבאים לבית הספר

לצורך תהליך קליטה מיטיבי אתם נדרשים למלא את השאלות. אין תשובות נכונות או לא נכונות אלא רק תשובות שנראה לכם מתאימות עבורכם. בהצלחה.

צוות בית הספר`;

export const REMINDER_MESSAGE = `שלום,

תזכורת ידידותית למילוי השאלונים במערכת הקליטה של בית הספר.
המילוי לוקח כמה דקות בלבד ומסייע לנו להכיר אתכם טוב יותר.

תודה,
צוות בית הספר`;

/**
 * Normalize an Israeli phone number to E.164 without the leading "+".
 * - Strips spaces, dashes, parentheses.
 * - Converts leading "0" to country code 972.
 * - Strips a leading "+" if present.
 */
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let p = raw.replace(/[\s\-()]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("00")) p = p.slice(2);
  if (p.startsWith("0")) p = "972" + p.slice(1);
  if (!/^\d{8,15}$/.test(p)) return null;
  return p;
}

/** True on phones/tablets, where the native WhatsApp app is the better target. */
function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod|Windows Phone/i.test(ua);
}

export function buildWhatsAppUrl(phone: string, message: string = WELCOME_MESSAGE): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const text = encodeURIComponent(message);
  // Desktop → WhatsApp Web directly (avoids the "open the app?" redirect page).
  if (!isMobileDevice()) return `https://web.whatsapp.com/send?phone=${normalized}&text=${text}`;
  return `https://wa.me/${normalized}?text=${text}`;
}

export function openWhatsApp(phone: string, message: string = WELCOME_MESSAGE): boolean {
  const url = buildWhatsAppUrl(phone, message);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}