import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { preparationProgress } from "./expo-app/preparation";
import { APP_NAME, APP_VERSION, BrandMark } from "./expo-app/Brand";
import { HomeScreen, GuideContent } from "./expo-app/HomeScreen";
import { ApplyScreen } from "./expo-app/ApplyScreen";
import { PhotosScreen, removePhotoFile } from "./expo-app/PhotosScreen";
import { EntriesScreen } from "./expo-app/EntriesScreen";
import {
  RegistrationAlerts,
  useRegistrationFeed,
} from "./expo-app/AlertPreferences";
import { registrationSummary } from "./expo-app/registrationAlerts";
import {
  cancelRegistrationReminder,
  listenForRegistrationReminder,
} from "./expo-app/registrationReminders";
import { WelcomeTour } from "./expo-app/WelcomeTour";
import { clearPassportCache } from "./expo-app/PassportCapture";
import {
  dismissWelcome,
  shouldShowWelcome,
} from "./expo-app/welcomePreference";
import {
  Records,
  Tab,
  makeDraft,
  makeRecords,
  official,
} from "./expo-app/models";
import { loadRecords, saveRecords } from "./expo-app/storage";
import {
  Body,
  Button,
  C,
  Card,
  Disclosure,
  Icon,
  IconName,
  Label,
  LinkRow,
  Sheet,
  Title,
  s,
  typography,
} from "./expo-app/ui";

const tabs: { name: Tab; label: string; icon: IconName; selected: IconName }[] =
  [
    { name: "Home", label: "Home", icon: "home-outline", selected: "home" },
    {
      name: "Apply",
      label: "Prepare",
      icon: "document-text-outline",
      selected: "document-text",
    },
    {
      name: "Photos",
      label: "Photos",
      icon: "camera-outline",
      selected: "camera",
    },
    {
      name: "My Entries",
      label: "Entries",
      icon: "albums-outline",
      selected: "albums",
    },
  ];

