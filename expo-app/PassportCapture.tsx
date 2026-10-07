import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Alert, Linking, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import PassportReader from "../modules/passport-reader";
import {
  PassportReading,
  parsePassport,
  passportFieldCount,
  passportScanErrorMessage,
  unresolvedPassportCountries,
} from "./passport";
import { normalizeCountry } from "./countryNormalization";
import countries from "./countries.json";
import {
  displayBirthDate,
  normalizeBirthDate,
  parseDate,
  validPastDate,
} from "./models";
import {
  Badge,
  Body,
  Button,
  C,
  Field,
  FormSection,
  Icon,
  Notice,
  Row,
  Select,
  Sheet,
  Stack,
  Title,
  feedback,
  s,
  useFormNavigation,
} from "./ui";

const scanDirectory = `${FileSystem.cacheDirectory}passport-import/`;
export async function clearPassportCache() {
  await FileSystem.deleteAsync(scanDirectory, { idempotent: true });
}

export function PassportCapture({
  onUse,
  currentName,
  onManual,
}: {
  onUse: (reading: PassportReading) => void;
  currentName: string;
  onManual?: () => void;
}) {
  const [scan, setScan] = useState<{
    source: "camera" | "photo";
    reading: boolean;
  } | null>(null);
  const busy = scan !== null;
  const [reading, setReading] = useState<PassportReading | null>(null);
  const [rawCountries, setRawCountries] = useState({
    issuer: "",
    nationality: "",
  });
  const [editing, setEditing] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const unresolvedCountries = reading
    ? unresolvedPassportCountries(reading)
    : [];
  const form = useFormNavigation();
  const alive = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const close = () => {
    setReading(null);
    setRawCountries({ issuer: "", nationality: "" });
    setEditing(false);
    setShowErrors(false);
  };
  const set = (key: keyof PassportReading, value: string) => {
    setReading((r) => r && { ...r, [key]: value });
  };
  const errors: Record<string, string | undefined> = reading
    ? {
        "scan.first":
          !reading.first.trim() && !reading.last.trim()
            ? "Enter at least one name as shown on your passport."
            : undefined,
        "scan.dob": !validPastDate(normalizeBirthDate(reading.dob))
          ? "Enter a valid birth date using MM/DD/YYYY."
          : undefined,
        "scan.number": !reading.number.trim()
          ? "Enter the passport number shown on the identity page."
          : undefined,
        "scan.expires": !parseDate(normalizeBirthDate(reading.expires))
          ? "Enter a valid expiry date using MM/DD/YYYY."
          : undefined,
      }
    : {};
  const validate = () => {
    setShowErrors(true);
    if (Object.values(errors).some(Boolean)) {
      setEditing(true);
      form.focusFirst(errors);
      void feedback("error");
      return false;
    }
    return true;
  };
  const confirm = () => {
    if (!reading || !validate()) return;
    const confirmed = {
      ...reading,
      dob: normalizeBirthDate(reading.dob),
      expires: normalizeBirthDate(reading.expires),
    };
    Alert.alert(
      unresolvedCountries.length
        ? "Some countries need confirmation"
        : "Use these passport details?",
      (unresolvedCountries.length
        ? `We couldn’t confirm ${unresolvedCountries.join(" and ")}. Existing values for these fields will be kept; check them manually before relying on them.\n\n`
        : "") +
        `This will replace ${currentName}’s name, birth date, sex (if read) and recognized passport details. Birthplace, contact details and family information stay as you entered them.`,
      [
        { text: "Keep reviewing", style: "cancel" },
        {
          text: unresolvedCountries.length
            ? "Use other details"
            : "Replace details",
          onPress: () => {
            if (!alive.current) return;
            onUse(confirmed);
            close();
          },
        },
      ],
    );
  };
  const pick = async (camera: boolean) => {
    if (inFlight.current) return;
    if (!PassportReader) {
      Alert.alert(
        "Open the iOS app to scan",
        "Passport scanning is available in the DV Lottery Tracker TestFlight or development app. You can still enter your details manually in Expo Go.",
      );
      return;
    }
    inFlight.current = true;
    const source = camera ? "camera" : "photo";
    setScan({ source, reading: false });
    let pickedURI = "";
    let scanURI = "";
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!alive.current) return;
        if (!permission.granted) {
          Alert.alert(
            "Allow camera access",
            "You can enable the camera in Settings or choose an existing passport photo.",
            [
              { text: "Not now", style: "cancel" },
              {
                text: "Open Settings",
                onPress: () => {
                  void Linking.openSettings().catch(() => {
                    if (alive.current)
                      Alert.alert(
                        "Open Settings manually",
                        "In your device Settings, allow camera access for this app, then try again. You can also choose an existing photo.",
                      );
                  });
                },
              },
            ],
          );
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
        exif: false,
      };
      const result = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets.length) return;
      pickedURI = result.assets[0].uri;
      if (!alive.current) return;
      if (
        !FileSystem.cacheDirectory ||
        !pickedURI.startsWith(FileSystem.cacheDirectory)
      ) {
        throw new Error("Please choose a photo using the system photo picker.");
      }
      setScan({ source, reading: true });
      AccessibilityInfo.announceForAccessibility(
        "Reading passport on this device.",
      );
      await FileSystem.makeDirectoryAsync(scanDirectory, {
        intermediates: true,
      });
      scanURI = `${scanDirectory}${Date.now()}.jpg`;
      await FileSystem.moveAsync({ from: pickedURI, to: scanURI });
      if (!alive.current) return;
      const lines = await PassportReader.recognize(scanURI);
      const extracted = parsePassport(lines);
      if (alive.current) {
        setRawCountries({
          issuer: extracted.issuer,
          nationality: extracted.nationality,
        });
        setReading({
          ...extracted,
          issuer: normalizeCountry(extracted.issuer) ?? "",
          nationality: normalizeCountry(extracted.nationality) ?? "",
        });
        setEditing(false);
        setShowErrors(false);
        void feedback("success");
      }
    } catch (e) {
      if (alive.current) {
        void feedback("error");
        Alert.alert("Passport could not be read", passportScanErrorMessage(e));
      }
    } finally {
      // Remove only the picker’s temporary copy, never the user’s Photos original.
      for (const uri of [pickedURI, scanURI]) {
        if (
          uri &&
          FileSystem.cacheDirectory &&
          uri.startsWith(FileSystem.cacheDirectory)
        ) {
          await FileSystem.deleteAsync(uri, { idempotent: true }).catch(
            () => {},
          );
        }
      }
      inFlight.current = false;
      if (alive.current) setScan(null);
    }
  };
  return (
    <>
      <View
        style={{
          backgroundColor: C.blueSoft,
          borderRadius: 24,
          padding: 22,
          gap: 16,
        }}
      >
        <Row>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 15,
              backgroundColor: C.white,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="scan-outline" size={27} color={C.blue} />
          </View>
          <Badge>SAVE TIME</Badge>
        </Row>
        <View style={{ gap: 8 }}>
          <Title>Scan your passport</Title>
          <Body>
            Read your name, birth date and passport details, then review before
            replacing anything in your draft.
          </Body>
        </View>
        <Button
          testID="passport-camera"
          title={
            scan?.source === "camera"
              ? scan.reading
                ? "Reading passport…"
                : "Opening camera…"
              : "Scan passport"
          }
          icon="camera-outline"
          busy={scan?.source === "camera"}
          disabled={scan?.source === "photo"}
          onPress={() => void pick(true)}
        />
        <Button
          testID="passport-upload"
          secondary
          title={
            scan?.source === "photo"
              ? scan.reading
                ? "Reading passport…"
                : "Opening photos…"
              : "Choose passport photo"
          }
          icon="image-outline"
          busy={scan?.source === "photo"}
          disabled={scan?.source === "camera"}
          onPress={() => void pick(false)}
        />
        <Text style={s.small}>
          Include the full identity page and both lines at the bottom. Read on
          this device; the temporary image is removed after scanning.
        </Text>
        {onManual ? (
          <Button
            variant="tertiary"
            title="Enter manually instead"
            onPress={onManual}
            disabled={busy}
          />
        ) : (
          <Text style={[s.small, { color: C.blue }]}>
            Or enter your details below.
          </Text>
        )}
      </View>
      <Sheet
        visible={!!reading}
        title={editing ? "Edit passport details" : "Review your passport"}
        onClose={close}
        form={form}
        footer={
          reading ? (
            <Button
              testID={editing ? "passport-review-done" : "passport-use"}
              title={editing ? "Review changes" : "Looks correct"}
              icon="checkmark-outline"
              onPress={
                editing
                  ? () => {
                      if (validate()) {
                        setReading(
                          (r) =>
                            r && {
                              ...r,
                              dob: normalizeBirthDate(r.dob),
                              expires: normalizeBirthDate(r.expires),
                            },
                        );
                        setEditing(false);
                        setShowErrors(false);
                      }
                    }
                  : confirm
              }
            />
          ) : undefined
        }
      >
        {reading && (
          <Stack gap={22}>
            {!editing ? (
              <>
                <View
                  style={{
                    backgroundColor: C.successBg,
                    padding: 20,
                    borderRadius: 20,
                    gap: 8,
                  }}
                >
                  <Row>
                    <Icon name="checkmark-circle" color={C.green} size={30} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[s.fieldLabel, { color: C.green }]}>
                        Passport recognized
                      </Text>
                      <Text style={s.small}>
                        {passportFieldCount(reading)} fields ready to fill
                      </Text>
                    </View>
                  </Row>
                </View>
                <View
                  style={{
                    backgroundColor: C.white,
                    borderRadius: 22,
                    padding: 22,
                    gap: 20,
                  }}
                >
                  <View style={{ gap: 6 }}>
                    <Text
                      accessibilityRole="header"
                      style={[s.title, { fontSize: 25 }]}
                    >
                      {[reading.first, reading.middle, reading.last]
                        .filter(Boolean)
                        .join(" ")}
                    </Text>
                    <Text style={s.body}>
                      {reading.sex || "Sex not read"} ·{" "}
                      {displayBirthDate(reading.dob)}
                    </Text>
                  </View>
                  <Fact
                    label="Nationality"
                    value={reading.nationality || "Confirm nationality"}
                  />
                  <Fact
                    label="Issuing country"
                    value={reading.issuer || "Confirm issuing country"}
                  />
                  <Fact label="Passport number" value={reading.number} />
                  <Fact
                    label="Expires"
                    value={displayBirthDate(reading.expires)}
                  />
                </View>
                <Text style={s.small}>
                  Check the spelling, first and middle name split, and full
                  birth year against your passport. Nothing has changed in your
                  draft yet.
                </Text>
                <Button
                  testID="passport-edit"
                  variant="secondary"
                  title="Edit details"
                  icon="create-outline"
                  onPress={() => setEditing(true)}
                />
              </>
            ) : (
              <>
                <FormSection title="Name on your passport">
                  <Field
                    fieldId="scan.first"
                    testID="passport-review-first"
                    label="First / given name"
                    value={reading.first}
                    onChangeText={(v) => set("first", v)}
                    textContentType="givenName"
                    autoCapitalize="words"
                    spellCheck={false}
                    error={showErrors ? errors["scan.first"] : undefined}
                  />
                  <Field
                    fieldId="scan.middle"
                    testID="passport-review-middle"
                    label="Middle name (optional)"
                    value={reading.middle}
                    onChangeText={(v) => set("middle", v)}
                    textContentType="middleName"
                    autoCapitalize="words"
                    spellCheck={false}
                  />
                  <Field
                    fieldId="scan.last"
                    testID="passport-review-last"
                    label="Last / family name"
                    value={reading.last}
                    onChangeText={(v) => set("last", v)}
                    textContentType="familyName"
                    autoCapitalize="words"
                    spellCheck={false}
                  />
                </FormSection>
                <FormSection title="Birth information">
                  <Field
                    fieldId="scan.dob"
                    label="Date of birth (MM/DD/YYYY)"
                    value={displayBirthDate(reading.dob)}
                    onChangeText={(v) => set("dob", v)}
                    keyboardType="numbers-and-punctuation"
                    textContentType="none"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={10}
                    error={showErrors ? errors["scan.dob"] : undefined}
                  />
                  <Select
                    fieldId="scan.sex"
                    label="Sex (official form)"
                    value={reading.sex}
                    options={["Male", "Female"]}
                    onChange={(v) => set("sex", v)}
                  />
                </FormSection>
                <FormSection title="Passport details">
                  <Field
                    fieldId="scan.number"
                    label="Passport number"
                    value={reading.number}
                    onChangeText={(v) => set("number", v.toUpperCase())}
                    autoCapitalize="characters"
                    textContentType="none"
                    autoComplete="off"
                    spellCheck={false}
                    error={showErrors ? errors["scan.number"] : undefined}
                  />
                  <Select
                    fieldId="scan.issuer"
                    label="Issuing country"
                    value={reading.issuer}
                    options={countries}
                    onChange={(v) => set("issuer", v)}
                    searchable
                  />
                  <Select
                    fieldId="scan.nationality"
                    label="Nationality"
                    value={reading.nationality}
                    options={countries}
                    onChange={(v) => set("nationality", v)}
                    searchable
                  />
                  <Field
                    fieldId="scan.expires"
                    label="Passport expiry (MM/DD/YYYY)"
                    value={displayBirthDate(reading.expires)}
                    onChangeText={(v) => set("expires", v)}
                    keyboardType="numbers-and-punctuation"
                    textContentType="none"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={10}
                    error={showErrors ? errors["scan.expires"] : undefined}
                  />
                </FormSection>
              </>
            )}
            {(!reading.issuer || !reading.nationality) && (
              <Notice title="Confirm the country details">
                {!reading.issuer
                  ? `Issuing country${rawCountries.issuer ? ` (${rawCountries.issuer})` : ""} could not be matched. `
                  : ""}
                {!reading.nationality
                  ? `Nationality${rawCountries.nationality ? ` (${rawCountries.nationality})` : ""} could not be matched. `
                  : ""}
                {editing
                  ? "Choose the matching country above. "
                  : "Choose Edit details to confirm. "}
                If the passport uses a special authority or stateless code,
                leave that country unselected.
                Existing country details will be kept.
              </Notice>
            )}
            <Text style={s.small}>
              Country of birth, education, contact and family details still need
              your input. A passport scan does not replace your DV portrait
              photo.
            </Text>
            <Button variant="tertiary" title="Discard scan" onPress={close} />
          </Stack>
        )}
      </Sheet>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={{ gap: 4 }}
    >
      <Text style={s.small}>{label}</Text>
      <Text style={s.fieldLabel}>{value}</Text>
    </View>
  );
}
