import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import {
  Entry,
  EntryStatus,
  Records,
  entryError,
  id,
  official,
  statuses,
  today,
} from "./models";
import { entryFieldErrors, timelineFieldErrors } from "./entryValidation";
import {
  Badge,
  Body,
  Button,
  C,
  Card,
  Empty,
  Field,
  FormSection,
  Icon,
  Label,
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

type Props = {
  records: Records;
  update: (fn: (records: Records) => Records) => void;
  addRequest: number;
  consumeAddRequest: () => void;
  onPrepare?: () => void;
};
const blankEntry = () => ({
  name: "",
  surname: "",
  birthYear: "",
  year: "",
  confirmation: "",
  submitted: today(),
});
const latestEvent = (entry: Entry) =>
  [...entry.events].sort((a, b) => b.date.localeCompare(a.date))[0];
const statusTone = (status: EntryStatus | undefined) =>
  ["Selected", "Visa issued"].includes(status || "")
    ? ("green" as const)
    : ["Not selected", "Visa refused"].includes(status || "")
      ? ("warm" as const)
      : ("blue" as const);
const nextAction = (status: EntryStatus | undefined) => {
  if (status === "Entry submitted")
    return "Check official results, then record an update.";
  if (
    ["Selected", "DS-260 submitted", "Interview scheduled"].includes(
      status || "",
    )
  )
    return "Keep your timeline current using official updates.";
  return "View your saved confirmation and timeline.";
};
export function EntriesScreen({
  records,
  update,
  addRequest,
  consumeAddRequest,
  onPrepare,
}: Props) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(blankEntry);
  const [attested, setAttested] = useState(false);
  const [showEntryErrors, setShowEntryErrors] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [selectedID, setSelectedID] = useState<string | null>(null);
  const selected = records.entries.find((entry) => entry.id === selectedID);
  const [revealed, setRevealed] = useState(false);
  const [status, setStatus] = useState<EntryStatus>("Selected");
  const [eventDate, setEventDate] = useState(today());
  const [note, setNote] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [checked, setChecked] = useState(false);
  const [showTimelineErrors, setShowTimelineErrors] = useState(false);
  const [updateSaved, setUpdateSaved] = useState(false);
  const addForm = useFormNavigation();
  const timelineForm = useFormNavigation();
  const entryErrors = entryFieldErrors(form, records.entries, attested);
  const timelineErrors = timelineFieldErrors(
    eventDate,
    selected?.submitted || "",
    checked,
  );
  const errorFor = (key: keyof typeof entryErrors) =>
    showEntryErrors ? entryErrors[key] : undefined;
  const startAdd = () => {
    setForm(blankEntry());
    setAttested(false);
    setShowEntryErrors(false);
    setSaveError("");
    setAdding(true);
  };
  useEffect(() => {
    if (addRequest) {
      startAdd();
      consumeAddRequest();
    }
  }, [addRequest]);
  const set = (key: keyof ReturnType<typeof blankEntry>, value: string) => {
    setForm((form) => ({ ...form, [key]: value }));
    setSaveError("");
  };
  const save = () => {
    const normalized = {
      ...form,
      name: form.name.trim(),
      surname: form.surname.trim(),
      confirmation: form.confirmation.trim().toUpperCase(),
    };
    const error = entryError(normalized, records.entries);
    if (error || !attested) {
      setShowEntryErrors(true);
      addForm.focusFirst(entryErrors);
      if (!Object.values(entryErrors).some(Boolean))
        setSaveError(error || "Confirm the submitted entry below.");
      feedback("error");
      return;
    }
    const entry: Entry = {
      ...normalized,
      id: id(),
      caseNumber: "",
      events: [
        {
          id: id(),
          status: "Entry submitted",
          date: form.submitted,
          note: "Confirmation recorded by user. Not independently verified.",
        },
      ],
    };
    update((records) => ({ ...records, entries: [entry, ...records.entries] }));
    feedback("success");
    setAdding(false);
  };
  const open = (entry: Entry) => {
    setSelectedID(entry.id);
    setRevealed(false);
    setStatus("Selected");
    setEventDate(today());
    setNote("");
    setCaseNumber(entry.caseNumber);
    setChecked(false);
    setShowTimelineErrors(false);
    setUpdateSaved(false);
  };
  const addStatus = () => {
    if (!selected) return;
    if (Object.values(timelineErrors).some(Boolean)) {
      setShowTimelineErrors(true);
      timelineForm.focusFirst(timelineErrors);
      feedback("error");
      return;
    }
    update((records) => ({
      ...records,
      entries: records.entries.map((entry) =>
        entry.id === selected.id
          ? {
              ...entry,
              caseNumber: caseNumber.trim().toUpperCase(),
              events: [
                ...entry.events,
                {
                  id: id(),
                  status,
                  date: eventDate,
                  note: note.trim() || "Update recorded by user.",
                },
              ],
            }
          : entry,
      ),
    }));
    setChecked(false);
    setNote("");
    setShowTimelineErrors(false);
    setUpdateSaved(true);
    feedback("success");
  };
  const remove = () => {
    if (!selected) return;
    Alert.alert(
      "Delete this entry record?",
      "Keep your official confirmation page somewhere secure before deleting this local copy.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete record",
          style: "destructive",
          onPress: () => {
            update((records) => ({
              ...records,
              entries: records.entries.filter(
                (entry) => entry.id !== selected.id,
              ),
            }));
            setSelectedID(null);
          },
        },
      ],
    );
  };
  const filtered = records.entries.filter((entry) =>
    `${entry.name} ${entry.year} ${entry.caseNumber}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <Screen>
      <PageHeading eyebrow="Your DV history" title="Your entries">
        Your confirmations and updates, together year after year.
      </PageHeading>
      {!records.entries.length ? (
        <Card>
          <Empty icon="albums-outline" title="No entries yet">
            Start preparing your first DV entry. Scanning your passport can fill
            many of the details for you.
          </Empty>
          {onPrepare && (
            <Button
              title={
                records.draft.started
                  ? "Continue preparation"
                  : "Start preparing"
              }
              icon="arrow-forward"
              onPress={onPrepare}
            />
          )}
          <Button
            title="Add submitted entry"
            icon="add"
            secondary={!!onPrepare}
            onPress={startAdd}
            testID="add-entry"
          />
          <Text style={s.small}>
            Already submitted on the official portal? Keep your confirmation
            here.
          </Text>
        </Card>
      ) : (
        <>
          <Button
            title="Add submitted entry"
            icon="add"
            onPress={startAdd}
            testID="add-entry"
          />
          <Field
            label="Search entries"
            placeholder="Name, DV year or case number"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {!filtered.length ? (
            <Empty icon="search-outline" title="No matching entries">
              Try a name, program year or selected case number.
            </Empty>
          ) : (
            filtered.map((entry) => {
              const latest = latestEvent(entry);
              return (
                <Pressable
                  key={entry.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${entry.name}, DV ${entry.year}, ${latest?.status || "Saved entry"}. View entry details.`}
                  onPress={() => open(entry)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                >
                  <Card>
                    <View style={styles.cardTop}>
                      <Label>DV {entry.year}</Label>
                      <Badge tone={statusTone(latest?.status)}>
                        {latest?.status || "Saved entry"}
                      </Badge>
                    </View>
                    <Title>{entry.name}</Title>
                    <View style={{ gap: 5 }}>
                      <Text style={s.small}>
                        Last recorded update · {latest?.date || entry.submitted}
                      </Text>
                      <Text style={[s.small, { letterSpacing: 1 }]}>
                        {entry.confirmation.slice(0, 4)} •••• ••••{" "}
                        {entry.confirmation.slice(-4)}
                      </Text>
                    </View>
                    <View style={styles.nextAction}>
                      <Text style={[s.body, { flex: 1, color: C.blue }]}>
                        {nextAction(latest?.status)}
                      </Text>
                      <Icon name="chevron-forward" size={18} color={C.blue} />
                    </View>
                    <Text style={s.small}>Status recorded by you</Text>
                  </Card>
                </Pressable>
              );
            })
          )}
        </>
      )}
      <View style={{ gap: 10 }}>
        <Label>Official resources</Label>
        <LinkRow
          title="Check official DV results"
          detail="Entrant Status Check · Department of State"
          url={official.results}
        />
        <LinkRow
          title="Visa bulletin"
          detail="Regional cutoffs for selected entrants"
          url={official.bulletin}
        />
        <Text style={s.small}>
          Results are checked on the official website. This app keeps the
          updates you record; it does not fetch government status. Selection
          does not guarantee a visa.
        </Text>
      </View>
      <Sheet
        visible={adding}
        title="Add submitted entry"
        onClose={() => setAdding(false)}
        form={addForm}
        footer={
          <Button title="Save entry" icon="bookmark-outline" onPress={save} />
        }
      >
        <Body muted>
          Copy the details from your official confirmation page. Saving here
          keeps a record on this device.
        </Body>
        <FormSection title="Applicant">
          <Field
            fieldId="name"
            label="Applicant full name"
            value={form.name}
            onChangeText={(value) => set("name", value)}
            textContentType="name"
            autoCapitalize="words"
            error={errorFor("name")}
          />
          <Field
            fieldId="surname"
            label="Last / family name for status check"
            value={form.surname}
            onChangeText={(value) => set("surname", value)}
            textContentType="familyName"
            autoCapitalize="words"
            error={errorFor("surname")}
          />
          <Field
            fieldId="birthYear"
            label="Birth year"
            value={form.birthYear}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="YYYY"
            textContentType="birthdateYear"
            onChangeText={(value) => set("birthYear", value)}
            error={errorFor("birthYear")}
          />
        </FormSection>
        <FormSection
          title="Official confirmation"
          description="The program year can differ from the calendar year you entered."
        >
          <Field
            fieldId="year"
            label="DV program year"
            value={form.year}
            keyboardType="number-pad"
            maxLength={4}
            textContentType="none"
            placeholder="Year shown on your confirmation"
            onChangeText={(value) => set("year", value)}
            error={errorFor("year")}
          />
          <Field
            fieldId="confirmation"
            label="Confirmation number"
            value={form.confirmation}
            autoCapitalize="characters"
            maxLength={16}
            textContentType="none"
            onChangeText={(value) =>
              set("confirmation", value.replace(/\s/g, "").toUpperCase())
            }
            help="16 letters and numbers, beginning with your DV program year."
            error={errorFor("confirmation")}
          />
          <Field
            fieldId="submitted"
            label="Submitted on"
            value={form.submitted}
            keyboardType="numbers-and-punctuation"
            placeholder="YYYY-MM-DD"
            textContentType="none"
            onChangeText={(value) => set("submitted", value)}
            error={errorFor("submitted")}
          />
          <Toggle
            fieldId="attested"
            title="This entry was submitted on the official portal"
            value={attested}
            onChange={setAttested}
            error={errorFor("attested")}
          />
        </FormSection>
        {!!saveError && (
          <Notice title="Check entry details">{saveError}</Notice>
        )}
      </Sheet>
      <Sheet
        visible={!!selected}
        title={
          selected ? `DV ${selected.year} · Entry details` : "Entry details"
        }
        onClose={() => setSelectedID(null)}
        form={timelineForm}
      >
        {selected && (
          <Stack gap={24}>
            <Card>
              <Badge tone={statusTone(latestEvent(selected)?.status)}>
                {latestEvent(selected)?.status || "Saved entry"}
              </Badge>
              <Title>{selected.name}</Title>
              <Text style={s.small}>Local record · Status recorded by you</Text>
              <Label>Confirmation number</Label>
              <Text selectable style={styles.confirmation}>
                {revealed
                  ? selected.confirmation
                  : `${selected.confirmation.slice(0, 4)} •••• •••• ${selected.confirmation.slice(-4)}`}
              </Text>
              <Button
                secondary
                title={revealed ? "Hide confirmation" : "Reveal confirmation"}
                icon={revealed ? "eye-off-outline" : "eye-outline"}
                onPress={() => setRevealed((value) => !value)}
              />
              <Body muted>
                Last / family name: {selected.surname}
                {"\n"}Birth year: {selected.birthYear}
                {"\n"}Submitted: {selected.submitted}
              </Body>
              <LinkRow
                title="Open official status check"
                url={official.results}
              />
            </Card>
            <FormSection title="Your timeline">
              {[...selected.events]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((event) => (
                  <View key={event.id} style={styles.timelineRow}>
                    <View style={styles.timelineDot}>
                      <Icon name="checkmark" size={16} color={C.blue} />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={s.fieldLabel}>{event.status}</Text>
                      <Text style={s.small}>{event.date} · User-entered</Text>
                      <Body muted>{event.note}</Body>
                    </View>
                  </View>
                ))}
            </FormSection>
            <Card>
              <FormSection
                title="Record an update"
                description="Check an official source, then add what you learned to your timeline."
              >
                <Select
                  label="Status"
                  value={status}
                  options={[...statuses]}
                  onChange={(value) => {
                    setStatus(value as EntryStatus);
                    setUpdateSaved(false);
                  }}
                />
                <Field
                  fieldId="eventDate"
                  label="Event date"
                  value={eventDate}
                  keyboardType="numbers-and-punctuation"
                  placeholder="YYYY-MM-DD"
                  textContentType="none"
                  onChangeText={(value) => {
                    setEventDate(value);
                    setUpdateSaved(false);
                  }}
                  error={
                    showTimelineErrors ? timelineErrors.eventDate : undefined
                  }
                />
                <Field
                  fieldId="caseNumber"
                  label="Selected case number (optional)"
                  value={caseNumber}
                  autoCapitalize="characters"
                  textContentType="none"
                  onChangeText={(value) => {
                    setCaseNumber(value);
                    setUpdateSaved(false);
                  }}
                  help="Different from your entry confirmation number."
                />
                <Field
                  fieldId="note"
                  label="Notes (optional)"
                  value={note}
                  multiline
                  onChangeText={(value) => {
                    setNote(value);
                    setUpdateSaved(false);
                  }}
                />
                <Toggle
                  fieldId="checked"
                  title="This is my own recorded update"
                  detail="The app has not independently verified this status."
                  value={checked}
                  onChange={(value) => {
                    setChecked(value);
                    setUpdateSaved(false);
                  }}
                  error={
                    showTimelineErrors ? timelineErrors.checked : undefined
                  }
                />
                <Button
                  title="Save timeline update"
                  icon="add"
                  onPress={addStatus}
                />
                {updateSaved && (
                  <View accessibilityRole="alert" style={styles.saved}>
                    <Icon name="checkmark-circle" color={C.green} />
                    <Text style={[s.fieldLabel, { color: C.green, flex: 1 }]}>
                      Update saved to your timeline
                    </Text>
                  </View>
                )}
              </FormSection>
            </Card>
            <Button
              danger
              title="Delete entry record"
              icon="trash-outline"
              onPress={remove}
            />
          </Stack>
        )}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTop: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  nextAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  confirmation: {
    fontSize: 19,
    fontWeight: "600",
    letterSpacing: 1,
    color: C.navy,
  },
  timelineRow: { flexDirection: "row", gap: 14, paddingBottom: 12 },
  timelineDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  saved: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: C.successBg,
  },
});
