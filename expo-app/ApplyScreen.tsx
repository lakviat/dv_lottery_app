import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { PassportCapture } from "./PassportCapture";
import { applyPassport, passportFieldCount } from "./passport";
import { normalizeCountry } from "./countryNormalization";
import countries from "./countries.json";
import {
  Draft,
  Person,
  Records,
  draftIssues,
  detailsIssues,
  displayBirthDate,
  normalizeBirthDate,
  makePerson,
  official,
  personName,
  photoReviewed,
  steps,
} from "./models";
import {
  detailsFieldErrors,
  familyAddOptions,
  personFieldID,
  photoFieldErrors,
  reviewFieldErrors,
} from "./preparation";
import {
  Badge,
  Body,
  Button,
  C,
  Card,
  Field,
  FormAnchor,
  FormSection,
  Icon,
  LinkRow,
  Notice,
  PageHeading,
  ProgressSteps,
  Row,
  Screen,
  Select,
  Stack,
  Title,
  Toggle,
  feedback,
  openOfficial,
  s,
  useFormNavigation,
} from "./ui";

type Props = {
  records: Records;
  update: (fn: (r: Records) => Records) => void;
  photos: () => void;
  addEntry: () => void;
  scanRequest?: number;
};
const sections = ["personal", "contact", "family"] as const;
const sectionLabels = ["Personal", "Contact", "Family"];
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
  errors,
}: {
  person: Person;
  change: (p: Person) => void;
  errors: Record<string, string>;
}) {
  const set = (key: keyof Person, value: string | boolean) =>
    change({ ...person, [key]: value });
  const field = (key: string) => ({
    fieldId: personFieldID(person.id, key),
    error: errors[personFieldID(person.id, key)],
  });
  const noNames = person.noFirst && person.noLast;
  return (
    <Stack gap={28}>
      <FormSection title="Personal information">
        <Field
          {...field("first")}
          fieldId={
            noNames
              ? `${personFieldID(person.id, "first")}-disabled`
              : personFieldID(person.id, "first")
          }
          error={noNames ? undefined : field("first").error}
          label="First / given name"
          value={person.first}
          editable={!person.noFirst}
          textContentType="givenName"
          autoCapitalize="words"
          onChangeText={(v) => set("first", v)}
        />
        <Toggle
          fieldId={noNames ? personFieldID(person.id, "first") : undefined}
          error={noNames ? field("first").error : undefined}
          title="No first / given name"
          value={person.noFirst}
          onChange={(v) =>
            change({ ...person, noFirst: v, first: v ? "" : person.first })
          }
        />
        <Field
          {...field("middle")}
          label="Middle name (optional)"
          value={person.middle}
          textContentType="middleName"
          autoCapitalize="words"
          onChangeText={(v) => set("middle", v)}
        />
        <Field
          {...field("last")}
          label="Last / family name"
          value={person.last}
          editable={!person.noLast}
          textContentType="familyName"
          autoCapitalize="words"
          onChangeText={(v) => set("last", v)}
        />
        <Toggle
          title="No last / family name"
          value={person.noLast}
          onChange={(v) =>
            change({ ...person, noLast: v, last: v ? "" : person.last })
          }
        />
      </FormSection>
      <FormSection
        title="Birth information"
        description="Use your place of birth, which may differ from your nationality."
      >
        <Field
          {...field("dob")}
          label="Date of birth"
          placeholder="MM/DD/YYYY"
          help="Month / day / year"
          value={displayBirthDate(person.dob)}
          onChangeText={(v) => set("dob", v)}
          onBlur={() => set("dob", normalizeBirthDate(person.dob))}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
        <Select
          {...field("sex")}
          label="Sex (official form)"
          value={person.sex}
          options={["Male", "Female"]}
          onChange={(v) => set("sex", v)}
        />
        <Field
          {...field("city")}
          label="City of birth"
          value={person.city}
          autoCapitalize="words"
          onChangeText={(v) => set("city", v)}
        />
        <Select
          {...field("country")}
          label="Country of birth"
          value={person.country}
          options={countries}
          onChange={(v) => set("country", v)}
          searchable
        />
      </FormSection>
    </Stack>
  );
}

