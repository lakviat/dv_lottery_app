import { requireOptionalNativeModule } from "expo-modules-core";
import { isRunningInExpoGo } from "expo";

const reminderID = "dv-registration-weekly-v1";
let schedulingUnavailable = false;
// Older installed development builds must remain usable before rebuilding.
function notifications(): typeof import("expo-notifications") | null {
  if (!requireOptionalNativeModule("ExpoNotificationScheduler") ||
      !requireOptionalNativeModule("ExpoNotificationPermissionsModule")) return null;
  return require("expo-notifications");
}

export type ReminderState = "off" | "on" | "denied" | "unavailable";
export async function registrationReminderState(): Promise<ReminderState> {
  if (schedulingUnavailable) return "unavailable";
  const api = notifications();
  if (!api) return "unavailable";
  const permission = await api.getPermissionsAsync();
  if (permission.status === "denied") return "denied";
  const scheduled = await api.getAllScheduledNotificationsAsync();
  return scheduled.some((item) => item.identifier === reminderID) ? "on" : "off";
}

export async function enableRegistrationReminder(): Promise<ReminderState> {
  const api = notifications();
  if (!api) return "unavailable";
  const permission = await api.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } });
  const permitted = permission.granted || permission.ios?.status === api.IosAuthorizationStatus.PROVISIONAL;
  if (!permitted) return "denied";
  // A stable identifier replaces this app's reminder instead of stacking duplicates.
  try { await api.scheduleNotificationAsync({
    identifier: reminderID,
    content: {
      title: "Check DV registration dates",
      body: "Check the U.S. Department of State’s official announcement. This reminder does not mean registration has opened.",
      sound: "default",
      data: { destination: "registration-alerts" },
    },
    trigger: { type: api.SchedulableTriggerInputTypes.CALENDAR, repeats: true, weekday: 2, hour: 9, minute: 0 },
  }); } catch (error) {
    // Some Expo Go iOS runtimes expose the API but their scoped scheduler rejects
    // requests. Never show "on" for a rejected request or block the rest of the app.
    if (isRunningInExpoGo()) { schedulingUnavailable = true; return "unavailable"; }
    throw error;
  }
  return "on";
}

export async function cancelRegistrationReminder(): Promise<void> {
  await notifications()?.cancelScheduledNotificationAsync(reminderID);
}

export function listenForRegistrationReminder(open: () => void): () => void {
  const api = notifications();
  if (!api) return () => {};
  api.setNotificationHandler({
    handleNotification: async (notification) => {
      const ours = notification.request.content.data?.destination === "registration-alerts";
      return { shouldShowBanner: ours, shouldShowList: ours, shouldPlaySound: ours, shouldSetBadge: false };
    },
  });
  const handle = (response: import("expo-notifications").NotificationResponse | null) => {
    if (response?.notification.request.content.data?.destination === "registration-alerts") {
      open();
      void api.clearLastNotificationResponseAsync().catch(() => {});
    }
  };
  const listener = api.addNotificationResponseReceivedListener(handle);
  void api.getLastNotificationResponseAsync().then(handle).catch(() => {});
  return () => listener.remove();
}
