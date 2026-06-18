// Scope B (Phase 1): transmissionKind classifies a register record as logbook/form222/form233.
// Explicit kind field wins; otherwise the logId prefix classifies pre-existing records
// (e.g. the S70 live 222/233 sends) with no migration / no re-send.
import { transmissionKind } from '../dfoLogStorage';

describe('transmissionKind', () => {
  it('classifies a FORM222- logId (no kind field) as form222 via the prefix fallback', () => {
    expect(transmissionKind({ logId: 'FORM222-abc' })).toBe('form222');
  });

  it('classifies a FORM233- logId (no kind field) as form233 via the prefix fallback', () => {
    expect(transmissionKind({ logId: 'FORM233-xyz' })).toBe('form233');
  });

  it('classifies a logbook logId (no kind field) as logbook', () => {
    expect(transmissionKind({ logId: 'some-logbook-id' })).toBe('logbook');
  });

  it('lets the explicit kind field beat a mismatching prefix', () => {
    expect(transmissionKind({ kind: 'logbook', logId: 'FORM222-abc' })).toBe('logbook');
  });
});