export function ApplyScreen({
  records,
  update,
  photos,
  addEntry,
  scanRequest = 0,
}: Props) {
  const d = records.draft;
  const scroll = useRef<ScrollView>(null);
  const form = useFormNavigation();
  const [showErrors, setShowErrors] = useState(false);
  const [showPassport, setShowPassport] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const pendingFocus = useRef(false);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    update((r) => ({
      ...r,
      draft: {
        ...r.draft,
        [key]: value,
        started: true,
        ...(!["reviewed", "step", "detailsSection"].includes(key)
          ? { reviewed: false }
          : {}),
      },
    }));
  const changePerson = (p: Person) =>
    set(
      "people",
      d.people.map((x) => (x.id === p.id ? p : x)),
    );
  const errors =
    d.step === 0
      ? detailsFieldErrors(d, d.detailsSection)
      : d.step === 1
        ? photoFieldErrors(d, records.photos)
        : reviewFieldErrors(d);
  const visibleErrors = showErrors ? errors : {};
  const completed = steps.flatMap((_, i) =>
    !draftIssues(d, records.photos, i).length ? [i] : [],
  );
  const allIssues = steps.flatMap((_, i) => draftIssues(d, records.photos, i));
  const resetView = () => {
    Keyboard.dismiss();
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const go = (step: number) => {
    setShowErrors(false);
    set("step", step);
    resetView();
  };
  const changeSection = (section: Draft["detailsSection"]) => {
    setShowErrors(false);
    set("detailsSection", section);
    resetView();
  };
  useEffect(() => {
    if (scanRequest) resetView();
  }, [scanRequest]);
  useEffect(() => {
    if (pendingFocus.current) {
      pendingFocus.current = false;
      form.focusFirst(errors);
    }
  }, [d.step, d.detailsSection]);
  const fail = (problems: Record<string, string>) => {
    setShowErrors(true);
    void feedback("error");
    form.focusFirst(problems);
  };
  const next = () => {
    if (Object.keys(errors).length) {
      fail(errors);
      return;
    }
    if (d.step === 0) {
      const nextSection = sections[sections.indexOf(d.detailsSection) + 1];
      if (nextSection) {
        void feedback("success");
        changeSection(nextSection);
        return;
      }
      const incomplete = sections.find(
        (section) => detailsIssues(d, section).length,
      );
      if (incomplete) {
        pendingFocus.current = true;
        setShowErrors(true);
        set("detailsSection", incomplete);
        return;
      }
    }
    if (d.step === 2) {
      const incomplete = [0, 1].find(
        (step) => draftIssues(d, records.photos, step).length,
      );
      if (incomplete !== undefined) {
        pendingFocus.current = true;
        setShowErrors(true);
        update((r) => ({
          ...r,
          draft: {
            ...r.draft,
            step: incomplete,
            detailsSection:
              sections.find(
                (section) => detailsIssues(r.draft, section).length,
              ) ?? "personal",
          },
        }));
        return;
      }
      void feedback("success");
      return;
    }
    void feedback("success");
    go(d.step + 1);
  };
  const remove = (p: Person) =>
    Alert.alert(
      `Remove ${personName(p)}?`,
      "Photos stay in your library. Check that everyone required by the official instructions is included.",
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
  const back = () =>
    d.step === 0
      ? changeSection(d.detailsSection === "family" ? "contact" : "personal")
      : go(d.step - 1);
  const nextTitle =
    d.step === 0
      ? d.detailsSection === "personal"
        ? "Continue to contact"
        : d.detailsSection === "contact"
          ? "Continue to family"
          : "Continue to photos"
      : d.step === 1
        ? "Review your entry"
        : !allIssues.length
          ? "Open official DV portal"
          : "Review checklist";
  const footer = (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
      {(d.step > 0 || d.detailsSection !== "personal") && (
        <View style={{ flex: 1 }}>
          <Button secondary title="Back" onPress={back} />
        </View>
      )}
      <View style={{ flex: 2.4 }}>
        <Button
          title={nextTitle}
          testID="apply-continue"
          icon={
            d.step === 2 && !allIssues.length ? "open-outline" : "arrow-forward"
          }
          onPress={
            d.step === 2 && !allIssues.length
              ? () => void openOfficial(official.portal)
              : next
          }
        />
      </View>
    </View>
  );
  return (
    <Screen form={form} scrollRef={scroll} footer={footer}>
      <PageHeading
        eyebrow={`PREPARATION · STEP ${d.step + 1} OF 3`}
        title="Prepare your entry"
      >
        {d.step === 0
          ? "Start with your details. We’ll help with the rest."
          : d.step === 1
            ? "A recent photo for everyone included."
            : "One final look before the official form."}
      </PageHeading>
      <ProgressSteps
        steps={steps}
        current={d.step}
        completed={completed}
        onSelect={go}
      />
      {d.step === 0 && (
        <>
          <View style={{ paddingVertical: 4 }}>
            <ProgressSteps
              compact
              testIDs={[
                "details-personal",
                "details-contact",
                "details-family",
              ]}
              steps={sectionLabels}
              current={sections.indexOf(d.detailsSection)}
              completed={sections.flatMap((section, i) =>
                !detailsIssues(d, section).length ? [i] : [],
              )}
              onSelect={(i) => changeSection(sections[i])}
            />
          </View>
          {d.detailsSection === "personal" && (
            <PassportCapture
              currentName={personName(d.people[0])}
              onManual={() =>
                form.focusField(
                  personFieldID(
                    d.people[0].id,
                    d.people[0].noFirst ? "middle" : "first",
                  ),
                )
              }
              onUse={(reading) => {
                update((r) => ({
                  ...r,
                  draft: applyPassport(r.draft, reading),
                }));
                setShowErrors(false);
                setScanMessage(
                  `${passportFieldCount(reading)} fields filled from your passport. Add your birthplace and education below.`,
                );
              }}
            />
          )}
          {d.detailsSection === "personal" && (
            <>
              {!!scanMessage && (
                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    backgroundColor: C.successBg,
                    padding: 16,
                    borderRadius: 16,
                  }}
                >
                  <Icon name="checkmark-circle" color={C.green} />
                  <Text
                    accessibilityRole="alert"
                    style={[s.body, { flex: 1, color: C.green }]}
                  >
                    {scanMessage}
                  </Text>
                </View>
              )}
              <Card style={{ gap: 28 }}>
                <PersonFields
                  person={d.people[0]}
                  change={changePerson}
                  errors={visibleErrors}
                />
                <FormSection title="Education">
                  <Select
                    fieldId="education"
                    error={visibleErrors.education}
                    label="Highest level of education"
                    value={d.education}
                    options={educationOptions}
                    onChange={(v) => set("education", v)}
                  />
                </FormSection>
                <Button
                  secondary
                  title={
                    showPassport
                      ? "Hide passport details"
                      : d.passport.number
                        ? "View passport details"
                        : "Add passport details (optional)"
                  }
                  icon="document-outline"
                  onPress={() => setShowPassport((v) => !v)}
                />
                {showPassport && (
                  <FormSection
                    title="Passport details"
                    description="Keep these separate from your birthplace. You can correct any scanned value."
                  >
                    <Field
                      fieldId="passportNumber"
                      label="Passport number"
                      value={d.passport.number}
                      onChangeText={(v) =>
                        set("passport", {
                          ...d.passport,
                          number: v.toUpperCase(),
                        })
                      }
                      autoCapitalize="characters"
                    />
                    <Select
                      fieldId="passportIssuer"
                      label="Issuing country"
                      value={normalizeCountry(d.passport.issuer) ?? ""}
                      options={countries}
                      searchable
                      onChange={(v) =>
                        set("passport", { ...d.passport, issuer: v })
                      }
                    />
                    {!!d.passport.issuer &&
                      !normalizeCountry(d.passport.issuer) && (
                        <Body muted>
                          Saved issuing authority: {d.passport.issuer}. This
                          code does not match a country. It stays saved; choose
                          a country only if it applies to your passport.
                        </Body>
                      )}
                    <Select
                      fieldId="passportNationality"
                      label="Nationality"
                      value={normalizeCountry(d.passport.nationality) ?? ""}
                      options={countries}
                      searchable
                      onChange={(v) =>
                        set("passport", { ...d.passport, nationality: v })
                      }
                    />
                    {!!d.passport.nationality &&
                      !normalizeCountry(d.passport.nationality) && (
                        <Body muted>
                          Saved nationality code: {d.passport.nationality}. This
                          code does not match a country. It stays saved; confirm
                          a country only if applicable.
                        </Body>
                      )}
                    <Field
                      fieldId="passportExpires"
                      label="Passport expiry (MM/DD/YYYY)"
                      value={displayBirthDate(d.passport.expires)}
                      placeholder="MM/DD/YYYY"
                      keyboardType="numbers-and-punctuation"
                      maxLength={10}
                      onChangeText={(v) =>
                        set("passport", {
                          ...d.passport,
                          expires: normalizeBirthDate(v),
                        })
                      }
                    />
                  </FormSection>
                )}
              </Card>
            </>
          )}
          {d.detailsSection === "contact" && (
            <Card style={{ gap: 28 }}>
              <FormSection
                title="Contact details"
                description="Use contact information you can access."
              >
                <Field
                  fieldId="email"
                  error={visibleErrors.email}
                  label="Email address"
                  value={d.email}
                  onChangeText={(v) => set("email", v)}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoCapitalize="none"
                />
                <Field
                  fieldId="phone"
                  label="Phone number (optional)"
                  value={d.phone}
                  onChangeText={(v) => set("phone", v)}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                />
              </FormSection>
              <FormSection title="Mailing address">
                <Field
                  fieldId="careOf"
                  label="In care of (optional)"
                  value={d.careOf}
                  onChangeText={(v) => set("careOf", v)}
                  textContentType="name"
                  autoCapitalize="words"
                />
                <Field
                  fieldId="address"
                  error={visibleErrors.address}
                  label="Address line 1"
                  value={d.address}
                  onChangeText={(v) => set("address", v)}
                  textContentType="streetAddressLine1"
                  autoCapitalize="words"
                />
                <Field
                  fieldId="address2"
                  label="Address line 2 (optional)"
                  value={d.address2}
                  onChangeText={(v) => set("address2", v)}
                  textContentType="streetAddressLine2"
                  autoCapitalize="words"
                />
                <Field
                  fieldId="city"
                  error={visibleErrors.city}
                  label="City / town"
                  value={d.city}
                  onChangeText={(v) => set("city", v)}
                  textContentType="addressCity"
                  autoCapitalize="words"
                />
                <Field
                  fieldId="province"
                  error={visibleErrors.province}
                  label="District / county / province / state"
                  value={d.province}
                  onChangeText={(v) => set("province", v)}
                  textContentType="addressState"
                  autoCapitalize="words"
                />
                <Field
                  fieldId="postal"
                  error={visibleErrors.postal}
                  label="Postal code"
                  value={d.postal}
                  editable={!d.noPostal}
                  onChangeText={(v) => set("postal", v)}
                  textContentType="postalCode"
                  autoCapitalize="characters"
                />
                <Toggle
                  title="No postal code"
                  value={d.noPostal}
                  onChange={(v) => set("noPostal", v)}
                />
                <Select
                  fieldId="country"
                  error={visibleErrors.country}
                  label="Mailing country"
                  value={d.country}
                  options={countries}
                  onChange={(v) => set("country", v)}
                  searchable
                />
              </FormSection>
              <FormSection title="Current residence">
                <Select
                  fieldId="residence"
                  error={visibleErrors.residence}
                  label="Country where you live today"
                  value={d.residence}
                  options={countries}
                  onChange={(v) => set("residence", v)}
                  searchable
                />
              </FormSection>
            </Card>
          )}
          {d.detailsSection === "family" && (
            <Card style={{ gap: 26 }}>
              <FormSection title="You and your family">
                <Select
                  fieldId="marital"
                  error={visibleErrors.marital}
                  label="Current marital status"
                  value={d.marital}
                  options={maritalOptions}
                  onChange={(v) => set("marital", v)}
                />
              </FormSection>
              <Body muted>
                Include every family member required by the current DV
                instructions, even if they will not travel with you.
              </Body>
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
                    paddingTop: 24,
                    gap: 20,
                  }}
                >
                  <Row>
                    <Badge>{p.relationship}</Badge>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${personName(p)}`}
                      onPress={() => remove(p)}
                      style={{ padding: 12 }}
                    >
                      <Icon name="trash-outline" color={C.red} />
                    </Pressable>
                  </Row>
                  <PersonFields
                    person={p}
                    change={changePerson}
                    errors={visibleErrors}
                  />
                </View>
              ))}
              <FormAnchor
                fieldId="familyMembers"
                error={visibleErrors.familyMembers}
              >
                <Stack gap={12}>
                  {familyAddOptions(d).map((option) => (
                    <Button
                      key={option.relationship}
                      secondary
                      title={option.label}
                      icon="person-add-outline"
                      onPress={() =>
                        set("people", [
                          ...d.people,
                          makePerson(option.relationship),
                        ])
                      }
                    />
                  ))}
                </Stack>
              </FormAnchor>
              <Toggle
                fieldId="familyReviewed"
                error={visibleErrors.familyReviewed}
                title="I reviewed who must be included"
                value={d.familyReviewed}
                onChange={(v) => set("familyReviewed", v)}
              />
            </Card>
          )}
        </>
      )}
      {d.step === 1 && (
        <Card>
          <Title>A photo for each person</Title>
          <Body muted>
            Prepare and review each photo. Only the official process can
            determine acceptance.
          </Body>
          {d.people.map((p) => {
            const ready = records.photos.some(
              (photo) => photo.personId === p.id && photoReviewed(photo),
            );
            return (
              <FormAnchor
                key={p.id}
                fieldId={`photo-${p.id}`}
                error={visibleErrors[`photo-${p.id}`]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${personName(p)}. ${ready ? "Photo reviewed" : "Add a photo"}`}
                  onPress={photos}
                  style={[s.row, { gap: 12, paddingVertical: 12 }]}
                >
                  <Icon
                    name={ready ? "checkmark-circle" : "person-circle-outline"}
                    color={ready ? C.green : C.blue}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={s.fieldLabel}>{personName(p)}</Text>
                    <Text style={s.small}>{p.relationship}</Text>
                  </View>
                  <Badge tone={ready ? "green" : "warm"}>
                    {ready ? "Reviewed" : "Photo needed"}
                  </Badge>
                </Pressable>
              </FormAnchor>
            );
          })}
          <Button
            secondary
            title="Open photo library"
            icon="camera-outline"
            onPress={photos}
          />
          <LinkRow title="Official photo examples" url={official.photos} />
        </Card>
      )}
      {d.step === 2 && (
        <>
          <Card>
            <Row>
              <Title>{personName(d.people[0])}</Title>
              <Badge tone={!allIssues.length ? "green" : "blue"}>
                {!allIssues.length ? "Reviewed" : "Final review"}
              </Badge>
            </Row>
            <Body muted>
              {d.email || "Email not entered"}
              {"\n"}
              {d.people.length === 1
                ? "Primary applicant"
                : `${d.people.length} people included`}
            </Body>
            {steps.slice(0, 2).map((step, i) => (
              <Pressable
                key={step}
                accessibilityRole="button"
                onPress={() => go(i)}
                style={[s.row, { paddingVertical: 12, gap: 10 }]}
              >
                <Icon
                  name={
                    completed.includes(i)
                      ? "checkmark-circle"
                      : "ellipse-outline"
                  }
                  color={completed.includes(i) ? C.green : C.muted}
                />
                <Text style={[s.fieldLabel, { flex: 1 }]}>{step}</Text>
                <Text style={s.small}>
                  {completed.includes(i) ? "Complete" : "Needs attention"}
                </Text>
                <Icon name="chevron-forward" size={16} />
              </Pressable>
            ))}
          </Card>
          <Card style={{ gap: 24 }}>
            <FormSection
              title="Eligibility"
              description="Check the current official instructions. The app does not determine whether you qualify."
            >
              <Select
                fieldId="eligibilityCountry"
                error={visibleErrors.eligibilityCountry}
                label="Country of eligibility / chargeability"
                value={d.eligibilityCountry}
                options={countries}
                onChange={(v) => set("eligibilityCountry", v)}
                searchable
              />
              <Select
                fieldId="eligibilityBasis"
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
                fieldId="qualification"
                error={visibleErrors.qualification}
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
                url={official.instructions}
              />
              <Toggle
                fieldId="eligibilityReviewed"
                error={visibleErrors.eligibilityReviewed}
                title="I reviewed the official eligibility rules"
                value={d.eligibilityReviewed}
                onChange={(v) => set("eligibilityReviewed", v)}
              />
            </FormSection>
            <FormSection
              title="Passport readiness"
              description="Keep the required page scans for official submission. A scan in this app only helps prepare your details."
            >
              <Select
                fieldId="passportPlan"
                error={visibleErrors.passportPlan}
                label="Passport preparation"
                value={d.passportPlan}
                options={[
                  "Passport and required page scans are ready",
                  "I need to prepare my passport / page scans",
                  "I need to review a possible exemption",
                ]}
                onChange={(v) => set("passportPlan", v)}
              />
              <LinkRow title="Read the passport rule" url={official.passport} />
              <Toggle
                fieldId="passportReviewed"
                error={visibleErrors.passportReviewed}
                title="I reviewed passport and scan requirements"
                value={d.passportReviewed}
                onChange={(v) => set("passportReviewed", v)}
              />
            </FormSection>
            <Toggle
              fieldId="reviewed"
              error={visibleErrors.reviewed}
              title="I reviewed my preparation details"
              detail="I will confirm every field on the official form."
              value={d.reviewed}
              onChange={(v) => set("reviewed", v)}
            />
          </Card>
          {!allIssues.length && (
            <View
              style={{
                padding: 18,
                borderRadius: 18,
                backgroundColor: C.successBg,
                gap: 8,
              }}
            >
              <Icon name="checkmark-circle" color={C.green} />
              <Title>Your checklist is reviewed</Title>
              <Body>
                When registration opens, complete the official entry form and
                keep its confirmation. Preparing here does not submit an entry.
              </Body>
            </View>
          )}
          <Notice title="Submit on the official website">
            The government website handles submission, verification and any
            required payment. This app is an independent preparation tool.
          </Notice>
          <Button
            secondary
            title="Save an existing confirmation"
            icon="bookmark-outline"
            onPress={addEntry}
          />
        </>
      )}
      {showErrors && Object.keys(errors).length > 0 && (
        <Notice title="A few things to complete">
          We highlighted what needs your attention.
        </Notice>
      )}
      <Text style={[s.small, { textAlign: "center" }]}>
        Independent preparation tool · Not affiliated with the U.S. government
      </Text>
    </Screen>
  );
}
