/**
 * S125 7a — Form 222 / 233 entry-store lifecycle guard.
 *
 * Covers the storage-layer rulings: (3) loaders back-fill status ?? 'complete' + sentToDfo ??
 * false and sort newest-first; (1) a draft round-trips with status:'draft'; (6) the new
 * loadForm22xEntryByUid + deleteForm22xEntry helpers. Uses the in-memory AsyncStorage mock
 * (jest.config moduleNameMapper); dfoKey falls to the ::__anon__ namespace, consistent across
 * save/load within the test (mirrors activeDraftScratch.oneoff.test.ts).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dfoKey, DFO_STORE_BASES } from '../dfoStorageKeys';
import {
  Form222Entry, saveForm222Entry, loadForm222Entries, loadForm222EntryByUid, deleteForm222Entry,
} from '../dfoForm222Generator';
import {
  Form233Entry, saveForm233Entry, loadForm233Entries, loadForm233EntryByUid, deleteForm233Entry,
} from '../dfoForm233Generator';

const base222 = (uid: string, savedAt: number): Form222Entry => ({
  uid, savedAt, interactInd: 'N', reportDate: '2026-07-06', interactionDate: '', interactionTime: '',
  lat: '', lon: '', speciesLabel: '', nbAnimals: '', interactionTypeLabel: '',
  injuryInd: 'N', deathInd: 'N', entangleInd: 'N', releaseInd: 'N', gearDamageInd: 'N',
  observerNm: '', contactInfo: '', remarks: '', lgbkNumRef: 'ABCDEF', sentToDfo: true,
});
const base233 = (uid: string, savedAt: number): Form233Entry => ({
  uid, savedAt, periodStartDate: '2026-01-01', periodEndDate: '2026-01-31', reason: 'Weather',
  licenceNo: '104460', fin: '100400460', sentToDfo: true,
});

// Recent timestamps for the save-path tests: saveForm22xEntry prunes records older than 3 years
// (savedAt <= now-3yr), so fixtures must be current or the upsert would drop them.
const NOW = Date.now();

beforeEach(async () => { await AsyncStorage.clear(); });

describe('222 entry store', () => {
  test('loader back-fills status=complete / sentToDfo default on legacy records (no status field)', async () => {
    // Seed a record with NO status field and NO sentToDfo, as pre-S125 data would be on disk.
    const legacy: any = base222('AAAAAA', 100);
    delete legacy.status; delete legacy.sentToDfo;
    await AsyncStorage.setItem(dfoKey(DFO_STORE_BASES.form222_entries), JSON.stringify([legacy]));
    const [loaded] = await loadForm222Entries();
    expect(loaded.status).toBe('complete');
    expect(loaded.sentToDfo).toBe(false);
  });

  test('loader sorts newest-first by savedAt', async () => {
    await AsyncStorage.setItem(
      dfoKey(DFO_STORE_BASES.form222_entries),
      JSON.stringify([base222('OLD', 100), base222('NEW', 200)]),
    );
    expect((await loadForm222Entries()).map(e => e.uid)).toEqual(['NEW', 'OLD']);
  });

  test('a draft round-trips with status:draft / sentToDfo:false', async () => {
    await saveForm222Entry({ ...base222('DRAFT1', NOW), status: 'draft', sentToDfo: false });
    const [loaded] = await loadForm222Entries();
    expect(loaded.status).toBe('draft');
    expect(loaded.sentToDfo).toBe(false);
  });

  test('loadForm222EntryByUid returns the entry, null for a miss', async () => {
    await saveForm222Entry(base222('FIND1', NOW));
    expect((await loadForm222EntryByUid('FIND1'))?.uid).toBe('FIND1');
    expect(await loadForm222EntryByUid('NOPE')).toBeNull();
  });

  test('deleteForm222Entry removes only the named uid', async () => {
    // S160 repair (the S154D fixture rule: give the fixture a lawful source, never weaken the
    // assertion): base222 is sentToDfo:true, and since S160 a sent entry REFUSES deletion — so
    // DROP is now a deletable draft. KEEP stays sent, which the delete must (doubly) survive.
    await saveForm222Entry(base222('KEEP', NOW));
    await saveForm222Entry({ ...base222('DROP', NOW + 1000), status: 'draft', sentToDfo: false });
    await deleteForm222Entry('DROP');
    expect((await loadForm222Entries()).map(e => e.uid)).toEqual(['KEEP']);
  });
});

describe('233 entry store', () => {
  test('loader back-fills status=complete / sentToDfo default on legacy records (no status field)', async () => {
    const legacy: any = base233('BBBBBB', 100);
    delete legacy.status; delete legacy.sentToDfo;
    await AsyncStorage.setItem(dfoKey(DFO_STORE_BASES.form233_entries), JSON.stringify([legacy]));
    const [loaded] = await loadForm233Entries();
    expect(loaded.status).toBe('complete');
    expect(loaded.sentToDfo).toBe(false);
  });

  test('loader sorts newest-first by savedAt', async () => {
    await AsyncStorage.setItem(
      dfoKey(DFO_STORE_BASES.form233_entries),
      JSON.stringify([base233('OLD', 100), base233('NEW', 200)]),
    );
    expect((await loadForm233Entries()).map(e => e.uid)).toEqual(['NEW', 'OLD']);
  });

  test('a draft round-trips with status:draft / sentToDfo:false', async () => {
    await saveForm233Entry({ ...base233('DRAFT1', NOW), status: 'draft', sentToDfo: false });
    const [loaded] = await loadForm233Entries();
    expect(loaded.status).toBe('draft');
    expect(loaded.sentToDfo).toBe(false);
  });

  test('loadForm233EntryByUid returns the entry, null for a miss', async () => {
    await saveForm233Entry(base233('FIND1', NOW));
    expect((await loadForm233EntryByUid('FIND1'))?.uid).toBe('FIND1');
    expect(await loadForm233EntryByUid('NOPE')).toBeNull();
  });

  test('deleteForm233Entry removes only the named uid', async () => {
    // S160 repair — same as the 222 twin above: DROP must be a deletable draft under the gate.
    await saveForm233Entry(base233('KEEP', NOW));
    await saveForm233Entry({ ...base233('DROP', NOW + 1000), status: 'draft', sentToDfo: false });
    await deleteForm233Entry('DROP');
    expect((await loadForm233Entries()).map(e => e.uid)).toEqual(['KEEP']);
  });
});
