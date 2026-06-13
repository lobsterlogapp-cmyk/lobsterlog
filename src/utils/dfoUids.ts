// dfoUids.ts
// Generates DFO-compliant unique identifiers per Fact Sheet rules

// Rule 181: LGBK_UID — 6 uppercase letters, randomly generated, permanent per logbook
export function generateLgbkUid(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += letters.charAt(Math.floor(Math.random() * 26));
  }
  return result;
}

// REPORT_UID — 6 uppercase letters, randomly generated fresh per transmission
export function generateReportUid(): string {
  return generateLgbkUid();
}