import React, { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import {
  Entry,
  EntryStatus,
  Records,
  entryError,
  id,
  official,
  statuses,
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
  Icon,
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

type Props = {
  records: Records;
  update: (fn: (r: Records) => Records) => void;
  addRequest: number;
  consumeAddRequest: () => void;
};
const blankEntry = () => ({
  name: "",
  surname: "",
  birthYear: "",
  year: "",
  confirmation: "",
  submitted: today(),
});
export function EntriesScreen({
  records,
  update,
  addRequest,
  consumeAddRequest,
}: Props) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(blankEntry);
  const [attested, setAttested] = useState(false);
  const [selectedID, setSelectedID] = useState<string | null>(null);
  const selected = records.entries.find((e) => e.id === selectedID);
  const [revealed, setRevealed] = useState(false);
  const [status, setStatus] = useState<EntryStatus>("Selected");
  const [eventDate, setEventDate] = useState(today());
  const [note, setNote] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [checked, setChecked] = useState(false);
  const startAdd = () => {
    setForm(blankEntry());
    setAttested(false);
    setAdding(true);
  };
  useEffect(() => {
    if (addRequest) {
      startAdd();
      consumeAddRequest();
    }
  }, [addRequest]);
  const set = (key: keyof ReturnType<typeof blankEntry>, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  const save = () => {
    const normalized = {
      ...form,
      name: form.name.trim(),
      surname: form.surname.trim(),
      confirmation: form.confirmation.trim().toUpperCase(),
    };
    const error = entryError(normalized, records.entries);
    if (error || !attested) {
      Alert.alert(
        "Check entry details",
        error ||
          "Confirm that you are recording an entry already submitted on the official portal.",
      );
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
    update((r) => ({ ...r, entries: [entry, ...r.entries] }));
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
  };
  const addStatus = () => {
    if (!selected) return;
    if (
      !checked ||
      !validPastDate(eventDate) ||
      eventDate < selected.submitted
    ) {
      Alert.alert(
        "Review this update",
        "Use a valid date on or after submission, not in the future, and confirm that this is your own recorded update.",
      );
      return;
    }
    update((r) => ({
      ...r,
      entries: r.entries.map((e) =>
        e.id === selected.id
          ? {
              ...e,
              caseNumber: caseNumber.trim().toUpperCase(),
              events: [
                ...e.events,
                {
                  id: id(),
                  status,
                  date: eventDate,
                  note: note.trim() || "Update recorded by user.",
                },
              ],
            }
          : e,
      ),
    }));
    setChecked(false);
    setNote("");
    Alert.alert(
      "Update saved",
      "Your timeline now includes this user-entered event.",
    );
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
            update((r) => ({
              ...r,
              entries: r.entries.filter((e) => e.id !== selected.id),
            }));
            setSelectedID(null);
          },
        },
      ],
    );
  };
  const filtered = records.entries.filter((e) =>
    `${e.name} ${e.year} ${e.caseNumber}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Label>Your application history</Label>
        <Text style={{ fontSize: 30, fontWeight: "700", color: C.navy }}>
          Every entry, in one place
        </Text>
        <Body muted>
          Keep your confirmation and follow your DV journey year by year.
        </Body>
      </View>
      <Button
        title="Add submitted entry"
        icon="add"
        onPress={startAdd}
        testID="add-entry"
      />
      {!!records.entries.length && (
        <Field
          label="Search entries"
          placeholder="Name, DV year or case number"
          value={query}
          onChangeText={setQuery}
        />
      )}
      {!records.entries.length ? (
        <Card>
          <Empty icon="albums-outline" title="Your journey starts here">
            Already entered the lottery? Save your official confirmation so it
            is easy to find when results are available.
          </Empty>
        </Card>
      ) : !filtered.length ? (
        <Body muted>No entries match your search.</Body>
      ) : (
        filtered.map((e) => {
          const latest = [...e.events].sort((a, b) =>
            b.date.localeCompare(a.date),
          )[0];
          return (
            <Pressable
              key={e.id}
              accessibilityRole="button"
              accessibilityLabel={`${e.name}, DV ${e.year}, ${latest.status}`}
              onPress={() => open(e)}
            >
              <Card
                style={{
                  borderLeftWidth: 5,
                  borderLeftColor: ["Selected", "Visa issued"].includes(
                    latest.status,
                  )
                    ? C.green
                    : C.blue,
                }}
              >
                <Row>
                  <Badge>DV {e.year}</Badge>
                  <Icon name="chevron-forward" size={18} color={C.muted} />
                </Row>
                <Title>{e.name}</Title>
                <Text style={s.body}>{latest.status}</Text>
                <Row>
                  <Text style={s.small}>{latest.date}</Text>
                  <Text style={s.small}>User-entered</Text>
                </Row>
                <Text style={[s.small, { letterSpacing: 2 }]}>
                  {e.confirmation.slice(0, 4)} •••• ••••{" "}
                  {e.confirmation.slice(-4)}
                </Text>
              </Card>
            </Pressable>
          );
        })
      )}
      <Notice title="Official results live on Entrant Status Check">
        This app does not fetch government status. Use the official website to
        check results, then record an update here. Selection does not guarantee
        a visa.
      </Notice>
      <Card>
        <LinkRow
          title="Check official DV results"
          detail="dvprogram.state.gov · Entrant Status Check"
          url={official.results}
        />
        <LinkRow
          title="Visa bulletin"
          detail="For selected entrants following regional cutoffs"
          url={official.bulletin}
        />
      </Card>
      <Sheet
        visible={adding}
        title="Add submitted entry"
        onClose={() => setAdding(false)}
      >
        <Notice title="Use your official confirmation page">
          Saving a record here does not submit a DV entry. Use the program year
          on your confirmation, which differs from the year you entered.
        </Notice>
        <Field
          label="Applicant full name"
          value={form.name}
          onChangeText={(v) => set("name", v)}
        />
        <Field
          label="Last / family name for status check"
          value={form.surname}
          onChangeText={(v) => set("surname", v)}
        />
        <Field
          label="Birth year"
          value={form.birthYear}
          keyboardType="number-pad"
          maxLength={4}
          placeholder="YYYY"
          onChangeText={(v) => set("birthYear", v)}
        />
        <Field
          label="DV program year"
          value={form.year}
          keyboardType="number-pad"
          maxLength={4}
          placeholder="Year shown on your confirmation"
          onChangeText={(v) => set("year", v)}
        />
        <Field
          label="Confirmation number"
          value={form.confirmation}
          autoCapitalize="characters"
          maxLength={16}
          onChangeText={(v) =>
            set("confirmation", v.replace(/\s/g, "").toUpperCase())
          }
          help="16 letters and numbers, beginning with your DV program year."
        />
        <Field
          label="Submitted on"
          value={form.submitted}
          keyboardType="numbers-and-punctuation"
          placeholder="YYYY-MM-DD"
          onChangeText={(v) => set("submitted", v)}
        />
        <Toggle
          title="This entry was submitted on the official portal"
          value={attested}
          onChange={setAttested}
        />
        <Button title="Save entry" icon="bookmark-outline" onPress={save} />
      </Sheet>
      <Sheet
        visible={!!selected}
        title={
          selected ? `DV ${selected.year} · Entry details` : "Entry details"
        }
        onClose={() => setSelectedID(null)}
      >
        {selected && (
          <Stack>
            <Card>
              <Title>{selected.name}</Title>
              <Badge>Local record · User-entered</Badge>
              <Label>Confirmation number</Label>
              <Text
                selectable
                style={{
                  fontSize: 19,
                  fontWeight: "600",
                  letterSpacing: 1,
                  color: C.navy,
                }}
              >
                {revealed
                  ? selected.confirmation
                  : `${selected.confirmation.slice(0, 4)} •••• •••• ${selected.confirmation.slice(-4)}`}
              </Text>
              <Button
                secondary
                title={revealed ? "Hide confirmation" : "Reveal confirmation"}
                icon={revealed ? "eye-off-outline" : "eye-outline"}
                onPress={() => setRevealed((v) => !v)}
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
            <Card>
              <Title>Your timeline</Title>
              {[...selected.events]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((event) => (
                  <View
                    key={event.id}
                    style={{ flexDirection: "row", gap: 14 }}
                  >
                    <Icon name="checkmark-circle-outline" color={C.blue} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={s.fieldLabel}>{event.status}</Text>
                      <Text style={s.small}>{event.date} · User-entered</Text>
                      <Body muted>{event.note}</Body>
                    </View>
                  </View>
                ))}
            </Card>
            <Card>
              <Title>Record an update</Title>
              <Body muted>
                After checking an official source, add the result to your
                personal timeline.
              </Body>
              <Select
                label="Status"
                value={status}
                options={[...statuses]}
                onChange={(v) => setStatus(v as EntryStatus)}
              />
              <Field
                label="Event date"
                value={eventDate}
                keyboardType="numbers-and-punctuation"
                onChangeText={setEventDate}
                placeholder="YYYY-MM-DD"
              />
              <Field
                label="Selected case number (optional)"
                value={caseNumber}
                autoCapitalize="characters"
                onChangeText={setCaseNumber}
                help="A selected case number is different from your entry confirmation."
              />
              <Field
                label="Notes (optional)"
                value={note}
                multiline
                onChangeText={setNote}
              />
              <Toggle
                title="This is my own recorded update"
                detail="The app has not independently verified this status."
                value={checked}
                onChange={setChecked}
              />
              <Button
                title="Save timeline update"
                icon="add"
                onPress={addStatus}
              />
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
