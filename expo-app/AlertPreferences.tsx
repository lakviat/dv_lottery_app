import React, { useEffect, useRef, useState } from "react";
import { AppState, Linking, Text } from "react-native";
import * as Crypto from "expo-crypto";
import { official } from "./models";
import {
  Body,
  Button,
  Card,
  Field,
  LinkRow,
  Notice,
  Sheet,
  Title,
  Toggle,
  feedback,
  s,
  useFormNavigation,
} from "./ui";
import {
  AlertFeed,
  alertConsent,
  fetchAlertFeed,
  registrationSummary,
  requestOpeningEmail,
  unknownFeed,
  validAlertEmail,
} from "./registrationAlerts";
import {
  ReminderState,
  cancelRegistrationReminder,
  enableRegistrationReminder,
  registrationReminderState,
} from "./registrationReminders";

export function useRegistrationFeed() {
  const [feed, setFeed] = useState<AlertFeed>(unknownFeed);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const lastAttempt = useRef(0);
  const inFlight = useRef(false);
  const refresh = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    lastAttempt.current = Date.now();
    setRefreshing(true);
    try {
      setFeed(await fetchAlertFeed());
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  };
  useEffect(() => {
    void refresh();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active" && Date.now() - lastAttempt.current > 300000)
        void refresh();
    });
    return () => listener.remove();
  }, []);
  return { feed, failed, refreshing, refresh };
}

