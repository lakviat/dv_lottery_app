import React from "react";
import { Text, View } from "react-native";
import { PhotoCheckReport } from "./photoCheckTypes";
import { photoCheckSummary } from "./photoChecks";
import { Badge, Body, Button, C, Disclosure, Icon, LinkRow, Notice, Stack, Title, s } from "./ui";
import { official } from "./models";

export function PhotoCheckResults({ report, checking, onCheck, checkDisabled = false }: {
  report?: PhotoCheckReport;
  checking: boolean;
  onCheck: () => void;
  checkDisabled?: boolean;
}) {
  const summary = photoCheckSummary(report);
  const automatic = report?.checks.filter((check) => check.kind !== "manual") ?? [];
  const manual = report?.checks.filter((check) => check.kind === "manual") ?? [];
  const rows = (checks: NonNullable<PhotoCheckReport["checks"]>) => checks.map((check) => (
    <View key={check.id} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
      <Icon
        name={check.state === "pass" ? "checkmark-circle" : check.state === "attention" ? "alert-circle-outline" : "help-circle-outline"}
        color={check.state === "pass" ? C.green : check.state === "attention" ? C.amber : C.muted}
      />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.fieldLabel}>{check.label}</Text>
        <Text style={s.small}>
          {check.state === "pass" ? "Pass" : check.state === "attention" ? "Needs attention" : "Unable to verify automatically"}
          {check.kind === "heuristic" ? " · Estimate" : ""}
        </Text>
        <Body muted>{check.detail}</Body>
      </View>
    </View>
  ));
  return (
    <Stack gap={16}>
      <Title>Photo check</Title>
      <Badge tone={checking ? "neutral" : summary.tone}>
        {checking ? "Checking photo…" : summary.label}
      </Badge>
      {!!report && (
        <Text style={s.small}>
          {summary.passed} checks passed · {summary.attention} items need attention · {summary.unverified} require review
        </Text>
      )}
      {report?.error && (
        <Notice title="We couldn't complete the automated photo check" tone="blue">
          {report.error}
        </Notice>
      )}
      {rows(automatic)}
      {!!manual.length && (
        <Disclosure title="Checks that need your review">
          {rows(manual)}
        </Disclosure>
      )}
      <Button
        secondary
        title={checking ? "Checking photo…" : report?.error ? "Try again" : report ? "Check again" : "Check photo"}
        icon="scan-outline"
        busy={checking}
        disabled={checkDisabled}
        onPress={onCheck}
      />
      <Body muted>
        Automated checks cannot guarantee acceptance. The U.S. Department of State makes the final determination.
      </Body>
      <LinkRow title="Official photo examples and guidance" url={official.photos} />
    </Stack>
  );
}
