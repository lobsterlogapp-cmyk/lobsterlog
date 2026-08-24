// The ONE shared display formatter for transmission-register timestamps (S138).
// Local time keeps the card readable for the harvester; the bracketed UTC satisfies the
// §13.3.1 register requirement. EN uses 12-hour AM/PM — "2026-08-14 9:39 AM (12:39 UTC)";
// FR keeps the app's 24-hour HH:MM convention — "2026-08-14 13:39 (16:39 UTC)" — the same
// 24-hour colon style these register surfaces and the trip timestamps already render.
// When the UTC date differs from the local date (any evening send: 21:39 ADT is already
// tomorrow in UTC), the bracket carries the FULL UTC date so the register never shows a
// UTC time beside the wrong date — "2026-08-24 9:39 PM (2026-08-25 00:39 UTC)".
export const formatSentDateTime = (ts: number | undefined, language: string): string => {
  if (!ts) return '—';
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  const datePart = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const localTime = language.startsWith('fr')
    ? `${pad(d.getHours())}:${pad(d.getMinutes())}`
    : `${((d.getHours() + 11) % 12) + 1}:${pad(d.getMinutes())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
  const utcDatePart = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const utcPrefix = utcDatePart === datePart ? '' : `${utcDatePart} `;
  return `${datePart} ${localTime} (${utcPrefix}${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC)`;
};
