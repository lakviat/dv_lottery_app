import React from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { Records, official, steps } from "./models";
import { preparationProgress } from "./preparation";
import {
  Badge,
  Body,
  Button,
  C,
  Card,
  Icon,
  IconName,
  Label,
  LinkRow,
  Notice,
  PageHeading,
  ProgressBar,
  ProgressSteps,
  Row,
  Screen,
  Stack,
  Title,
  s,
} from "./ui";

function QuickAction({
  title,
  detail,
  icon,
  onPress,
}: {
  title: string;
  detail: string;
  icon: IconName;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 16,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: C.blueSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} color={C.blue} size={23} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.fieldLabel}>{title}</Text>
        <Text style={s.small}>{detail}</Text>
      </View>
      <Icon name="chevron-forward" size={17} color={C.muted} />
    </Pressable>
  );
}

export function HomeScreen({
  records,
  apply,
  scan,
  photos,
  entries,
  guide,
  alerts,
  registrationStatus,
}: {
  records: Records;
  apply: () => void;
  scan: () => void;
  photos: () => void;
  entries: () => void;
  guide: () => void;
  alerts: () => void;
  registrationStatus: string;
}) {
  const { width } = useWindowDimensions();
  const progress = preparationProgress(records);
  return (
    <Screen wide>
      <PageHeading
        eyebrow="YOUR DV JOURNEY"
        title={
          progress.ready ? "Ready for your next step" : "Prepare your entry"
        }
      >
        {progress.ready
          ? "Your checklist is reviewed. Confirm your information on the official entry form."
          : "Three clear steps. Your progress saves as you go."}
      </PageHeading>
      <View
        style={{
          flexDirection: width >= 800 ? "row" : "column",
          alignItems: "stretch",
          gap: 24,
        }}
      >
        <View style={{ flex: 1.15 }}>
          <Card style={{ borderColor: "#D8E3FA", gap: 22 }}>
            <Row>
              <Label>YOUR PREPARATION</Label>
              {progress.ready && <Badge tone="green">Reviewed</Badge>}
            </Row>
            <View style={{ gap: 4 }}>
              <Text
                style={{
                  fontSize: 36,
                  fontWeight: "700",
                  letterSpacing: -1.3,
                  color: C.navy,
                }}
              >
                {progress.count}
                <Text
                  style={{ fontSize: 23, color: C.muted, fontWeight: "500" }}
                >
                  {" "}
                  of 3 complete
                </Text>
              </Text>
              <Text style={s.small}>
                {progress.ready
                  ? "You’re ready to check the official instructions."
                  : "Details, photos, then a final review."}
              </Text>
            </View>
            <ProgressBar value={progress.count / 3} />
            <ProgressSteps
              steps={steps}
              current={progress.step}
              completed={progress.completed.flatMap((done, i) =>
                done ? [i] : [],
              )}
            />
            <Button
              title={progress.action}
              testID="home-next-action"
              icon="arrow-forward"
              onPress={apply}
            />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Icon name="lock-closed-outline" size={13} color={C.muted} />
              <Text style={s.small}>No account required</Text>
            </View>
          </Card>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Label>QUICK ACTIONS</Label>
          <QuickAction
            title="Scan passport"
            detail="Fill your details automatically"
            icon="scan-outline"
            onPress={scan}
          />
          <View style={{ height: 1, backgroundColor: C.line }} />
          <QuickAction
            title="Check my photo"
            detail="Prepare a photo for each person"
            icon="camera-outline"
            onPress={photos}
          />
          <View style={{ height: 1, backgroundColor: C.line }} />
          <QuickAction
            title="DV lottery guide"
            detail="Requirements and official instructions"
            icon="book-outline"
            onPress={guide}
          />
          <View style={{ height: 1, backgroundColor: C.line }} />
          <QuickAction
            title="My entries"
            detail={
              records.entries.length
                ? `${records.entries.length} saved · View your history`
                : "Keep your submitted confirmations"
            }
            icon="albums-outline"
            onPress={entries}
          />
        </View>
      </View>
      <Pressable
        testID="registration-alerts"
        accessibilityRole="button"
        accessibilityLabel={`Registration alerts. ${registrationStatus}`}
        onPress={alerts}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          backgroundColor: C.white,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: C.line,
          padding: 17,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Icon name="calendar-outline" color={C.blue} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.fieldLabel}>Registration updates</Text>
          <Text style={s.small}>{registrationStatus}</Text>
        </View>
        <Icon name="chevron-forward" color={C.muted} size={17} />
      </Pressable>
      <Text style={[s.small, { textAlign: "center" }]}>
        Independent preparation tool · Not a government app
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
