// S138 Defect 16: the one shared routine behind the SAR capture prompt. Drives EVERY
// species-at-risk block — block 1 (the legacy flat sar* keys) and every extraSars
// block — so two occurrences of the same data group behave identically (S135 ruling).
//
// Contract (pinned S138):
//   Yes → stamp the block's date+time now, try a GPS fix, then record provenance from
//         the fix's ACTUAL outcome — 'gps' only when coordinates were written; a
//         denied/failed/timed-out fix records 'manual', never a false satellite claim
//         (§11.3 MODE G/M).
//   No  → touch nothing. A fresh block already holds blank date/time/lat/lng and
//         gpsSrc 'manual', so declining leaves it blank for hand entry; on a re-prompt
//         of an existing block, declining is a pure no-op (non-destructive).

export interface SarBlockWriter {
  setDateTime: (date: string, time: string) => void;
  setLat: (v: string) => void;
  setLng: (v: string) => void;
  setGpsSrc: (src: 'gps' | 'manual') => void;
}

export interface SarCaptureDeps {
  stampNow: () => { date: string; time: string };
  // Resolves true ONLY when a usable fix was written through setLat/setLng.
  capture: (setLat: (v: string) => void, setLng: (v: string) => void) => Promise<boolean>;
}

export const applySarCaptureChoice = async (
  captureWanted: boolean,
  w: SarBlockWriter,
  deps: SarCaptureDeps
): Promise<void> => {
  if (!captureWanted) return;
  const { date, time } = deps.stampNow();
  w.setDateTime(date, time);
  const ok = await deps.capture(w.setLat, w.setLng);
  w.setGpsSrc(ok ? 'gps' : 'manual');
};
