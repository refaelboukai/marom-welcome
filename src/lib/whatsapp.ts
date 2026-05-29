// WhatsApp deep-link helper. Opens the WhatsApp app (mobile) or WhatsApp Web (desktop).
// We rely on wa.me click-to-chat — no API key required.

export const WELCOME_MESSAGE = `ברוכים הבאים לבית הספר

לצורך תהליך קליטה מיטיבי אתם נדרשים למלא את השאלות. אין תשובות נכונות או לא נכונות אלא רק תשובות שנראה לכם מתאימות עבורכם. בהצלחה.

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

export function buildWhatsAppUrl(phone: string, message: string = WELCOME_MESSAGE): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(phone: string, message: string = WELCOME_MESSAGE): boolean {
  const url = buildWhatsAppUrl(phone, message);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}