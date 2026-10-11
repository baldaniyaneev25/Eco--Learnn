import * as SecureStore from 'expo-secure-store';

// Small key/value persistence in the device's secure storage (Keychain / Keystore).
// Failures are swallowed: the app keeps working with in-memory state.

export async function load<T>(key: string): Promise<T | null> {
  try {
    const raw = await SecureStore.getItemAsync(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function save(key: string, value: unknown): Promise<void> {
  try {
    if (value === null || value === undefined) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, JSON.stringify(value));
  } catch {
    // storage unavailable — keep in memory only
  }
}
