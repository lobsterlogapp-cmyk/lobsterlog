import AsyncStorage from '@react-native-async-storage/async-storage';

const PORT_KEY = '@lobsterlog:saved_ports';

export interface Port {
  id: string;
  name: string;
}

export async function loadPorts(): Promise<Port[]> {
  try {
    const raw = await AsyncStorage.getItem(PORT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function savePorts(ports: Port[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PORT_KEY, JSON.stringify(ports));
  } catch {}
}

export async function addPort(name: string): Promise<Port> {
  const existing = await loadPorts();
  const newPort: Port = {
    id: `port_${Date.now()}`,
    name: name.trim(),
  };
  await savePorts([...existing, newPort]);
  return newPort;
}

export async function deletePort(id: string): Promise<void> {
  const existing = await loadPorts();
  await savePorts(existing.filter(p => p.id !== id));
}