export function RegistrationAlerts({
  visible,
  onClose,
  status,
}: {
  visible: boolean;
  onClose: () => void;
  status: ReturnType<typeof useRegistrationFeed>;
}) {
  const [reminder, setReminder] = useState<ReminderState>("off");
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderError, setReminderError] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [receipt, setReceipt] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const emailForm = useFormNavigation();
  const validation = {
    email: !validAlertEmail(email) ? "Enter a valid email address." : undefined,
    consent: !consent
      ? "Agree to receive this opening email before sending."
      : undefined,
  };
  const startedAt = useRef(Date.now());
  const requestID = useRef("");
  const busy = useRef(false);

  useEffect(() => {
    if (!visible) return;
    startedAt.current = Date.now();
    requestID.current = `gcas-notify-${Crypto.randomUUID()}`;
    const read = () => {
      void registrationReminderState()
        .then(setReminder)
        .catch(() =>
          setReminderError("Could not read your device reminder. Try again."),
        );
    };
    read();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") read();
    });
    return () => listener.remove();
  }, [visible]);

  const changeReminder = async () => {
    if (reminderBusy) return;
    setReminderBusy(true);
    setReminderError("");
    try {
      if (reminder === "on") {
        await cancelRegistrationReminder();
        setReminder("off");
      } else setReminder(await enableRegistrationReminder());
    } catch (error) {
      if (__DEV__) console.warn("Registration reminder:", error);
      setReminderError("The reminder could not be updated. Please try again.");
    } finally {
      setReminderBusy(false);
    }
  };
  const send = async () => {
    if (busy.current) return;
    setEmailError("");
    setReceipt("");
    if (Object.values(validation).some(Boolean)) {
      setShowErrors(true);
      emailForm.focusFirst(validation);
      feedback("error");
      return;
    }
    busy.current = true;
    setSending(true);
    try {
      const result = await requestOpeningEmail(
        email,
        consent,
        startedAt.current,
        requestID.current,
      );
      setReceipt(
        result === "confirmation_sent"
          ? "Check your inbox and confirm your email to receive the opening alert."
          : result === "confirmation_pending"
            ? "Your request is saved. A confirmation email is queued; confirm it when it arrives to activate the opening alert."
            : result === "already_confirmed"
              ? "This email is already confirmed for its one-time opening alert."
              : "Your request was received. Automatic opening emails are not active yet. You can use the device reminder while the service is being set up.",
      );
      setEmail("");
      setConsent(false);
      setShowErrors(false);
      feedback("success");
    } catch (error) {
      setEmailError(
        error instanceof Error && !/network|fetch|abort/i.test(error.message)
          ? error.message
          : "We could not confirm your request. Check your connection and try again.",
      );
    } finally {
      busy.current = false;
      setSending(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      title="Registration alerts"
      onClose={onClose}
      form={emailForm}
    >
      <Body>No account needed. Choose either option, or both.</Body>
      <Card>
        <Title>{registrationSummary(status.feed)}</Title>
        <Body muted>
          Dates come from the U.S. Department of State. Always check the
          official page before entering.
        </Body>
        {status.failed && (
          <Notice title="Could not refresh dates">
            Check the official announcement below for the latest information.
          </Notice>
        )}
        <LinkRow
          title="Official registration announcement"
          url={status.feed.window?.sourceURL || official.dates}
          icon="calendar-outline"
        />
        <Button
          secondary
          title="Refresh announcement"
          icon="refresh-outline"
          onPress={() => void status.refresh()}
          busy={status.refreshing}
        />
      </Card>
      <Card>
        <Title>Remind me to check</Title>
        <Body muted>
          A gentle reminder every Monday at 9:00 AM, in your device’s local
          time. It is a date-check reminder, not a live opening alert.
        </Body>
        {reminder === "unavailable" ? (
          <Notice title="Reminders need the iOS development app">
            This preview cannot schedule reminders. Rebuild and open the iOS
            development app to enable them. You can still request an email alert
            below.
          </Notice>
        ) : (
          <>
            <Text testID="reminder-status" style={s.fieldLabel}>
              {reminder === "on"
                ? "Weekly reminder is on"
                : reminder === "denied"
                  ? "Notifications are off in iOS Settings"
                  : "Weekly reminder is off"}
            </Text>
            {reminder === "denied" ? (
              <Button
                secondary
                title="Open notification settings"
                onPress={() => void Linking.openSettings()}
              />
            ) : (
              <Button
                secondary
                testID="registration-reminder-toggle"
                title={
                  reminder === "on"
                    ? "Turn off reminder"
                    : "Enable weekly reminder"
                }
                icon={
                  reminder === "on"
                    ? "notifications-off-outline"
                    : "notifications-outline"
                }
                busy={reminderBusy}
                onPress={() => void changeReminder()}
              />
            )}
          </>
        )}
        {reminderError ? (
          <Notice title="Reminder needs attention">{reminderError}</Notice>
        ) : null}
      </Card>
      <Card>
        <Title>Email me when registration opens</Title>
        <Body muted>
          {status.feed.emailDelivery
            ? "Confirm your email, then receive one opening alert for the next registration period. No marketing."
            : "We’re collecting requests. Automatic opening emails are not active yet; use the reminder above in the meantime."}
        </Body>
        <Field
          fieldId="email"
          label="Email for opening alert"
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          editable={!sending}
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setEmailError("");
            setReceipt("");
          }}
          error={emailError || (showErrors ? validation.email : undefined)}
        />
        <Toggle
          fieldId="consent"
          title="Send me the opening email"
          detail={alertConsent}
          value={consent}
          disabled={sending}
          onChange={setConsent}
          error={showErrors ? validation.consent : undefined}
        />
        <Button
          title="Request email alert"
          testID="registration-email-submit"
          icon="mail-outline"
          busy={sending}
          onPress={() => void send()}
        />
        {receipt ? (
          <Notice title="Email request received">{receipt}</Notice>
        ) : null}
        <Text style={s.small}>
          Only your email and consent are shared with Green Card Application
          Services and stored using its Google service. Your draft, passport
          details and photos stay on this device. No account is created. Emails
          include an unsubscribe link; to cancel a queued request, contact the
          service below.
        </Text>
        <LinkRow
          title="Privacy & contact"
          url="https://greencardapplicationservices.com/policies/#privacy"
        />
      </Card>
    </Sheet>
  );
}
