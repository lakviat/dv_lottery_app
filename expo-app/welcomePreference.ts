import * as SecureStore from "expo-secure-store";

// A separate preference keeps onboarding out of applicants' records and migrations.
const key = "dv-lottery-expo-welcome-v1";

export async function shouldShowWelcome(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(key)) !== "dismissed";
  } catch {
    // A guidance preference must never prevent someone from using the app.
    return false;
  }
}

export async function dismissWelcome(): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, "dismissed");
  } catch {
    // Exit immediately even if this device cannot persist the preference.
    // The tour can still be opened manually from Settings.
  }
}
