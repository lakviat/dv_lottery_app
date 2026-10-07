import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Alert, Image, Platform, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { PhotoCheckResults } from "./PhotoCheckResults";
import type { PhotoCheckReport } from "./photoCheckTypes";
import { analyzePhoto } from "./photoAnalysis";
import { failedPhotoCheckReport, photoCheckSummary } from "./photoChecks";
import { deletePhoto, reassignPhoto, selectPhoto } from "./photoState";
import { photoDirectory, removePhotoAssets, removePhotoFile } from "./photoFiles";
import {
  Photo,
  Records,
  id,
  official,
  personName,
  photoRecent,
  personPhotoComplete,
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

export function PhotosScreen({
  records,
  update,
  initialPersonId,
  beginPhotoOperation,
}: {
  records: Records;
  update: (fn: (r: Records) => Records) => Promise<void>;
  initialPersonId?: string;
  beginPhotoOperation: () => () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState("");
  const [personId, setPersonId] = useState(initialPersonId ?? records.draft.people[0].id);
  const selectedPerson = records.draft.people.find((person) => person.id === personId) ?? records.draft.people[0];
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const checking = useRef<string | null>(null);
  const [checkingID, setCheckingID] = useState<string | null>(null);
  const [deletingID, setDeletingID] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);
  const savingPhoto = useRef(false);
  const [saving, setSaving] = useState(false);
  const pendingOperation = useRef<(() => void) | null>(null);
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
  const isSelected = (photo: Photo) => records.draft.people.some(
    (person) => person.id === photo.personId && person.selectedPhotoId === photo.id,
  );
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pendingOperation.current?.();
      pendingOperation.current = null;
    };
  }, []);
  const checkPhoto = async (photo: Photo, isPending = false) => {
    if (checking.current) return;
    const finishOperation = beginPhotoOperation();
    checking.current = photo.id;
    setCheckingID(photo.id);
    try {
      let report: PhotoCheckReport;
      try {
        report = await analyzePhoto(photo.uri);
      } catch (error) {
        if (__DEV__) console.warn("Photo check failed:", error instanceof Error ? error.name : "Unknown error");
        report = failedPhotoCheckReport();
      }
      if (!mounted.current) return;
      if (report.error && photo.analysis) {
        const previousFailures = photo.analysis.checks.filter((check) => check.kind === "technical" && check.state === "attention");
        report = {
          ...report,
          checks: [
            ...report.checks.map((check) =>
              check.state === "unverified" ? previousFailures.find((old) => old.id === check.id) ?? check : check,
            ),
            ...previousFailures.filter((old) => !report.checks.some((check) => check.id === old.id)),
          ],
        };
      }
      const analysis = report;
      if (isPending) {
        setPending((current) => current?.id === photo.id ? { ...current, analysis } : current);
      } else {
        await update((current) => ({
          ...current,
          photos: current.photos.map((item) => item.id === photo.id ? { ...item, analysis } : item),
          draft: {
            ...current.draft,
            reviewed: current.draft.people.some((person) => person.selectedPhotoId === photo.id)
              ? false : current.draft.reviewed,
          },
        }));
      }
    } catch {
      Alert.alert("Photo results not saved", "Keep the app open and use the save retry banner. Your photo has not been deleted.");
    } finally {
      finishOperation();
      checking.current = null;
      if (mounted.current) setCheckingID(null);
    }
  };
  const pick = async (camera: boolean) => {
    if (inFlight.current || checking.current) return;
    const finishOperation = beginPhotoOperation();
    inFlight.current = true;
    setBusy(true);
    setActivity(camera ? "Opening camera…" : "Opening Photos…");
    setSaved(false);
    let createdPhoto: Photo | undefined;
    let sourceCopy = "";
    let preparedCopy = "";
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!mounted.current) return;
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
      if (!mounted.current) return;
      const source = result.assets[0];
      setActivity("Preparing your photo…");
      AccessibilityInfo.announceForAccessibility("Preparing your photo on this device.");
      const side = Math.min(source.width, source.height);
      await FileSystem.makeDirectoryAsync(photoDirectory, { intermediates: true });
      const photoID = id();
      const sourceExtension = /\.([a-z0-9]+)(?:\?|$)/i.exec(source.uri)?.[1] ?? "image";
      sourceCopy = `${photoDirectory}${photoID}-source.${sourceExtension}`;
      await FileSystem.copyAsync({ from: source.uri, to: sourceCopy });
      let output = sourceCopy;
      for (const compress of side >= 600 ? [0.95, 0.85, 0.75, 0.65, 0.5, 0.35] : []) {
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
        if (!info.exists) throw new Error("Prepared image is missing.");
        if (info.size <= 240000 || compress === 0.35) {
          output = image.uri;
          break;
        }
        await FileSystem.deleteAsync(image.uri, { idempotent: true });
      }
      preparedCopy = `${photoDirectory}${photoID}.${side >= 600 ? "jpg" : sourceExtension}`;
      await FileSystem.copyAsync({ from: output, to: preparedCopy });
      if (output !== sourceCopy) await FileSystem.deleteAsync(output, { idempotent: true });
      const info = await FileSystem.getInfoAsync(preparedCopy);
      if (!info.exists) throw new Error("Saved photo copy is missing.");
      if (!mounted.current) return;
      setShowErrors(false);
      setFromCamera(camera);
      setDateConfirmed(camera);
      createdPhoto = {
        id: photoID,
        personId: selectedPerson.id,
        name: personName(selectedPerson),
        uri: preparedCopy,
        sourceUri: sourceCopy,
        bytes: info.size,
        takenOn: camera ? today() : "",
        composition: false,
        notReused: false,
        notAltered: false,
      };
      pendingOperation.current = finishOperation;
      setPending(createdPhoto);
      await checkPhoto(createdPhoto, true);
    } catch (error) {
      if (__DEV__) console.warn("Photo preparation failed:", error instanceof Error ? error.name : "Unknown error");
      Alert.alert(
        "Photo could not be prepared",
        "Try again or choose a different original photo. Your saved photos have not been changed.",
      );
    } finally {
      if (!createdPhoto) {
        try {
          await Promise.all([sourceCopy, preparedCopy].filter(Boolean).map(removePhotoFile));
        } catch {
          Alert.alert("Photo cleanup incomplete", "Unused app copies will be removed the next time you open the app.");
        }
        finishOperation();
      }
      inFlight.current = false;
      if (mounted.current) {
        setBusy(false);
        setActivity("");
      }
    }
  };
  const close = () => {
    if (savingPhoto.current) {
      Alert.alert("Photo is saving", "Please wait for saving to finish before closing.");
      return;
    }
    const finishOperation = pendingOperation.current;
    pendingOperation.current = null;
    if (pending) void removePhotoAssets(pending).catch(() =>
      Alert.alert("Photo cleanup incomplete", "Unused app copies will be removed the next time you open the app."),
    ).finally(() => finishOperation?.());
    else finishOperation?.();
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
  const save = async () => {
    if (!pending) return;
    if (checking.current === pending.id || savingPhoto.current) return;
    if (Object.values(pendingErrors).some(Boolean)) {
      setShowErrors(true);
      reviewForm.focusFirst(pendingErrors);
      feedback("error");
      return;
    }
    savingPhoto.current = true;
    setSaving(true);
    try {
      await update((records) => selectPhoto({
        ...records,
        photos: [pending, ...records.photos],
      }, pending.id));
      feedback("success");
      setPending(null);
      setSaved(true);
      setShowErrors(false);
    } catch {
      // The queued record may still be retried; don't delete its files as a cancelled import.
      setPending(null);
      Alert.alert("Photo selection not saved", "Photo files have been kept. Keep the app open and use the save retry banner before closing.");
    } finally {
      pendingOperation.current?.();
      pendingOperation.current = null;
      savingPhoto.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  const changePhoto = (photo: Photo, patch: Partial<Photo>) => {
    void update((records) => ({
      ...records,
      photos: records.photos.map((item) =>
        item.id === photo.id ? { ...item, ...patch } : item,
      ),
      draft: {
        ...records.draft,
        reviewed: records.draft.people.some((person) => person.selectedPhotoId === photo.id)
          ? false : records.draft.reviewed,
      },
    })).catch(() => Alert.alert("Photo changes not saved", "Keep the app open and use the save retry banner."));
  };
  const assign = (photo: Photo, label: string, isPending = false) => {
    const person = records.draft.people[options.indexOf(label)];
    if (!person) return;
    const patch = { personId: person.id, name: personName(person) };
    if (isPending) {
      setPersonId(person.id);
      setPending({ ...photo, ...patch });
    }
    else void update((records) => reassignPhoto(records, photo.id, person.id))
      .catch(() => Alert.alert("Photo assignment not saved", "Keep the app open and use the save retry banner."));
  };
  const usePhoto = (photo: Photo) => {
    if (!records.draft.people.some((person) => person.id === photo.personId)) {
      setShowSource(false);
      setEditingID(photo.id);
      Alert.alert("Choose a person first", "Assign this photo to someone in your current preparation, then tap Use this photo.");
      return;
    }
    void update((records) => selectPhoto(records, photo.id))
      .then(() => feedback("success"))
      .catch(() => Alert.alert("Photo selection not saved", "Keep the app open and use the save retry banner."));
  };
  const cleanupDeletedPhoto = (photo: Photo) => {
    const finishOperation = beginPhotoOperation();
    void removePhotoAssets(photo).catch(() => Alert.alert(
      "Photo cleanup incomplete",
      "The photo was removed from your library, but its app-owned files could not all be deleted.",
      [
        { text: "Later", style: "cancel" },
        { text: "Retry cleanup", onPress: () => cleanupDeletedPhoto(photo) },
      ],
    )).finally(finishOperation);
  };
  const remove = (photo: Photo) =>
    Alert.alert(
      "Delete this photo?",
      `This removes the saved copy and its source copy from this device. Your original in Photos stays unchanged.${isSelected(photo) ? " This is the selected photo; you will need to select another photo for this person." : ""}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const finishOperation = beginPhotoOperation();
            setDeletingID(photo.id);
            void update((records) => deletePhoto(records, photo.id)).then(() => {
              if (mounted.current) setEditingID(null);
              cleanupDeletedPhoto(photo);
            }).catch(() => Alert.alert(
              "Photo deletion not saved",
              "Photo files were kept. Keep the app open and use the save retry banner before closing.",
            )).finally(() => {
              finishOperation();
              if (mounted.current) setDeletingID(null);
            });
          },
        },
      ],
    );
  const share = async (photo: Photo) => {
    try {
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(photo.uri, {
          dialogTitle: "Export prepared photo",
        });
      else Alert.alert("Sharing unavailable");
    } catch {
      Alert.alert(
        "Could not share photo",
        "Try again after the image finishes saving.",
      );
    }
  };
  const peopleReady = records.draft.people.filter((person) =>
    personPhotoComplete(person, records.photos),
  ).length;
  return (
    <Screen>
      <PageHeading eyebrow="DV photo" title="A photo for each person">
        Choose one current photo for each person. Keep other photos in your library.
      </PageHeading>
      <Card style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.cameraIcon}>
            <Icon name="camera-outline" size={30} color={C.blue} />
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Title>Photo for {personName(selectedPerson)}</Title>
            <Body muted>Face forward. Plain background. Even light.</Body>
          </View>
        </View>
        {records.draft.people.length > 1 && (
          <Select
            label="Who is this photo for?"
            value={options[records.draft.people.findIndex((person) => person.id === selectedPerson.id)]}
            options={options}
            disabled={busy}
            onChange={(value) => setPersonId(records.draft.people[options.indexOf(value)].id)}
          />
        )}
        <Button
          title={busy ? activity : "Take a photo"}
          icon="camera-outline"
          busy={busy}
          disabled={checkingID !== null && !busy}
          onPress={() => void pick(true)}
        />
        <Button
          secondary
          title="Choose from Photos"
          icon="images-outline"
          disabled={busy || checkingID !== null}
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
          {peopleReady} of {records.draft.people.length} people have a selected photo
          with the required checks and confirmations.
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
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  {isSelected(photo) && <Icon name="checkmark-circle" size={18} color={C.green} />}
                  <Badge tone={isSelected(photo) ? "green" : "neutral"}>
                    {isSelected(photo) ? "Selected" : "Available"}
                  </Badge>
                </View>
                <Badge tone={checkingID === photo.id ? "neutral" : photoCheckSummary(photo.analysis).tone}>
                  {checkingID === photo.id ? "Checking photo…" : photoCheckSummary(photo.analysis).label}
                </Badge>
                <Text style={s.small}>
                  {photoCheckSummary(photo.analysis).passed} checks passed
                  {photoCheckSummary(photo.analysis).attention ? ` · ${photoCheckSummary(photo.analysis).attention} items to review` : ""}
                </Text>
                <Text style={s.small}>Taken {photo.takenOn}</Text>
                {(!photo.composition || !photo.notReused || !photo.notAltered) && (
                  <Text style={s.small}>Confirm your photo details in View results.</Text>
                )}
              </View>
            </View>
            <Text style={s.small}>
              {photo.analysis?.width && photo.analysis?.height ? `${photo.analysis.width} × ${photo.analysis.height} · ` : ""}
              {photo.analysis?.format ? `${photo.analysis.format} · ` : ""}
              {Math.ceil(photo.bytes / 1000)} kB · Saved on this device
            </Text>
            {!isSelected(photo) && (
              <Button
                secondary
                title="Use this photo"
                icon="checkmark-circle-outline"
                disabled={deletingID === photo.id || checkingID === photo.id}
                onPress={() => usePhoto(photo)}
              />
            )}
            <Button
              variant={isSelected(photo) ? "secondary" : "tertiary"}
              title="View results"
              icon="image-outline"
              onPress={() => { setShowSource(false); setEditingID(photo.id); }}
            />
            <Button
              variant="tertiary"
              danger
              title="Delete photo"
              icon="trash-outline"
              busy={deletingID === photo.id}
              onPress={() => remove(photo)}
            />
          </Card>
        ))
      )}
      <Text style={s.small}>
        Checks apply to the saved prepared image. Cropping, resizing and compression
        may correct an imported file's dimensions and size. No appearance enhancement
        is applied; the source copy from the picker is kept separately.
      </Text>
      <Sheet
        visible={!!pending}
        title="Review your photo"
        onClose={close}
        onDismiss={onReviewDismiss}
        form={reviewForm}
        footer={
          <Stack gap={8}>
            <Button
              title={checkingID === pending?.id ? "Checking photo…" : saving ? "Saving photo…" : "Use this photo"}
              icon="checkmark"
              busy={checkingID === pending?.id || saving}
              onPress={() => void save()}
            />
            <Button
              variant="tertiary"
              title={fromCamera ? "Retake" : "Choose another photo"}
              onPress={retake}
              disabled={saving || checkingID === pending?.id}
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
            <PhotoCheckResults
              report={pending.analysis}
              checking={checkingID === pending.id}
              checkDisabled={saving || (checkingID !== null && checkingID !== pending.id)}
              onCheck={() => void checkPhoto(pending, true)}
            />
            <FormSection title="Photo details">
              <Select
                label="This photo belongs to"
                value={assignedLabel(pending)}
                options={options}
                disabled={saving}
                onChange={(value) => assign(pending, value, true)}
              />
              <Field
                fieldId="takenOn"
                label="Original photo taken on"
                placeholder="YYYY-MM-DD"
                value={pending.takenOn}
                editable={!saving}
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
                disabled={saving}
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
                disabled={saving}
                onChange={(value) =>
                  setPending({ ...pending, composition: value })
                }
              />
              <Toggle
                title="Not used in a previous DV entry"
                value={pending.notReused}
                disabled={saving}
                onChange={(value) =>
                  setPending({ ...pending, notReused: value })
                }
              />
              <Toggle
                title="My appearance has not been digitally altered"
                detail="No beautification, facial reshaping or retouching. Ordinary cropping, resizing and compression are separate."
                value={pending.notAltered}
                disabled={saving}
                onChange={(value) => setPending({ ...pending, notAltered: value })}
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
          editing && (
            <Stack gap={8}>
              {isSelected(editing) ? (
                <Badge tone="green">✓ Current photo</Badge>
              ) : (
                <Button
                  title="Use this photo"
                  icon="checkmark"
                  disabled={checkingID === editing.id || deletingID === editing.id}
                  onPress={() => usePhoto(editing)}
                />
              )}
              <Button
                title="Done"
                secondary={!isSelected(editing)}
                onPress={() => setEditingID(null)}
              />
            </Stack>
          )
        }
      >
        {editing && (
          <Stack gap={24}>
            <Image
              source={{ uri: showSource && editing.sourceUri ? editing.sourceUri : editing.uri }}
              accessibilityLabel={`Photo for ${photoName(editing)}`}
              style={styles.preview}
            />
            {editing.sourceUri && (
              <Button
                variant="tertiary"
                title={showSource ? "View prepared photo" : "View source copy"}
                icon="images-outline"
                onPress={() => setShowSource((show) => !show)}
              />
            )}
            {showSource && (
              <Body muted>
                Source copy from the system picker, after any crop you chose there.
                Automated results below apply to the separate prepared image.
              </Body>
            )}
            <View style={{ gap: 8 }}>
              <Title>{photoName(editing)}</Title>
              <Badge tone={isSelected(editing) ? "green" : "neutral"}>
                {isSelected(editing) ? "✓ Current photo" : "Available"}
              </Badge>
              <Text style={s.small}>
                Taken {editing.takenOn} ·{" "}
                {Math.ceil(editing.bytes / 1000)} kB
              </Text>
            </View>
            <PhotoCheckResults
              report={editing.analysis}
              checking={checkingID === editing.id}
              checkDisabled={checkingID !== null && checkingID !== editing.id}
              onCheck={() => void checkPhoto(editing)}
            />
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
              <Toggle
                title="My appearance has not been digitally altered"
                value={editing.notAltered}
                onChange={(value) => changePhoto(editing, { notAltered: value })}
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
              title="Export prepared photo"
              icon="share-outline"
              onPress={() => void share(editing)}
            />
            <Button
              variant="tertiary"
              danger
              title="Delete photo"
              icon="trash-outline"
              onPress={() => remove(editing)}
              busy={deletingID === editing.id}
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
