import * as SecureStore from "expo-secure-store";

const key = "dv-lottery-expo-workflow-swipe-v1";

export async function shouldShowWorkflowHint(): Promise<boolean> {
  return (await SecureStore.getItemAsync(key)) !== "learned";
}

export async function learnWorkflowSwipe(): Promise<void> {
  await SecureStore.setItemAsync(key, "learned");
}

export async function resetWorkflowHint(): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}
