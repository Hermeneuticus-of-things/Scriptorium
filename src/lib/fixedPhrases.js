// Garda frazelor fixate (directiva autor 2026-11-20): pachetul cărții interzice atingerea
// frazelor fixate. Agentul propune; dacă propunerea scoate sau schimbă o frază fixată,
// autorul e întrebat explicit înainte de aplicare — și decizia intră în registrul de audit.
// Instrument de protecție, nu de generare.

export const listFixedPhrases = (text) =>
  String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);

// Frazele fixate prezente în textul de dinainte și absente (sau schimbate) în cel propus.
const normalize = (s) => String(s || '').replace(/\s+/g, ' ').trim();

export function touchedFixedPhrases(before, after, phrases) {
  const b = normalize(before);
  const a = normalize(after);
  return (phrases || []).filter((p) => {
    const f = normalize(p);
    return f && b.includes(f) && !a.includes(f);
  });
}
