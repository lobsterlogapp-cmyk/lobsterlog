import AsyncStorage from '@react-native-async-storage/async-storage';
import { dfoKey, DFO_STORE_BASES } from './dfoStorageKeys';

export interface CrewMember {
  id: string;         // unique, generated on creation
  name: string;
  fisherNumber?: string;
}

export async function loadCrew(): Promise<CrewMember[]> {
  try {
    const raw = await AsyncStorage.getItem(dfoKey(DFO_STORE_BASES.saved_crew));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveCrew(crew: CrewMember[]): Promise<void> {
  try {
    await AsyncStorage.setItem(dfoKey(DFO_STORE_BASES.saved_crew), JSON.stringify(crew));
  } catch {}
}

export async function addCrewMember(member: Omit<CrewMember, 'id'>): Promise<CrewMember> {
  const existing = await loadCrew();
  const newMember: CrewMember = {
    ...member,
    id: `crew_${Date.now()}`,
  };
  await saveCrew([...existing, newMember]);
  return newMember;
}

export async function deleteCrewMember(id: string): Promise<void> {
  const existing = await loadCrew();
  await saveCrew(existing.filter(c => c.id !== id));
}