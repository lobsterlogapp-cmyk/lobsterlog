// Code→label lookups for the Daily Log wind-direction and condition chips.
//
// The chip strings the app STORES (formData.windDir / formData.weather → Firestore)
// are canonical English codes — 'SW', 'Sunny', 'No Fishing', the 16-point compass
// values from getWindDirection(), etc. All logic (the 'No Fishing' sentinel,
// selected-state compares) runs on those codes. These helpers translate a code to
// its display label AT RENDER TIME ONLY; nothing here may ever feed a write.
//
// defaultValue: code — an unmapped/legacy stored value must render as its raw code,
// never as a broken "log.windDirLabels.X" key path.

type TranslateFn = (key: string, options?: { defaultValue?: string }) => string;

export function windDirLabel(code: string, t: TranslateFn): string {
  if (!code) return code;
  return t('log.windDirLabels.' + code, { defaultValue: code });
}

export function weatherLabel(code: string, t: TranslateFn): string {
  if (!code) return code;
  return t('log.weatherLabels.' + code, { defaultValue: code });
}
