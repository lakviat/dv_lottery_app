import React from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { Records, draftIssues, official, steps } from "./models";
import {
  Badge,
  Body,
  Button,
  C,
  Card,
  Icon,
  LinkRow,
  Notice,
  Row,
  Screen,
  Stack,
  Title,
  s,
} from "./ui";

export function HomeScreen({
  records,
  apply,
  photos,
  entries,
  guide,
  alerts,
  registrationStatus,
}: {
  records: Records;
  apply: () => void;
  photos: () => void;
  entries: () => void;
  guide: () => void;
  alerts: () => void;
  registrationStatus: string;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const completed = steps.filter(
    (_, i) => !draftIssues(records.draft, records.photos, i).length,
  ).length;
  return (
    <Screen wide>
      <View style={{ flexDirection: wide ? "row" : "column", gap: 18 }}>
        <View style={{ flex: 1 }}>
          <Card style={{ height: "100%" }}>
            <Row>
              <Title>Your preparation</Title>
              <Badge>
                {completed} / {steps.length}
              </Badge>
            </Row>
            <View
              style={{
                height: 7,
                backgroundColor: "#E9EDF4",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: 7,
                  width: `${(completed / steps.length) * 100}%`,
                  backgroundColor: C.blue,
                  borderRadius: 4,
                }}
              />
            </View>
            <Body muted>
              {records.draft.started
                ? `Pick up at ${steps[records.draft.step].toLowerCase()}. Your progress saves as you go.`
                : "Start with a passport scan or type your details, then prepare photos and review."}
            </Body>
            <Button
              title={
                records.draft.started
                  ? "Continue preparation"
                  : "Start your checklist"
              }
              icon="document-text-outline"
              onPress={apply}
            />
          </Card>
        </View>
        <View style={{ flex: 1, gap: 14 }}>
          <Pressable accessibilityRole="button" onPress={photos}>
            <Card>
              <Row>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 14,
                    alignItems: "center",
                  }}
                >
                  <View style={s.emptyIcon}>
                    <Icon name="camera-outline" size={27} color={C.blue} />
                  </View>
                  <View style={{ gap: 6 }}>
                    <Title>Photo studio</Title>
                    <Text style={s.small}>
                      {records.photos.length
                        ? `${records.photos.length} saved photos`
                        : "A photo for each person"}
                    </Text>
                  </View>
                </View>
                <Icon name="chevron-forward" size={18} color={C.muted} />
              </Row>
            </Card>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={guide}>
            <Card>
              <Row>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 14,
                    alignItems: "center",
                  }}
                >
                  <Icon name="book-outline" size={26} color={C.blue} />
                  <View style={{ gap: 4 }}>
                    <Text style={s.fieldLabel}>Know before you apply</Text>
                    <Text style={s.small}>Your DV essentials guide</Text>
                  </View>
                </View>
                <Icon name="chevron-forward" size={18} color={C.muted} />
              </Row>
            </Card>
          </Pressable>
        </View>
      </View>
      <Card>
        <Row>
          <Title>My entries</Title>
          <Badge>{records.entries.length} saved</Badge>
        </Row>
        <Body muted>
          {records.entries.length
            ? "View your saved confirmations and the updates you recorded."
            : "Already submitted an entry? Keep your confirmation and previous years in one place."}
        </Body>
        <Button
          secondary
          title={
            records.entries.length
              ? "View my entries"
              : "Track a submitted entry"
          }
          icon="albums-outline"
          onPress={entries}
        />
      </Card>
      <Card>
        <Row>
          <Title>Registration</Title>
          <Icon name="notifications-outline" color={C.blue} />
        </Row>
        <Body muted>{registrationStatus}</Body>
        <Button secondary title="Registration alerts" testID="registration-alerts"
          icon="notifications-outline" onPress={alerts} />
      </Card>
      <Text style={[s.small, { textAlign: "center" }]}>
        Independent DV companion · Not a government app{"\n"}Guidance reviewed
        October 5, 2026
      </Text>
    </Screen>
  );
}

export function GuideContent() {
  return (
    <Stack>
      <Notice title="Always check the current program year">
        Registration dates and rules can change. The information here is a dated
        preparation guide, not a live eligibility determination.
      </Notice>
      <Card>
        <Title>1. Confirm eligibility</Title>
        <Body>
          Read the current eligible-country list and education or qualifying
          work-experience requirements. Country of birth normally determines
          chargeability; limited spouse and parent exceptions exist.
        </Body>
        <LinkRow title="Official instructions" url={official.instructions} />
      </Card>
      <Card>
        <Title>2. Prepare your family details</Title>
        <Body>
          Gather accurate names, dates and places of birth, mailing and contact
          information, education and marital status. Include every spouse and
          child required by the instructions.
        </Body>
      </Card>
      <Card>
        <Title>3. Prepare a photo for each person</Title>
        <Body>
          Use a new color photograph taken within six months. Prepare a 600 ×
          600 pixel JPEG no larger than 240 kB. Check head size and eye
          position, neutral expression, lighting, background and the rules on
          glasses and head coverings.
        </Body>
        <LinkRow title="Official photo examples" url={official.photos} />
      </Card>
      <Card>
        <Title>4. Review passport requirements</Title>
        <Body>
          The March 2026 rule requires passport information and specified page
          scans, with limited exemptions. Review current instructions before
          entry. You can scan your passport to prepare personal details on this
          device. The temporary scan is removed after reading; confirmed
          passport details stay in your local draft.
        </Body>
        <LinkRow title="Read the passport rule" url={official.passport} />
      </Card>
      <Card>
        <Title>5. Submit and keep your confirmation</Title>
        <Body>
          When registration opens, complete the official form and any required
          payment on the government website. Submit only one entry per person
          per registration period. Keep the confirmation page securely.
        </Body>
        <Body muted>
          The current fee schedule lists a $1 registration fee and a $330 DV
          visa application fee for selectees. Check the official schedule for
          updates.
        </Body>
        <LinkRow title="Official fee schedule" url={official.fees} />
        <LinkRow title="Official entry portal" url={official.portal} />
      </Card>
      <Card>
        <Title>6. Check results yourself</Title>
        <Body>
          Use Entrant Status Check with your confirmation, last / family name
          and birth year. If selected, follow official next steps and visa
          bulletin guidance. Selection does not guarantee a visa.
        </Body>
        <LinkRow title="Entrant Status Check" url={official.results} />
        <LinkRow title="Visa bulletin" url={official.bulletin} />
      </Card>
    </Stack>
  );
}
