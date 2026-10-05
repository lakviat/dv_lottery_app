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
import { APP_NAME, BrandMark } from "./expo-app/Brand";
import { HomeScreen, GuideContent } from "./expo-app/HomeScreen";
import { ApplyScreen } from "./expo-app/ApplyScreen";
import { PhotosScreen, removePhotoFile } from "./expo-app/PhotosScreen";
import { EntriesScreen } from "./expo-app/EntriesScreen";
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
  Icon,
  IconName,
  Label,
  LinkRow,
  Notice,
  Sheet,
  Title,
  s,
} from "./expo-app/ui";

const tabs: { name: Tab; icon: IconName; selected: IconName }[] = [
  { name: "Home", icon: "home-outline", selected: "home" },
  { name: "Apply", icon: "document-text-outline", selected: "document-text" },
  { name: "Photos", icon: "camera-outline", selected: "camera" },
  { name: "My Entries", icon: "albums-outline", selected: "albums" },
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
  const [welcome, setWelcome] = useState(false);
  const replayAfterSettings = useRef(false);
  const [addRequest, setAddRequest] = useState(0);
  const load = () => {
    setLoadError("");
    void Promise.all([loadRecords(), shouldShowWelcome()])
      .then(([data, showWelcome]) => {
        latest.current = data;
        setWelcome(showWelcome);
        setRecords(data);
      })
      .catch((e) => setLoadError(e.message || "Saved data could not be read."));
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
    update((r) => ({ ...r, draft: { ...r.draft, started: true } }));
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
      "This deletes your local draft, saved entry records and app photo copies. It cannot be undone.",
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
              Opening your saved entries…
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
            paddingBottom: 15,
            gap: 11,
          }}
        >
          <BrandMark />
          <View style={{ flex: 1, gap: 3 }}>
            <Text
              style={{
                fontSize: 20,
                color: C.navy,
                fontWeight: "700",
                letterSpacing: -0.5,
              }}
            >
              {APP_NAME}
            </Text>
            <Pressable
              accessibilityRole={saveFailed ? "button" : "text"}
              onPress={() => {
                if (saveFailed) update((r) => r);
              }}
            >
              <Text
                style={{ fontSize: 11, color: saveFailed ? C.red : C.muted }}
              >
                {saveState}
              </Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            onPress={() => setSettings(true)}
            hitSlop={12}
            style={{ padding: 7 }}
          >
            <Icon name="settings-outline" size={24} color={C.blue} />
          </Pressable>
        </View>
      </View>
      {tab === "Home" && (
        <HomeScreen
          records={records}
          apply={apply}
          photos={() => setTab("Photos")}
          entries={() => setTab("My Entries")}
          guide={() => setGuide(true)}
        />
      )}
      {tab === "Apply" && (
        <ApplyScreen
          records={records}
          update={update}
          photos={() => setTab("Photos")}
          addEntry={addEntry}
        />
      )}
      {tab === "Photos" && <PhotosScreen records={records} update={update} />}
      {tab === "My Entries" && (
        <EntriesScreen
          records={records}
          update={update}
          addRequest={addRequest}
          consumeAddRequest={() => setAddRequest(0)}
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
              accessibilityLabel={item.name}
              testID={`tab-${item.name.replace(" ", "-").toLowerCase()}`}
              onPress={() => setTab(item.name)}
              style={{
                flex: 1,
                minHeight: 53,
                borderRadius: 15,
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                backgroundColor: item.name === tab ? "#EAF0F8" : "transparent",
              }}
            >
              <Icon
                name={item.name === tab ? item.selected : item.icon}
                size={23}
                color={item.name === tab ? C.navy : C.muted}
              />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: item.name === tab ? "700" : "500",
                  color: item.name === tab ? C.navy : C.muted,
                }}
              >
                {item.name}
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
        <Card>
          <BrandMark size={58} />
          <Label>{APP_NAME} · Expo preview 0.1</Label>
          <Title>Made for your next chapter.</Title>
          <Body>
            An independent iPhone and iPad companion for preparing DV entries,
            organizing photos and keeping your own case history.
          </Body>
          <Notice title="Official actions happen on the government website">
            This preview does not submit entries, collect government fees,
            certify photos or retrieve official status automatically.
          </Notice>
        </Card>
        <Card>
          <Title>Your data in this preview</Title>
          <Body>
            Draft details and entry records are stored with iOS Keychain through
            Expo SecureStore. Photo copies are kept in the Expo app’s local
            storage. There is no account or cloud sync.
          </Body>
          <Body muted>
            Expo Go is a development preview. Its storage and system permissions
            are managed by Expo Go. Keep official confirmation pages separately
            and use fictional details while testing.
          </Body>
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
