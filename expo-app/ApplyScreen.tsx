import React, { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import countries from "./countries.json";
import {
  Draft,
  Person,
  Records,
  draftIssues,
  makePerson,
  needsSpouse,
  official,
  personName,
  photoReviewed,
  steps,
} from "./models";
import {
  Badge,
  Body,
  Button,
  C,
  Card,
  Field,
  Icon,
  Label,
  LinkRow,
  Notice,
  Row,
  Screen,
  Select,
  Stack,
  Title,
  Toggle,
  openOfficial,
  s,
} from "./ui";

type Props = {
  records: Records;
  update: (fn: (r: Records) => Records) => void;
  photos: () => void;
  addEntry: () => void;
};
const maritalOptions = [
  "Unmarried",
  "Married — spouse is not a U.S. citizen / LPR",
  "Married — spouse is a U.S. citizen / LPR",
  "Divorced",
  "Widowed",
  "Legally separated",
];
const educationOptions = [
  "Primary school only",
  "High school, no degree",
  "High school degree",
  "Vocational school",
  "Some university courses",
  "University degree",
  "Some graduate-level courses",
  "Master’s degree",
  "Some doctorate-level courses",
  "Doctorate degree",
];

function PersonFields({
  person,
  change,
}: {
  person: Person;
  change: (p: Person) => void;
}) {
  const set = (key: keyof Person, value: string | boolean) =>
    change({ ...person, [key]: value });
  return (
    <Stack>
      <Field
        label="First / given name"
        value={person.first}
        editable={!person.noFirst}
        onChangeText={(v) => set("first", v)}
      />
      <Toggle
        title="No first / given name"
        value={person.noFirst}
        onChange={(v) =>
          change({ ...person, noFirst: v, first: v ? "" : person.first })
        }
      />
      <Field
        label="Middle name (optional)"
        value={person.middle}
        onChangeText={(v) => set("middle", v)}
      />
      <Field
        label="Last / family name"
        value={person.last}
        editable={!person.noLast}
        onChangeText={(v) => set("last", v)}
      />
      <Toggle
        title="No last / family name"
        value={person.noLast}
        onChange={(v) =>
          change({ ...person, noLast: v, last: v ? "" : person.last })
        }
      />
      <Field
        label="Date of birth"
        placeholder="YYYY-MM-DD"
        value={person.dob}
        onChangeText={(v) => set("dob", v)}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
      />
      <Select
        label="Sex (official form)"
        value={person.sex}
        options={["Male", "Female"]}
        onChange={(v) => set("sex", v)}
      />
      <Field
        label="City of birth"
        value={person.city}
        onChangeText={(v) => set("city", v)}
      />
      <Select
        label="Country of birth"
        value={person.country}
        options={countries}
        onChange={(v) => set("country", v)}
        searchable
      />
    </Stack>
  );
}

export function ApplyScreen({ records, update, photos, addEntry }: Props) {
  const d = records.draft;
  const [showErrors, setShowErrors] = useState(false);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    update((r) => ({
      ...r,
      draft: {
        ...r.draft,
        [key]: value,
        started: true,
        ...(key !== "reviewed" ? { reviewed: false } : {}),
      },
    }));
  const changePerson = (p: Person) =>
    set(
      "people",
      d.people.map((x) => (x.id === p.id ? p : x)),
    );
  const issues = draftIssues(d, records.photos, d.step);
  const allIssues = steps.flatMap((_, i) => draftIssues(d, records.photos, i));
  const go = (step: number) => {
    setShowErrors(false);
    set("step", step);
  };
  const remove = (p: Person) =>
    Alert.alert(
      `Remove ${personName(p)}?`,
      "Photos stay in your library. Make sure everyone required by the official instructions is included.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () =>
            set(
              "people",
              d.people.filter((x) => x.id !== p.id),
            ),
        },
      ],
    );
  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Label>Your next chapter</Label>
        <Text style={{ fontSize: 30, fontWeight: "700", color: C.navy }}>
          Prepare your entry
        </Text>
        <Body muted>One step at a time. Your draft saves on this device.</Body>
      </View>
      <Notice title="Registration dates are unconfirmed">
        October 7 is an estimate, not an announced opening date. Check the
        official announcement before submitting.
      </Notice>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
        {steps.map((step, i) => (
          <Pressable
            key={step}
            accessibilityRole="button"
            accessibilityLabel={`Step ${i + 1}: ${step}`}
            onPress={() => go(i)}
            style={{
              borderRadius: 10,
              paddingVertical: 9,
              paddingHorizontal: 11,
              backgroundColor: d.step === i ? C.navy : "#E7EDF5",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: d.step === i ? C.white : C.blue,
              }}
            >
              {i + 1} {step}
            </Text>
          </Pressable>
        ))}
      </View>
      <Card>
        <Row>
          <Title>{steps[d.step]}</Title>
          <Badge>{d.step + 1} of 6</Badge>
        </Row>
        {d.step === 0 && (
          <Stack>
            <Body>
              Start with the current official instructions. A country choice
              alone does not establish eligibility.
            </Body>
            <Select
              label="Country of eligibility / chargeability"
              value={d.eligibilityCountry}
              options={countries}
              onChange={(v) => set("eligibilityCountry", v)}
              searchable
            />
            <Select
              label="Eligibility basis"
              value={d.eligibilityBasis}
              options={[
                "Country of birth",
                "Spouse’s country of birth — review exception",
                "Parent’s country of birth — review exception",
              ]}
              onChange={(v) => set("eligibilityBasis", v)}
            />
            <Select
              label="Education or work experience basis"
              value={d.qualification}
              options={[
                "High school education or equivalent",
                "Qualifying work experience — verify occupation",
                "I need to review the requirements",
              ]}
              onChange={(v) => set("qualification", v)}
            />
            <LinkRow
              title="Read official DV instructions"
              detail="Eligible countries and qualifying education / work"
              url={official.instructions}
            />
            <Toggle
              title="I reviewed the official eligibility rules"
              detail="This app does not decide whether you qualify."
              value={d.eligibilityReviewed}
              onChange={(v) => set("eligibilityReviewed", v)}
            />
          </Stack>
        )}
        {d.step === 1 && (
          <Stack>
            <Body>
              Use your legal details as required by the current entry
              instructions.
            </Body>
            <PersonFields person={d.people[0]} change={changePerson} />
            <Select
              label="Highest level of education"
              value={d.education}
              options={educationOptions}
              onChange={(v) => set("education", v)}
            />
            <View style={{ height: 1, backgroundColor: C.line }} />
            <Title>Passport readiness</Title>
            <Body muted>
              The 2026 rule adds passport details and required page scans, with
              limited exemptions. Enter and upload these directly on the
              official portal.
            </Body>
            <Select
              label="Passport preparation"
              value={d.passportPlan}
              options={[
                "Passport and required page scans are ready",
                "I need to prepare my passport / page scans",
                "I need to review a possible exemption",
              ]}
              onChange={(v) => set("passportPlan", v)}
            />
            <LinkRow
              title="Read the passport rule"
              detail="Official Federal Register publication"
              url={official.passport}
            />
            <Toggle
              title="I reviewed passport and scan requirements"
              detail="Passport numbers and scans are not stored in this app."
              value={d.passportReviewed}
              onChange={(v) => set("passportReviewed", v)}
            />
          </Stack>
        )}
        {d.step === 2 && (
          <Stack>
            <Field
              label="Email address"
              value={d.email}
              onChangeText={(v) => set("email", v)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Field
              label="Phone number (optional)"
              value={d.phone}
              onChangeText={(v) => set("phone", v)}
              keyboardType="phone-pad"
            />
            <Field
              label="In care of (optional)"
              value={d.careOf}
              onChangeText={(v) => set("careOf", v)}
            />
            <Field
              label="Address line 1"
              value={d.address}
              onChangeText={(v) => set("address", v)}
            />
            <Field
              label="Address line 2 (optional)"
              value={d.address2}
              onChangeText={(v) => set("address2", v)}
            />
            <Field
              label="City / town"
              value={d.city}
              onChangeText={(v) => set("city", v)}
            />
            <Field
              label="District / county / province / state"
              value={d.province}
              onChangeText={(v) => set("province", v)}
            />
            <Field
              label="Postal code"
              value={d.postal}
              editable={!d.noPostal}
              onChangeText={(v) => set("postal", v)}
            />
            <Toggle
              title="No postal code"
              value={d.noPostal}
              onChange={(v) => set("noPostal", v)}
            />
            <Select
              label="Mailing country"
              value={d.country}
              options={countries}
              onChange={(v) => set("country", v)}
              searchable
            />
            <Select
              label="Country where you live today"
              value={d.residence}
              options={countries}
              onChange={(v) => set("residence", v)}
              searchable
            />
          </Stack>
        )}
        {d.step === 3 && (
          <Stack>
            <Select
              label="Current marital status"
              value={d.marital}
              options={maritalOptions}
              onChange={(v) => set("marital", v)}
            />
            <Notice title="Include every required family member">
              Review the rules for your spouse and all eligible unmarried
              children under 21, including stepchildren and adopted children,
              even if they will not travel with you. Exceptions apply.
            </Notice>
            <LinkRow
              title="Who must be included?"
              url={official.instructions}
            />
            {d.people.slice(1).map((p) => (
              <View
                key={p.id}
                style={{
                  borderTopWidth: 1,
                  borderColor: C.line,
                  paddingTop: 18,
                  gap: 16,
                }}
              >
                <Row>
                  <Badge>{p.relationship}</Badge>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${personName(p)}`}
                    onPress={() => remove(p)}
                    hitSlop={10}
                  >
                    <Icon name="trash-outline" color={C.red} />
                  </Pressable>
                </Row>
                <PersonFields person={p} change={changePerson} />
              </View>
            ))}
            {needsSpouse(d) &&
              !d.people.some((p) => p.relationship === "Spouse") && (
                <Button
                  secondary
                  title="Add spouse"
                  icon="person-add-outline"
                  onPress={() =>
                    set("people", [...d.people, makePerson("Spouse")])
                  }
                />
              )}
            <Button
              secondary
              title="Add child"
              icon="person-add-outline"
              onPress={() => set("people", [...d.people, makePerson("Child")])}
            />
            <Toggle
              title="I reviewed who must be included"
              value={d.familyReviewed}
              onChange={(v) => set("familyReviewed", v)}
            />
          </Stack>
        )}
        {d.step === 4 && (
          <Stack>
            <Body>
              Each included person needs their own recent photo. File checks
              help you prepare; only the official process determines acceptance.
            </Body>
            {d.people.map((p) => {
              const ready = records.photos.some(
                (photo) => photo.personId === p.id && photoReviewed(photo),
              );
              return (
                <View
                  key={p.id}
                  style={[
                    s.row,
                    {
                      gap: 12,
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderColor: C.line,
                    },
                  ]}
                >
                  <Icon
                    name={ready ? "checkmark-circle" : "person-circle-outline"}
                    color={ready ? C.green : C.muted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={s.fieldLabel}>{personName(p)}</Text>
                    <Text style={s.small}>{p.relationship}</Text>
                  </View>
                  <Badge tone={ready ? "green" : "warm"}>
                    {ready ? "Reviewed" : "Photo needed"}
                  </Badge>
                </View>
              );
            })}
            <Button
              title="Open photo library"
              icon="camera-outline"
              onPress={photos}
            />
            <LinkRow title="Official photo examples" url={official.photos} />
          </Stack>
        )}
        {d.step === 5 && (
          <Stack>
            <Body>
              Check your details before opening the official entry form. This
              draft is a preparation checklist and is not transmitted to the
              government.
            </Body>
            {steps.slice(0, 5).map((step, i) => {
              const errors = draftIssues(d, records.photos, i);
              return (
                <Pressable
                  key={step}
                  accessibilityRole="button"
                  onPress={() => go(i)}
                  style={[s.row, { paddingVertical: 10, gap: 10 }]}
                >
                  <Icon
                    name={
                      errors.length ? "ellipse-outline" : "checkmark-circle"
                    }
                    color={errors.length ? C.muted : C.green}
                  />
                  <Text style={[s.fieldLabel, { flex: 1 }]}>{step}</Text>
                  <Text style={s.small}>
                    {errors.length ? `${errors.length} to review` : "Reviewed"}
                  </Text>
                  <Icon name="chevron-forward" size={16} />
                </Pressable>
              );
            })}
            <Body muted>
              Applicant: {personName(d.people[0])}
              {"\n"}Program year: use the year shown on the official form.{"\n"}
              Family members: {d.people.length - 1}
              {"\n"}Email: {d.email || "Not entered"}
            </Body>
            <Toggle
              title="I reviewed my preparation details"
              detail="I will confirm the current rules and every field on the official form."
              value={d.reviewed}
              onChange={(v) => set("reviewed", v)}
            />
            <Notice title="Submit on the official website">
              You must complete the government form, verification and any
              required payment yourself. The app does not file entries or
              certify readiness.
            </Notice>
            <Button
              title="Open official DV portal"
              icon="open-outline"
              onPress={() => void openOfficial(official.portal)}
            />
            <Button
              secondary
              title="Save an existing confirmation"
              icon="bookmark-outline"
              onPress={addEntry}
            />
            <Text style={s.small}>
              {allIssues.length
                ? "Some preparation items still need review."
                : "Your local checklist is reviewed. Confirm every requirement on the official form."}
            </Text>
          </Stack>
        )}
        {showErrors && issues.length > 0 && (
          <Notice title="A few things to complete">{issues.join("\n")}</Notice>
        )}
        <View style={{ flexDirection: "row", gap: 12 }}>
          {d.step > 0 && (
            <View style={{ flex: 1 }}>
              <Button secondary title="Back" onPress={() => go(d.step - 1)} />
            </View>
          )}
          {d.step < 5 && (
            <View style={{ flex: 2 }}>
              <Button
                testID="apply-continue"
                title="Continue"
                icon="arrow-forward"
                onPress={() => {
                  if (issues.length) setShowErrors(true);
                  else go(d.step + 1);
                }}
              />
            </View>
          )}
        </View>
      </Card>
      <Text style={[s.small, { textAlign: "center" }]}>
        Independent preparation tool · Not affiliated with the U.S. government
      </Text>
    </Screen>
  );
}
