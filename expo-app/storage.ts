import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { makeRecords, Records } from "./models";

const prefix = "dv-lottery-expo-v1";
const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
type Manifest = { revision: string; count: number };
const key = (m: Manifest, i: number) => `${prefix}-${m.revision}-${i}`;
async function manifest(): Promise<Manifest | null> {
  const raw = await SecureStore.getItemAsync(prefix, options);
  if (!raw) return null;
  const m = JSON.parse(raw) as Manifest;
  if (
    !m.revision ||
    !Number.isInteger(m.count) ||
    m.count < 1 ||
    m.count > 10000
  )
    throw new Error("Saved record index is invalid.");
  return m;
}
export async function loadRecords(): Promise<Records> {
  const m = await manifest();
  if (!m) return makeRecords();
  const chunks = await Promise.all(
    Array.from({ length: m.count }, (_, i) =>
      SecureStore.getItemAsync(key(m, i), options),
    ),
  );
  if (chunks.some((c) => c === null))
    throw new Error(
      "Part of your saved records could not be loaded. Existing data has not been overwritten.",
    );
  const data = JSON.parse(chunks.join("")) as Records;
  if (
    data.version !== 1 ||
    !data.draft ||
    !Array.isArray(data.draft.people) ||
    !data.draft.people.length ||
    !Array.isArray(data.entries) ||
    !Array.isArray(data.photos) ||
    !Number.isInteger(data.draft.step) ||
    data.draft.step < 0 ||
    data.draft.step > 5
  )
    throw new Error("Saved data has an unsupported format.");
  return data;
}

// ASCII chunks stay below Keychain's size limits, including for non-Latin names.
// Commit the manifest last so interrupted writes preserve the previous complete snapshot.
export async function saveRecords(data: Records): Promise<void> {
  const previous = await manifest();
  const json = JSON.stringify(data).replace(
    /[^\x20-\x7E]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
  const chunks = json.match(/.{1,1800}/g) ?? ["{}"];
  const next = { revision: Crypto.randomUUID(), count: chunks.length };
  const written: string[] = [];
  try {
    for (let i = 0; i < chunks.length; i++) {
      const chunkKey = key(next, i);
      await SecureStore.setItemAsync(chunkKey, chunks[i], options);
      written.push(chunkKey);
    }
    await SecureStore.setItemAsync(prefix, JSON.stringify(next), options);
  } catch (error) {
    await Promise.allSettled(
      written.map((k) => SecureStore.deleteItemAsync(k, options)),
    );
    throw error;
  }
  if (previous)
    await Promise.allSettled(
      Array.from({ length: previous.count }, (_, i) =>
        SecureStore.deleteItemAsync(key(previous, i), options),
      ),
    );
}