function DVApp() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("Home");
  const [records, setRecords] = useState<Records | null>(null);
  const latest = useRef<Records | null>(null);
  const queue = useRef(Promise.resolve());
  const revision = useRef(0);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState("Saved on this device");
  const [saveFailed, setSaveFailed] = useState(false);
  const [guide, setGuide] = useState(false);
  const [settings, setSettings] = useState(false);
  const [alerts, setAlerts] = useState(false);
  const alertStatus = useRegistrationFeed();
  const alertsAfterSettings = useRef(false);
  useEffect(() => listenForRegistrationReminder(() => setAlerts(true)), []);
  const [welcome, setWelcome] = useState(false);
  const replayAfterSettings = useRef(false);
  const [addRequest, setAddRequest] = useState(0);
  const [scanRequest, setScanRequest] = useState(0);
  const [photoPersonId, setPhotoPersonId] = useState<string | undefined>(undefined);
  const openPhotos = (personId?: string) => {
    setPhotoPersonId(personId);
    setTab("Photos");
  };
  const load = () => {
    setLoadError("");
    void Promise.all([loadRecords(), shouldShowWelcome()])
      .then(([data, showWelcome]) => {
        latest.current = data;
        setWelcome(showWelcome);
        setRecords(data);
      })
      .catch(() =>
        setLoadError("We couldn’t open your saved information. Please try again."),
      );
  };
  useEffect(load, []);
  useEffect(() => {
    void clearPassportCache().catch(() => {});
  }, []);
  const closeWelcome = () => {
    setWelcome(false);
    void dismissWelcome();
  };
  const update = (fn: (r: Records) => Records) => {
    if (!latest.current) return;
    const next = fn(latest.current);
    latest.current = next;
    setRecords(next);
    setSaveState("Saving…");
    const currentRevision = ++revision.current;
    queue.current = queue.current
      .then(() => saveRecords(next))
      .then(() => {
        if (revision.current === currentRevision) {
          setSaveState("Saved on this device");
          setSaveFailed(false);
        }
      })
      .catch(() => {
        setSaveFailed(true);
        setSaveState("Save failed — tap to retry");
      });
  };
  const apply = () => {
    update((r) => {
      const next = preparationProgress(r);
      return {
        ...r,
        draft: {
          ...r.draft,
          started: true,
          step: next.step,
          detailsSection: next.section,
        },
      };
    });
    setTab("Apply");
  };
  const scan = () => {
    update((r) => ({
      ...r,
      draft: { ...r.draft, started: true, step: 0, detailsSection: "personal" },
    }));
    setScanRequest((v) => v + 1);
    setTab("Apply");
  };
  const openPreparationStep = (step: number) => {
    update((r) => ({
      ...r,
      draft: { ...r.draft, started: true, step },
    }));
    setTab("Apply");
  };
  const addEntry = () => {
    setTab("My Entries");
    setAddRequest((v) => v + 1);
  };
  const resetDraft = () =>
    Alert.alert(
      "Start a fresh draft?",
      "Your current preparation details will be replaced. Saved entries and your photo library stay available.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset draft",
          style: "destructive",
          onPress: () => {
            update((r) => ({ ...r, draft: makeDraft() }));
            setSettings(false);
            setTab("Apply");
          },
        },
      ],
    );
  const clear = () =>
    Alert.alert(
      "Delete all app data?",
      "This deletes your local draft, saved entry records and app photo copies, and cancels the device reminder. Email alert requests are separate; use the email unsubscribe link or contact the service to cancel. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete all",
          style: "destructive",
          onPress: () => {
            if (!latest.current) return;
            const old = latest.current;
            const blank = makeRecords();
            queue.current = queue.current
              .then(async () => {
                await cancelRegistrationReminder();
                await saveRecords(blank);
                latest.current = blank;
                setRecords(blank);
                await Promise.allSettled(
                  old.photos.map((p) => removePhotoFile(p.uri)),
                );
                setSettings(false);
                setTab("Home");
                setSaveState("Saved on this device");
                setSaveFailed(false);
              })
              .catch(() =>
                Alert.alert(
                  "Could not delete records",
                  "Your existing records have been kept. Try again.",
                ),
              );
          },
        },
      ],
    );
  if (!records)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: C.bg,
          justifyContent: "center",
          padding: 28,
          gap: 20,
        }}
      >
        <StatusBar style="dark" />
        <View style={{ alignItems: "center", gap: 20 }}>
          <BrandMark size={112} />
          <Text
            style={{
              fontSize: 25,
              fontWeight: "700",
              color: C.navy,
              textAlign: "center",
            }}
          >
            {APP_NAME}
          </Text>
        </View>
        {loadError ? (
          <>
            <Title>Saved records need attention</Title>
            <Body>{loadError}</Body>
            <Body muted>Existing data has not been replaced.</Body>
            <Button title="Try loading again" onPress={load} />
          </>
        ) : (
          <>
            <ActivityIndicator size="small" color={C.navy} />
            <Text style={[s.body, { textAlign: "center" }]}>
              Prepare · Track · Remember
            </Text>
          </>
        )}
      </View>
    );
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="dark" />
      <View
        style={{
          backgroundColor: C.white,
          paddingTop: insets.top + 8,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: C.line,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 1120,
            alignSelf: "center",
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingBottom: tab === "Home" ? 12 : 4,
            gap: 11,
          }}
        >
          {tab === "Home" && <BrandMark size={36} />}
          <View style={{ flex: 1, gap: 3 }}>
            <Text
              style={{
                fontSize: 18,
                color: C.navy,
                fontWeight: "700",
                letterSpacing: -0.5,
              }}
            >
              {tab === "Home"
                ? APP_NAME
                : tab === "Apply"
                  ? "Preparation"
                  : tab === "My Entries"
                    ? "Entries"
                    : "Photos"}
            </Text>
            {tab === "Home" && !saveFailed && (
              <Text style={s.small}>
                {saveState}
              </Text>
            )}
          </View>
          {tab !== "Home" && saveState === "Saving…" && (
            <ActivityIndicator
              accessibilityLabel="Saving changes on this device"
              color={C.muted}
            />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            onPress={() => setSettings(true)}
            hitSlop={12}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              backgroundColor: pressed ? C.blueSoft : "transparent",
            })}
          >
            <Icon name="settings-outline" size={24} color={C.blue} />
          </Pressable>
        </View>
        {saveFailed && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Changes could not be saved. Keep the app open and tap to retry."
            onPress={() => update((r) => r)}
            style={({ pressed }) => ({
              minHeight: 48,
              paddingHorizontal: 20,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: pressed ? C.disabled : C.dangerSoft,
            })}
          >
            <Icon name="alert-circle-outline" color={C.red} />
            <Text style={[s.small, { color: C.red, flex: 1 }]}>
              Changes not saved. Keep the app open and tap to retry.
            </Text>
            <Icon name="refresh-outline" color={C.red} />
          </Pressable>
        )}
      </View>
      {tab === "Home" && (
        <HomeScreen
          records={records}
          alerts={() => setAlerts(true)}
          registrationStatus={registrationSummary(alertStatus.feed)}
          apply={apply}
          openStep={openPreparationStep}
          scan={scan}
          photos={() => openPhotos()}
          entries={() => setTab("My Entries")}
          guide={() => setGuide(true)}
        />
      )}
      {tab === "Apply" && (
        <ApplyScreen
          records={records}
          update={update}
          photos={openPhotos}
          addEntry={addEntry}
          scanRequest={scanRequest}
        />
      )}
      {tab === "Photos" && (
        <PhotosScreen records={records} update={update} initialPersonId={photoPersonId} />
      )}
      {tab === "My Entries" && (
        <EntriesScreen
          records={records}
          update={update}
          addRequest={addRequest}
          consumeAddRequest={() => setAddRequest(0)}
          onPrepare={apply}
        />
      )}
      <View
        style={{
          backgroundColor: C.white,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: C.line,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 10,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            width: "100%",
            maxWidth: 700,
            alignSelf: "center",
            paddingHorizontal: 12,
            gap: 4,
          }}
        >
          {tabs.map((item) => (
            <Pressable
              key={item.name}
              accessibilityRole="tab"
              accessibilityState={{ selected: item.name === tab }}
              accessibilityLabel={item.label}
              testID={`tab-${item.name.replace(" ", "-").toLowerCase()}`}
              onPress={() => setTab(item.name)}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 53,
                borderRadius: 15,
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                backgroundColor: item.name === tab || pressed ? C.blueSoft : "transparent",
              })}
            >
              <Icon
                name={item.name === tab ? item.selected : item.icon}
                size={23}
                color={item.name === tab ? C.blue : C.muted}
              />
              <Text
                style={{
                  ...typography.caption,
                  fontWeight: item.name === tab ? "700" : "500",
                  color: item.name === tab ? C.blue : C.muted,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Sheet
        visible={guide}
        title="Your DV essentials"
        onClose={() => setGuide(false)}
      >
        <GuideContent />
      </Sheet>
      <Sheet
        visible={settings}
        title="About & settings"
        onClose={() => setSettings(false)}
        onDismiss={() => {
          if (alertsAfterSettings.current) {
            alertsAfterSettings.current = false;
            setAlerts(true);
          }
          if (replayAfterSettings.current) {
            replayAfterSettings.current = false;
            setWelcome(true);
          }
        }}
      >
        <Button
          secondary
          title="How it works"
          icon="play-circle-outline"
          testID="replay-welcome-tour"
          onPress={() => {
            replayAfterSettings.current = true;
            setSettings(false);
          }}
        />
        <Button
          secondary
          title="Registration alerts"
          icon="notifications-outline"
          onPress={() => {
            alertsAfterSettings.current = true;
            setSettings(false);
          }}
        />
        <Card>
          <Disclosure title="Privacy & data">
            <Body>
              Your draft and entry records are saved securely on this device.
              Photos are kept in the app’s local storage. No account or cloud sync
              is required. Optional email alerts share only your email and consent
              with Green Card Application Services through its Google service.
            </Body>
            <Body muted>
              Keep a separate copy of your official confirmation. Uninstalling the
              app or switching devices may make local records unavailable. Use
              fictional details while testing this beta.
            </Body>
          </Disclosure>
          <Disclosure title="Government disclaimer">
            <Body>
              This is an independent preparation tool, not affiliated with the
              U.S. government. Official actions happen on government websites.
            </Body>
            <Body muted>
              This app does not submit entries, collect government fees, certify
              photos or retrieve official status automatically.
            </Body>
          </Disclosure>
          <Disclosure title="About this app">
            <BrandMark size={44} />
            <Label>{APP_NAME}</Label>
            <Body>
              An independent iPhone and iPad companion for preparing DV entries,
              organizing photos and keeping your own case history.
            </Body>
          </Disclosure>
          <LinkRow
            title="Support & privacy"
            url="https://greencardapplicationservices.com/policies/#privacy"
          />
          <Text style={s.small}>App version {APP_VERSION}</Text>
        </Card>
        <Card>
          <LinkRow
            title="Current official instructions"
            url={official.instructions}
          />
          <LinkRow title="Registration announcement" url={official.dates} />
          <Text style={s.small}>
            Research snapshot: October 5, 2026. Review current official guidance
            before acting.
          </Text>
        </Card>
        <Button
          secondary
          title="Start a fresh preparation draft"
          icon="refresh-outline"
          onPress={resetDraft}
        />
        <Button
          danger
          title="Delete all local app data"
          icon="trash-outline"
          onPress={clear}
        />
      </Sheet>
      <RegistrationAlerts
        visible={alerts && !welcome && !settings && !guide}
        onClose={() => setAlerts(false)}
        status={alertStatus}
      />
      {welcome && <WelcomeTour onExit={closeWelcome} />}
    </View>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <DVApp />
    </SafeAreaProvider>
  );
}
