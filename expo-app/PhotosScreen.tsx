import React, { useState } from "react";
import { Alert, Image, Text, View } from "react-native";
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
  Empty,
  Field,
  Label,
  LinkRow,
  Notice,
  Row,
  Screen,
  Select,
  Sheet,
  Stack,
  Title,
  Toggle,
  s,
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
  const pick = async (camera: boolean) => {
    setBusy(true);
    try {
      if (camera) {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (!p.granted) {
          Alert.alert(
            "Camera access needed",
            "Allow camera access in iOS Settings, or choose an existing photo.",
          );
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        exif: false,
      };
      const result = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
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
  };
  const save = () => {
    if (!pending) return;
    if (!validPastDate(pending.takenOn) || !dateConfirmed) {
      Alert.alert(
        "Confirm the photo date",
        "Enter the date the original photo was taken (YYYY-MM-DD) and confirm it.",
      );
      return;
    }
    update((r) => ({
      ...r,
      photos: [pending, ...r.photos],
      draft: { ...r.draft, reviewed: false },
    }));
    setPending(null);
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
            update((r) => ({
              ...r,
              photos: r.photos.filter((p) => p.id !== photo.id),
              draft: { ...r.draft, reviewed: false },
            }));
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
  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Label>Photo studio</Label>
        <Text style={{ fontSize: 30, fontWeight: "700", color: C.navy }}>
          A photo for each person
        </Text>
        <Body muted>
          Prepare, review and keep your family’s photos together.
        </Body>
      </View>
      <Card>
        <Badge>600 × 600 px · JPEG · ≤240 kB</Badge>
        <Title>Start with a good original</Title>
        <Body muted>
          Use a recent color photo, a plain white or off-white background, a
          neutral expression and even lighting. No glasses, filters or
          retouching.
        </Body>
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
          Position your head and shoulders in the square crop. We resize and
          compress the image; we never alter your face or background.
        </Text>
      </Card>
      <Row>
        <Title>Your photo library</Title>
        <Badge>{records.photos.length} saved</Badge>
      </Row>
      {!records.photos.length ? (
        <Card>
          <Empty icon="images-outline" title="Your photos belong here">
            Add a photo, assign it to a person, then review it against the
            official examples.
          </Empty>
        </Card>
      ) : (
        records.photos.map((photo) => (
          <Card key={photo.id}>
            <View style={{ flexDirection: "row", gap: 18 }}>
              <Image
                source={{ uri: photo.uri }}
                accessibilityLabel={`Photo for ${photo.name}`}
                style={{
                  width: 104,
                  height: 104,
                  borderRadius: 15,
                  backgroundColor: C.bg,
                }}
              />
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={s.title}>
                  {records.draft.people.find((p) => p.id === photo.personId)
                    ? personName(
                        records.draft.people.find(
                          (p) => p.id === photo.personId,
                        )!,
                      )
                    : photo.name}
                </Text>
                <Badge tone={photoReviewed(photo) ? "green" : "warm"}>
                  {photoReviewed(photo)
                    ? "User reviewed"
                    : photoRecent(photo)
                      ? "Review needed"
                      : "New photo needed"}
                </Badge>
                <Text style={s.small}>
                  Taken {photo.takenOn}
                  {"\n"}600 × 600 · {Math.ceil(photo.bytes / 1000)} kB
                </Text>
              </View>
            </View>
            <Toggle
              title="Composition reviewed"
              detail="Check head size, eye position, lighting, expression and background against official examples."
              value={photo.composition}
              onChange={(v) =>
                update((r) => ({
                  ...r,
                  photos: r.photos.map((p) =>
                    p.id === photo.id ? { ...p, composition: v } : p,
                  ),
                  draft: { ...r.draft, reviewed: false },
                }))
              }
            />
            <Toggle
              title="Not used in a previous DV entry"
              value={photo.notReused}
              onChange={(v) =>
                update((r) => ({
                  ...r,
                  photos: r.photos.map((p) =>
                    p.id === photo.id ? { ...p, notReused: v } : p,
                  ),
                  draft: { ...r.draft, reviewed: false },
                }))
              }
            />
            <Select
              label="Assigned to"
              value={
                records.draft.people.some((p) => p.id === photo.personId)
                  ? records.draft.people.map(
                      (p, i) => `${personName(p)} · ${p.relationship} ${i + 1}`,
                    )[
                      records.draft.people.findIndex(
                        (p) => p.id === photo.personId,
                      )
                    ]
                  : "Previous draft — choose a person"
              }
              options={records.draft.people.map(
                (p, i) => `${personName(p)} · ${p.relationship} ${i + 1}`,
              )}
              onChange={(value) => {
                const index = records.draft.people.findIndex(
                  (p, i) =>
                    `${personName(p)} · ${p.relationship} ${i + 1}` === value,
                );
                if (index >= 0)
                  update((r) => ({
                    ...r,
                    photos: r.photos.map((p) =>
                      p.id === photo.id
                        ? {
                            ...p,
                            personId: r.draft.people[index].id,
                            name: personName(r.draft.people[index]),
                          }
                        : p,
                    ),
                  }));
              }}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 2 }}>
                <Button
                  secondary
                  title="Export JPEG"
                  icon="share-outline"
                  onPress={() => void share(photo)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  secondary
                  title="Delete"
                  onPress={() => remove(photo)}
                />
              </View>
            </View>
          </Card>
        ))
      )}
      <Notice title="Preparation is not approval">
        Photo dates and visual checks are your own review. These checks cannot
        guarantee acceptance. Use a photo taken within the last six months.
      </Notice>
      <Card>
        <LinkRow
          title="Official photo requirements"
          detail="See accepted and rejected examples"
          url={official.photos}
        />
      </Card>
      <Sheet visible={!!pending} title="Review your photo" onClose={close}>
        {pending && (
          <Stack>
            <Image
              source={{ uri: pending.uri }}
              style={{
                width: "100%",
                maxWidth: 360,
                aspectRatio: 1,
                alignSelf: "center",
                borderRadius: 20,
              }}
            />
            <Badge>
              600 × 600 px · {Math.ceil(pending.bytes / 1000)} kB JPEG
            </Badge>
            <Select
              label="This photo belongs to"
              value={
                records.draft.people.map(
                  (p, i) => `${personName(p)} · ${p.relationship} ${i + 1}`,
                )[
                  records.draft.people.findIndex(
                    (p) => p.id === pending.personId,
                  )
                ]
              }
              options={records.draft.people.map(
                (p, i) => `${personName(p)} · ${p.relationship} ${i + 1}`,
              )}
              onChange={(value) => {
                const p = records.draft.people.find(
                  (p, i) =>
                    `${personName(p)} · ${p.relationship} ${i + 1}` === value,
                );
                if (p)
                  setPending({
                    ...pending,
                    personId: p.id,
                    name: personName(p),
                  });
              }}
            />
            <Field
              label="Original photo taken on"
              placeholder="YYYY-MM-DD"
              value={pending.takenOn}
              keyboardType="numbers-and-punctuation"
              onChangeText={(v) => {
                setPending({ ...pending, takenOn: v });
                setDateConfirmed(false);
              }}
              help="Use the capture date, not the download or editing date."
            />
            <Toggle
              title="I confirm the original capture date"
              value={dateConfirmed}
              onChange={setDateConfirmed}
            />
            <Toggle
              title="I reviewed the official composition rules"
              value={pending.composition}
              onChange={(v) => setPending({ ...pending, composition: v })}
            />
            <Toggle
              title="Not used in a previous DV entry"
              value={pending.notReused}
              onChange={(v) => setPending({ ...pending, notReused: v })}
            />
            <LinkRow title="Review photo examples" url={official.photos} />
            <Button title="Save photo" icon="checkmark" onPress={save} />
          </Stack>
        )}
      </Sheet>
    </Screen>
  );
}
