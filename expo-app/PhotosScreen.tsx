import React, { useRef, useState } from "react";
import { Alert, Image, Platform, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
  Photo,
  Records,
  id,
  official,
  personName,
  photoRecent,
  photoReviewed,
  today,
  validPastDate,
} from "./models";
import {
  Badge,
  Body,
  Button,
  C,
  Card,
  Field,
  FormSection,
  Icon,
  LinkRow,
  Notice,
  PageHeading,
  Screen,
  Select,
  Sheet,
  Stack,
  Title,
  Toggle,
  feedback,
  s,
  useFormNavigation,
} from "./ui";

export const photoDirectory = `${FileSystem.documentDirectory}dv-lottery-photos/`;
export async function removePhotoFile(uri: string) {
  if (uri.startsWith(photoDirectory))
    await FileSystem.deleteAsync(uri, { idempotent: true });
}

export function PhotosScreen({
  records,
  update,
}: {
  records: Records;
  update: (fn: (r: Records) => Records) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Photo | null>(null);
  const [dateConfirmed, setDateConfirmed] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [fromCamera, setFromCamera] = useState(false);
  const [editingID, setEditingID] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const retakeAfterDismiss = useRef<boolean | null>(null);
  const reviewForm = useFormNavigation();
  const editing = records.photos.find((photo) => photo.id === editingID);
  const options = records.draft.people.map(
    (person, index) =>
      `${personName(person)} · ${person.relationship} ${index + 1}`,
  );
  const assignedLabel = (photo: Photo) =>
    options[
      records.draft.people.findIndex((person) => person.id === photo.personId)
    ] || "Previous draft — choose a person";
  const photoName = (photo: Photo) => {
    const person = records.draft.people.find(
      (person) => person.id === photo.personId,
    );
    return person ? personName(person) : photo.name;
  };
  const pick = async (camera: boolean) => {
    if (busy) return;
    setBusy(true);
    setSaved(false);
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            "Camera access needed",
            "Allow camera access in iOS Settings, or choose an existing photo.",
          );
          return;
        }
      }
      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        exif: false,
      };
      const result = camera
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);
      if (result.canceled || !result.assets.length) return;
      const source = result.assets[0];
      const side = Math.min(source.width, source.height);
      if (side < 600) {
        Alert.alert(
          "Use a larger photo",
          "The square crop must be at least 600 × 600 pixels. Choose the original full-resolution image.",
        );
        return;
      }
      let output = "";
      let bytes = 0;
      for (const compress of [0.95, 0.85, 0.75, 0.65, 0.5, 0.35]) {
        const image = await ImageManipulator.manipulateAsync(
          source.uri,
          [
            {
              crop: {
                originX: Math.floor((source.width - side) / 2),
                originY: Math.floor((source.height - side) / 2),
                width: side,
                height: side,
              },
            },
            { resize: { width: 600, height: 600 } },
          ],
          { compress, format: ImageManipulator.SaveFormat.JPEG },
        );
        const info = await FileSystem.getInfoAsync(image.uri);
        if (info.exists && info.size <= 240000) {
          output = image.uri;
          bytes = info.size;
          break;
        }
        await FileSystem.deleteAsync(image.uri, { idempotent: true });
      }
      if (!output)
        throw new Error(
          "The JPEG could not be reduced below 240 kB. Try another original photo.",
        );
      await FileSystem.makeDirectoryAsync(photoDirectory, {
        intermediates: true,
      });
      const photoID = id();
      const uri = `${photoDirectory}${photoID}.jpg`;
      await FileSystem.copyAsync({ from: output, to: uri });
      await FileSystem.deleteAsync(output, { idempotent: true });
      setShowErrors(false);
      setFromCamera(camera);
      setDateConfirmed(camera);
      setPending({
        id: photoID,
        personId: records.draft.people[0].id,
        name: personName(records.draft.people[0]),
        uri,
        bytes,
        takenOn: camera ? today() : "",
        composition: false,
        notReused: false,
      });
    } catch (error) {
      Alert.alert(
        "Photo could not be prepared",
        error instanceof Error
          ? error.message
          : "Try again or choose an existing image. Camera capture requires a physical device.",
      );
    } finally {
      setBusy(false);
    }
  };
  const close = () => {
    if (pending) void removePhotoFile(pending.uri);
    setPending(null);
    setShowErrors(false);
  };
  const retake = () => {
    retakeAfterDismiss.current = fromCamera;
    close();
    // iOS must dismiss its review sheet before presenting the system picker.
    if (Platform.OS !== "ios") {
      retakeAfterDismiss.current = null;
      void pick(fromCamera);
    }
  };
  const onReviewDismiss = () => {
    const camera = retakeAfterDismiss.current;
    retakeAfterDismiss.current = null;
    if (camera !== null) void pick(camera);
  };
  const pendingErrors = {
    takenOn:
      pending && !validPastDate(pending.takenOn)
        ? "Enter the original capture date as YYYY-MM-DD, not a future date."
        : undefined,
    dateConfirmed: !dateConfirmed
      ? "Confirm when this photo was originally taken."
      : undefined,
  };
  const save = () => {
    if (!pending) return;
    if (Object.values(pendingErrors).some(Boolean)) {
      setShowErrors(true);
      reviewForm.focusFirst(pendingErrors);
      feedback("error");
      return;
    }
    update((records) => ({
      ...records,
      photos: [pending, ...records.photos],
      draft: { ...records.draft, reviewed: false },
    }));
    feedback("success");
    setPending(null);
    setSaved(true);
    setShowErrors(false);
  };
  const changePhoto = (photo: Photo, patch: Partial<Photo>) =>
    update((records) => ({
      ...records,
      photos: records.photos.map((item) =>
        item.id === photo.id ? { ...item, ...patch } : item,
      ),
      draft: { ...records.draft, reviewed: false },
    }));
  const assign = (photo: Photo, label: string, isPending = false) => {
    const person = records.draft.people[options.indexOf(label)];
    if (!person) return;
    const patch = { personId: person.id, name: personName(person) };
    if (isPending) setPending({ ...photo, ...patch });
    else changePhoto(photo, patch);
  };
  const remove = (photo: Photo) =>
    Alert.alert(
      "Delete this photo?",
      "This removes the app’s copy. Your original in Photos stays unchanged.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            update((records) => ({
              ...records,
              photos: records.photos.filter((item) => item.id !== photo.id),
              draft: { ...records.draft, reviewed: false },
            }));
            setEditingID(null);
            void removePhotoFile(photo.uri);
          },
        },
      ],
    );
  const share = async (photo: Photo) => {
    try {
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(photo.uri, {
          mimeType: "image/jpeg",
          UTI: "public.jpeg",
          dialogTitle: "Export DV photo",
        });
      else Alert.alert("Sharing unavailable");
    } catch {
      Alert.alert(
        "Could not share photo",
        "Try again after the image finishes saving.",
      );
    }
  };
  const statusLabel = (photo: Photo) =>
    photoReviewed(photo)
      ? "Reviewed by you"
      : photoRecent(photo)
        ? "Needs review"
        : "New photo needed";
  const statusTone = (photo: Photo) =>
    photoReviewed(photo) ? ("green" as const) : ("warm" as const);
  const peopleReady = records.draft.people.filter((person) =>
    records.photos.some(
      (photo) => photo.personId === person.id && photoReviewed(photo),
    ),
  ).length;
  return (
    <Screen>
      <PageHeading eyebrow="DV photo" title="A photo for each person">
        Get the file ready, then review the details that matter.
      </PageHeading>
      <Card style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.cameraIcon}>
            <Icon name="camera-outline" size={30} color={C.blue} />
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Title>Start with your photo</Title>
            <Body muted>Face forward. Plain background. Even light.</Body>
          </View>
        </View>
        <Button
          title="Take a photo"
          icon="camera-outline"
          busy={busy}
          onPress={() => void pick(true)}
        />
        <Button
          secondary
          title="Choose from Photos"
          icon="images-outline"
          disabled={busy}
          onPress={() => void pick(false)}
        />
        <Text style={s.small}>
          Keep your head and shoulders in the square crop. No glasses, filters
          or retouching.
        </Text>
        <LinkRow
          title="See photo guidance"
          detail="Official examples and requirements"
          url={official.photos}
        />
      </Card>
      {saved && (
        <View accessibilityRole="alert" style={styles.success}>
          <Icon name="checkmark-circle" color={C.green} />
          <Text style={[s.fieldLabel, { color: C.green, flex: 1 }]}>
            Photo saved on this device
          </Text>
        </View>
      )}
      <View style={{ gap: 6 }}>
        <Title>Your photo library</Title>
        <Body muted>
          {peopleReady} of {records.draft.people.length} people have a photo
          reviewed by you.
        </Body>
      </View>
      {!records.photos.length ? (
        <View style={styles.empty}>
          <Icon name="person-circle-outline" size={42} color={C.blue} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.fieldLabel}>Your first photo starts here</Text>
            <Text style={s.small}>
              Take or choose a photo above. We’ll create a 600 × 600 JPEG and
              keep it with your entry.
            </Text>
          </View>
        </View>
      ) : (
        records.photos.map((photo) => (
          <Card key={photo.id}>
            <View style={styles.photoRow}>
              <Image
                source={{ uri: photo.uri }}
                accessibilityLabel={`Photo for ${photoName(photo)}`}
                style={styles.thumbnail}
              />
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={s.title}>{photoName(photo)}</Text>
                <Badge tone={statusTone(photo)}>{statusLabel(photo)}</Badge>
                <Text style={s.small}>Taken {photo.takenOn}</Text>
              </View>
            </View>
            <Text style={s.small}>
              600 × 600 JPEG · {Math.ceil(photo.bytes / 1000)} kB · Saved on
              this device
            </Text>
            <Button
              secondary
              title={
                photoReviewed(photo) ? "View & edit review" : "Review photo"
              }
              icon="image-outline"
              onPress={() => setEditingID(photo.id)}
            />
          </Card>
        ))
      )}
      <Text style={s.small}>
        File size and dimensions are prepared automatically. Composition and
        capture dates need your review; the app cannot guarantee government
        acceptance.
      </Text>
      <Sheet
        visible={!!pending}
        title="Review your photo"
        onClose={close}
        onDismiss={onReviewDismiss}
        form={reviewForm}
        footer={
          <Stack gap={8}>
            <Button title="Use this photo" icon="checkmark" onPress={save} />
            <Button
              variant="tertiary"
              title={fromCamera ? "Retake" : "Choose another photo"}
              onPress={retake}
            />
          </Stack>
        }
      >
        {pending && (
          <Stack gap={24}>
            <Image
              source={{ uri: pending.uri }}
              accessibilityLabel="Preview of your prepared photo"
              style={styles.preview}
            />
            <Badge tone="green">
              File ready · 600 × 600 JPEG · {Math.ceil(pending.bytes / 1000)} kB
            </Badge>
            <FormSection title="Photo details">
              <Select
                label="This photo belongs to"
                value={assignedLabel(pending)}
                options={options}
                onChange={(value) => assign(pending, value, true)}
              />
              <Field
                fieldId="takenOn"
                label="Original photo taken on"
                placeholder="YYYY-MM-DD"
                value={pending.takenOn}
                keyboardType="numbers-and-punctuation"
                textContentType="none"
                autoCapitalize="none"
                error={showErrors ? pendingErrors.takenOn : undefined}
                onChangeText={(value) => {
                  setPending({ ...pending, takenOn: value });
                  setDateConfirmed(false);
                }}
                help="Use the capture date, not the download or editing date."
              />
              <Toggle
                fieldId="dateConfirmed"
                title="I confirm the original capture date"
                value={dateConfirmed}
                onChange={setDateConfirmed}
                error={showErrors ? pendingErrors.dateConfirmed : undefined}
              />
            </FormSection>
            <FormSection
              title="Your visual review"
              description="You can finish these checks now or return to them later."
            >
              <Toggle
                title="I reviewed the official composition rules"
                detail="Check head size, eye position, background and lighting."
                value={pending.composition}
                onChange={(value) =>
                  setPending({ ...pending, composition: value })
                }
              />
              <Toggle
                title="Not used in a previous DV entry"
                value={pending.notReused}
                onChange={(value) =>
                  setPending({ ...pending, notReused: value })
                }
              />
              <LinkRow title="Review photo examples" url={official.photos} />
            </FormSection>
            {!photoRecent(pending) &&
              pending.takenOn &&
              validPastDate(pending.takenOn) && (
                <Notice title="A more recent photo is needed">
                  You can keep this photo in your library, but your DV entry
                  needs one taken within the last six months.
                </Notice>
              )}
          </Stack>
        )}
      </Sheet>
      <Sheet
        visible={!!editing}
        title="Your photo review"
        onClose={() => setEditingID(null)}
        footer={
          <Button
            title="Done"
            icon="checkmark"
            onPress={() => {
              if (editing && photoReviewed(editing)) feedback("success");
              setEditingID(null);
            }}
          />
        }
      >
        {editing && (
          <Stack gap={24}>
            <Image
              source={{ uri: editing.uri }}
              accessibilityLabel={`Photo for ${photoName(editing)}`}
              style={styles.preview}
            />
            <View style={{ gap: 8 }}>
              <Title>{photoName(editing)}</Title>
              <Badge tone={statusTone(editing)}>{statusLabel(editing)}</Badge>
              <Text style={s.small}>
                Taken {editing.takenOn} · 600 × 600 JPEG ·{" "}
                {Math.ceil(editing.bytes / 1000)} kB
              </Text>
            </View>
            {!photoRecent(editing) && (
              <Notice title="Add a recent photo">
                Your entry needs a photo taken within the last six months. Take
                or choose a new photo from your library screen.
              </Notice>
            )}
            <FormSection
              title="Your checks"
              description="These are your own checks, not government approval."
            >
              <Toggle
                title="Composition reviewed"
                detail="Check head size, eye position, lighting, expression and background against official examples."
                value={editing.composition}
                onChange={(value) =>
                  changePhoto(editing, { composition: value })
                }
              />
              <Toggle
                title="Not used in a previous DV entry"
                value={editing.notReused}
                onChange={(value) => changePhoto(editing, { notReused: value })}
              />
              <LinkRow title="Review photo examples" url={official.photos} />
            </FormSection>
            <Select
              label="Assigned to"
              value={assignedLabel(editing)}
              options={options}
              onChange={(value) => assign(editing, value)}
            />
            <Button
              secondary
              title="Export JPEG"
              icon="share-outline"
              onPress={() => void share(editing)}
            />
            <Button
              danger
              title="Delete photo"
              icon="trash-outline"
              onPress={() => remove(editing)}
            />
          </Stack>
        )}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: C.white, borderColor: C.blueSoft },
  heroTop: { flexDirection: "row", gap: 14, alignItems: "center" },
  cameraIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: C.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  photoRow: { flexDirection: "row", gap: 16, alignItems: "center" },
  thumbnail: { width: 82, height: 82, borderRadius: 14, backgroundColor: C.bg },
  preview: {
    width: "100%",
    maxWidth: 360,
    aspectRatio: 1,
    alignSelf: "center",
    borderRadius: 20,
    backgroundColor: C.bg,
  },
  empty: { flexDirection: "row", gap: 14, paddingVertical: 18 },
  success: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    backgroundColor: C.successBg,
    padding: 14,
  },
});
