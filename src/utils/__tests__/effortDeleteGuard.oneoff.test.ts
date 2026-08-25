// S140 P3 (design ruling 6): the internal closed-guard on effort deletion.
// The render layer already hides the trash icon on a closed effort; this predicate makes
// the no-un-close property STRUCTURAL — removeEffortNode refuses a closed target even if
// a future caller skips the render gate (the seal-laundering hole S139B flagged).
import { effortDeleteRefused } from '../dfoLogStorage';

const STAMP = '2026-08-25T15:00:00.000Z';

test('effort 1: refused when the flat dgCloseEffort stamp exists, allowed when open', () => {
  expect(effortDeleteRefused(0, STAMP, undefined)).toBe(true);
  expect(effortDeleteRefused(0, undefined, undefined)).toBe(false);
  expect(effortDeleteRefused(0, '', '[]')).toBe(false);
});

test('extra efforts: refused only for the node that carries its own closeDt', () => {
  const nodes = JSON.stringify([{ closeDt: STAMP }, {}]);
  expect(effortDeleteRefused(1, undefined, nodes)).toBe(true);  // node 1 closed
  expect(effortDeleteRefused(2, undefined, nodes)).toBe(false); // node 2 open
  expect(effortDeleteRefused(1, STAMP, nodes)).toBe(true);      // flat stamp irrelevant to nodes
});

test('missing or malformed node data never refuses (fail-open on absent targets)', () => {
  expect(effortDeleteRefused(3, undefined, JSON.stringify([{}]))).toBe(false);
  expect(effortDeleteRefused(1, undefined, undefined)).toBe(false);
  expect(effortDeleteRefused(1, undefined, 'not-json')).toBe(false);
});
