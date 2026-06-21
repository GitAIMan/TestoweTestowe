/**
 * Walidacja adresu e-mail — spójna między frontendem a backendem.
 * Pusty string jest dozwolony (e-mail jest opcjonalny przy ofercie).
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  const v = value.trim();
  if (v === "") return true; // pusty = opcjonalny, dozwolony
  return EMAIL_RE.test(v);
}
