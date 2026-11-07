// Shared phone normalisation (frontend + edge functions). Pure TS, no runtime APIs.
// Supports NL (+31) and BE (+32); national numbers use the contact country, default NL.
export type PhoneCountry = 'NL' | 'BE';

export function countryFromHint(hint?: string | null): PhoneCountry {
  const c = String(hint || '').trim().toLowerCase();
  if (['be', 'bel', 'belgium', 'belgië', 'belgie', 'belgique', 'belgien'].includes(c)) return 'BE';
  return 'NL';
}

const PREFIX: Record<PhoneCountry, string> = { NL: '+31', BE: '+32' };

export function normalizePhone(raw: string, country?: string | null): string {
  let n = String(raw || '').replace(/[\s\-().\/]/g, '');
  if (!n) return '';
  if (n.startsWith('00')) n = '+' + n.slice(2);
  if (n.startsWith('+')) {
    // Strip a trunk zero written after the country code, e.g. +31(0)6… or +320…
    return n.replace(/^\+(31|32)0/, '+$1');
  }
  const prefix = PREFIX[countryFromHint(country)];
  if (n.startsWith('0')) return prefix + n.slice(1);
  // Bare 31/32 with full length = already international without plus
  if (/^(31|32)\d{8,9}$/.test(n)) return '+' + n;
  return prefix + n;
}
