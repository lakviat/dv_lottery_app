import React, { useEffect, useRef, useState } from "react";
import { Alert, Linking, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import PassportReader from "../modules/passport-reader";
import { PassportReading, parsePassport } from "./passport";
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
  Icon,
  Notice,
  Row,
  Select,
  Sheet,
  Stack,
  Title,
  s,
} from "./ui";

const scanDirectory = `${FileSystem.cacheDirectory}passport-import/`;
export async function clearPassportCache() {
  await FileSystem.deleteAsync(scanDirectory, { idempotent: true });
}

export function PassportCapture({
  onUse,
  currentName,
}: {
  onUse: (reading: PassportReading) => void;
  currentName: string;
}) {
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState<PassportReading | null>(null);
  const [error, setError] = useState("");
  const alive = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const set = (key: keyof PassportReading, value: string) => {
    setReading((r) => r && { ...r, [key]: value });
    setError("");
  };
  const pick = async (camera: boolean) => {
    if (inFlight.current) return;
    if (!PassportReader) {
      Alert.alert(
        "Passport scanning needs the iOS development build",
        "Expo Go can run the form but does not include the on-device passport scanner. Open the DV Lottery Tracker development app to scan, or enter your details manually here.",
      );
      return;
    }
    inFlight.current = true;
    setBusy(true);
    let pickedURI = "";
    let scanURI = "";
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            "Allow camera access",
            "You can enable the camera in Settings or choose an existing passport photo.",
            [
              { text: "Not now", style: "cancel" },
              {
                text: "Open Settings",
                onPress: () => void Linking.openSettings(),
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
      if (
        !FileSystem.cacheDirectory ||
        !pickedURI.startsWith(FileSystem.cacheDirectory)
      ) {
        throw new Error("Please choose a photo using the system photo picker.");
      }
      await FileSystem.makeDirectoryAsync(scanDirectory, {
        intermediates: true,
      });
      scanURI = `${scanDirectory}${Date.now()}.jpg`;
      await FileSystem.moveAsync({ from: pickedURI, to: scanURI });
      const lines = await PassportReader.recognize(scanURI);
      const extracted = parsePassport(lines);
      if (alive.current) {
        setError("");
        setReading(extracted);
      }
    } catch (e) {
      if (alive.current)
        Alert.alert(
          "Passport could not be read",
          e instanceof Error
            ? e.message
            : "Try a clearer image, or enter your details manually.",
        );
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
      if (alive.current) setBusy(false);
    }
  };
  return (
    <>
      <View
        style={{
          backgroundColor: "#EBF1F9",
          borderRadius: 22,
          padding: 22,
          gap: 14,
        }}
      >
        <Row>
          <Icon name="scan-outline" size={28} />
          <Badge>Optional shortcut</Badge>
        </Row>
        <Title>Start with your passport</Title>
        <Body>
          Photograph the identity page or choose a photo to fill in your
          personal and passport details.
        </Body>
        <Button
          testID="passport-camera"
          title="Take passport photo"
          icon="camera-outline"
          busy={busy}
          onPress={() => void pick(true)}
        />
        <Button
          testID="passport-upload"
          secondary
          title="Choose passport photo"
          icon="image-outline"
          disabled={busy}
          onPress={() => void pick(false)}
        />
        <Text style={s.small}>
          Keep the whole page and both machine-readable lines in view. Read on
          this device, then review before saving. The app removes its temporary
          photo after reading.
        </Text>
        {!PassportReader && (
          <Text style={s.small}>
            Scanner available in the DV Lottery Tracker iOS development build. Manual
            entry works in Expo Go.
          </Text>
        )}
        <Text style={[s.small, { color: C.blue }]}>
          Prefer to type? Complete the fields below.
        </Text>
      </View>
      <Sheet
        visible={!!reading}
        title="Review passport details"
        onClose={() => {
          setReading(null);
          setError("");
        }}
      >
        {reading && (
          <Stack>
            <Body>
              Check the details below. They will replace {currentName}’s
              personal and passport details when you tap Use these details.
            </Body>
            <Notice title="Check names and birth date">
              Confirm spelling, the first / middle name split, and the full
              birth year against your passport.
            </Notice>
            <Field
              testID="passport-review-first"
              label="First / given name"
              value={reading.first}
              onChangeText={(v) => set("first", v)}
            />
            <Field
              testID="passport-review-middle"
              label="Middle name (optional)"
              value={reading.middle}
              onChangeText={(v) => set("middle", v)}
            />
            <Field
              testID="passport-review-last"
              label="Last / family name"
              value={reading.last}
              onChangeText={(v) => set("last", v)}
            />
            <Field
              label="Date of birth (MM/DD/YYYY)"
              value={displayBirthDate(reading.dob)}
              onChangeText={(v) => set("dob", v)}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            <Select
              label="Sex (official form)"
              value={reading.sex}
              options={["Male", "Female"]}
              onChange={(v) => set("sex", v)}
            />
            <Field
              label="Passport number"
              value={reading.number}
              onChangeText={(v) => set("number", v.toUpperCase())}
              autoCapitalize="characters"
            />
            <Field
              label="Issuing country / authority code"
              help="As printed in the passport’s machine-readable lines, e.g. KGZ."
              value={reading.issuer}
              onChangeText={(v) => set("issuer", v.toUpperCase())}
              autoCapitalize="characters"
              maxLength={3}
            />
            <Field
              label="Nationality code"
              help="This does not determine your country of birth or DV eligibility."
              value={reading.nationality}
              onChangeText={(v) => set("nationality", v.toUpperCase())}
              autoCapitalize="characters"
              maxLength={3}
            />
            <Field
              label="Passport expiry (MM/DD/YYYY)"
              value={displayBirthDate(reading.expires)}
              onChangeText={(v) => set("expires", v)}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            <Body muted>
              Birthplace, education, contact details and family still need your
              input. This passport image cannot replace your DV portrait photo.
            </Body>
            {!!error && <Notice title="Check these details">{error}</Notice>}
            <Button
              testID="passport-use"
              title="Use these details"
              icon="checkmark-outline"
              onPress={() => {
                if (
                  (!reading.first.trim() && !reading.last.trim()) ||
                  !validPastDate(normalizeBirthDate(reading.dob)) ||
                  !reading.number.trim() ||
                  !/^[A-Z]{1,3}$/.test(reading.issuer) ||
                  !/^[A-Z]{1,3}$/.test(reading.nationality) ||
                  !parseDate(normalizeBirthDate(reading.expires))
                ) {
                  setError(
                    "Confirm at least one name, a valid birth date, passport number, country codes and expiry date.",
                  );
                  return;
                }
                onUse({
                  ...reading,
                  dob: normalizeBirthDate(reading.dob),
                  expires: normalizeBirthDate(reading.expires),
                });
                setReading(null);
              }}
            />
            <Button
              secondary
              title="Discard scan"
              onPress={() => {
                setReading(null);
                setError("");
              }}
            />
          </Stack>
        )}
      </Sheet>
    </>
  );
}
