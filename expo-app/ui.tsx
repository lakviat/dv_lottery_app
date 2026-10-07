import React, {
  PropsWithChildren,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { colors, motion, radius, spacing, typography } from "./theme";
import {
  FormNavigation,
  FormNavigationContext,
  useFormControl,
  useFormNavigation,
} from "./formNavigation";
import { useReducedMotion } from "./motion";

export { useFormNavigation } from "./formNavigation";
export type { FormErrors, FormNavigation } from "./formNavigation";
export { feedback, useReducedMotion } from "./motion";
export { theme, spacing, radius, typography } from "./theme";
export const C = colors;
export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export function Icon({
  name,
  size = 22,
  color = C.navy,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} accessible={false} />;
}
export function Label({ children }: PropsWithChildren) {
  return <Text style={s.label}>{children}</Text>;
}
export function Body({
  children,
  muted = false,
}: PropsWithChildren<{ muted?: boolean }>) {
  return <Text style={[s.body, muted && { color: C.muted }]}>{children}</Text>;
}
export function Title({ children }: PropsWithChildren) {
  return (
    <Text accessibilityRole="header" style={s.title}>
      {children}
    </Text>
  );
}
export function PageHeading({
  eyebrow,
  title,
  children,
}: PropsWithChildren<{ eyebrow?: string; title: string }>) {
  return (
    <View style={{ gap: spacing.sm }}>
      {eyebrow && <Label>{eyebrow}</Label>}
      <Text
        accessibilityRole="header"
        style={[typography.page, { color: C.navy }]}
      >
        {title}
      </Text>
      {children && <Body muted>{children}</Body>}
    </View>
  );
}
export function Card({
  children,
  style,
  variant = "default",
}: PropsWithChildren<{
  style?: ViewStyle;
  variant?: "default" | "hero" | "feature" | "quiet";
}>) {
  return (
    <View
      style={[
        s.card,
        variant === "hero" && {
          backgroundColor: C.blueSoft,
          borderColor: "#D5E2FC",
          padding: spacing.xxl,
        },
        variant === "feature" && { borderColor: "#D5E2FC" },
        variant === "quiet" && {
          backgroundColor: "transparent",
          borderWidth: 0,
          padding: 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Stack({
  children,
  gap = spacing.xl,
}: PropsWithChildren<{ gap?: number }>) {
  return <View style={{ gap }}>{children}</View>;
}
export function Row({ children }: PropsWithChildren) {
  return <View style={s.row}>{children}</View>;
}
export function FormSection({
  title,
  description,
  children,
}: PropsWithChildren<{ title: string; description?: string }>) {
  return (
    <View style={{ gap: spacing.xl }}>
      <View style={{ gap: 5 }}>
        <Text accessibilityRole="header" style={s.sectionTitle}>
          {title}
        </Text>
        {description && <Text style={s.small}>{description}</Text>}
      </View>
      {children}
    </View>
  );
}
export function Badge({
  children,
  tone = "blue",
}: PropsWithChildren<{
  tone?: "blue" | "green" | "warm" | "red" | "neutral";
}>) {
  const color =
    tone === "green"
      ? C.green
      : tone === "warm"
        ? C.amber
        : tone === "red"
          ? C.red
          : tone === "neutral"
            ? C.muted
            : C.blue;
  const backgroundColor =
    tone === "green"
      ? C.successBg
      : tone === "warm"
        ? C.warm
        : tone === "red"
          ? C.dangerSoft
          : tone === "neutral"
            ? C.bg
            : C.blueSoft;
  return (
    <View style={[s.badge, { backgroundColor }]}>
      <Text style={{ fontSize: 12, lineHeight: 17, fontWeight: "700", color }}>
        {children}
      </Text>
    </View>
  );
}

type ButtonVariant = "primary" | "secondary" | "tertiary" | "destructive";
export function Button({
  title,
  onPress,
  icon,
  secondary = false,
  danger = false,
  disabled = false,
  busy = false,
  testID,
  variant,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  busy?: boolean;
  testID?: string;
  variant?: ButtonVariant;
}) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const kind =
    variant ?? (danger ? "destructive" : secondary ? "secondary" : "primary");
  const foreground =
    kind === "tertiary" ? C.blue : kind === "secondary" ? C.navy : C.white;
  const animate = (value: number) =>
    Animated.timing(scale, {
      toValue: reduced ? 1 : value,
      duration: motion.short,
      useNativeDriver: true,
    }).start();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: disabled || busy, busy }}
        testID={testID}
        disabled={disabled || busy}
        onPress={onPress}
        onPressIn={() => animate(0.985)}
        onPressOut={() => animate(1)}
        style={({ pressed }) => [
          s.button,
          {
            backgroundColor:
              kind === "secondary"
                ? C.blueSoft
                : kind === "tertiary"
                  ? "transparent"
                  : kind === "destructive"
                    ? C.red
                    : C.navy,
            opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
          },
        ]}
      >
        {busy ? (
          <ActivityIndicator color={foreground} />
        ) : (
          icon && <Icon name={icon} size={20} color={foreground} />
        )}
        <Text style={[s.buttonText, { color: foreground }]}>{title}</Text>
      </Pressable>
    </Animated.View>
  );
}

function FieldError({ error }: { error?: string }) {
  return error ? (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 5 }}>
      <Icon name="alert-circle" size={16} color={C.red} />
      <Text
        accessibilityRole="alert"
        style={[s.small, { color: C.red, flex: 1 }]}
      >
        {error}
      </Text>
    </View>
  ) : null;
}

export function Field({
  label,
  help,
  error,
  fieldId,
  nextFieldId,
  style,
  onFocus,
  onBlur,
  onSubmitEditing,
  ...props
}: TextInputProps & {
  label: string;
  help?: string;
  error?: string;
  fieldId?: string;
  nextFieldId?: string;
}) {
  const id = fieldId ?? label;
  const wrapper = useRef<View>(null);
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const accessoryId = useId();
  const form = useFormControl(id, {
    node: () => wrapper.current,
    accessibilityNode: () => input.current,
    label: () => label,
    error: () => error,
    focus: () => input.current?.focus(),
    isTextInput: () => props.editable !== false,
  });
  const hasNext = !!form?.hasNext(id, nextFieldId);
  const advance = () => {
    if (form) form.focusNext(id, nextFieldId);
    else Keyboard.dismiss();
  };
  const needsAccessory =
    Platform.OS === "ios" &&
    (props.multiline ||
      ["phone-pad", "number-pad", "decimal-pad", "numeric"].includes(
        props.keyboardType ?? "",
      )) &&
    props.editable !== false;
  return (
    <View ref={wrapper} collapsable={false} style={{ gap: spacing.sm }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        ref={input}
        accessibilityLabel={label}
        accessibilityHint={error ?? help}
        accessibilityState={{ disabled: props.editable === false }}
        placeholderTextColor={C.muted}
        autoCorrect={false}
        autoCapitalize="none"
        textContentType="none"
        selectionColor={C.blue}
        returnKeyType={hasNext ? "next" : "done"}
        submitBehavior={props.multiline ? "newline" : "submit"}
        inputAccessoryViewID={needsAccessory ? accessoryId : undefined}
        {...props}
        style={[
          s.input,
          props.editable === false && { backgroundColor: C.bg, color: C.muted },
          focused && { borderColor: C.blue, backgroundColor: "#FBFCFF" },
          error && { borderColor: C.red, borderWidth: 1.5 },
          props.multiline && { minHeight: 104, textAlignVertical: "top" },
          style,
        ]}
        onFocus={(event) => {
          setFocused(true);
          form?.reveal(id);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onSubmitEditing={(event) => {
          if (onSubmitEditing) onSubmitEditing(event);
          else if (!props.multiline) advance();
        }}
      />
      {help && !error && <Text style={s.small}>{help}</Text>}
      <FieldError error={error} />
      {needsAccessory && (
        <InputAccessoryView nativeID={accessoryId}>
          <View style={s.keyboardToolbar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={props.multiline || !hasNext ? "Dismiss keyboard" : "Next field"}
              onPress={props.multiline ? Keyboard.dismiss : advance}
              style={{
                minHeight: 44,
                paddingHorizontal: 20,
                justifyContent: "center",
              }}
            >
              <Text style={{ color: C.blue, fontWeight: "600", fontSize: 16 }}>
                {!props.multiline && hasNext ? "Next" : "Done"}
              </Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
    </View>
  );
}

export function Toggle({
  title,
  detail,
  value,
  onChange,
  disabled = false,
  fieldId,
  error,
}: {
  title: string;
  detail?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  fieldId?: string;
  error?: string;
}) {
  const wrapper = useRef<View>(null);
  const toggle = useRef<Switch>(null);
  useFormControl(fieldId ?? title, {
    node: () => wrapper.current,
    accessibilityNode: () => toggle.current,
    label: () => title,
    error: () => error,
    isTextInput: () => false,
  });
  return (
    <View
      ref={wrapper}
      collapsable={false}
      style={[
        { gap: 8 },
        error && {
          borderColor: C.red,
          borderWidth: 1.5,
          borderRadius: radius.input,
          padding: spacing.md,
        },
      ]}
    >
      <View
        style={[s.row, { alignItems: "flex-start", gap: 14, minHeight: 44 }]}
      >
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={s.body}>{title}</Text>
          {detail && <Text style={s.small}>{detail}</Text>}
        </View>
        <Switch
          ref={toggle}
          accessibilityLabel={title}
          accessibilityHint={error ?? detail}
          accessibilityState={{ disabled, checked: value }}
          disabled={disabled}
          value={value}
          onValueChange={onChange}
          trackColor={{ true: C.blue }}
        />
      </View>
      <FieldError error={error} />
    </View>
  );
}

export function Select({
  label,
  value,
  options,
  onChange,
  searchable = false,
  error,
  fieldId,
  help,
  disabled = false,
  searchTextContentType = "none",
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  searchable?: boolean;
  error?: string;
  fieldId?: string;
  help?: string;
  disabled?: boolean;
  searchTextContentType?: TextInputProps["textContentType"];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapper = useRef<View>(null);
  const control = useRef<View>(null);
  useFormControl(fieldId ?? label, {
    node: () => wrapper.current,
    accessibilityNode: () => control.current,
    label: () => label,
    error: () => error,
    isTextInput: () => false,
  });
  const matches = options.filter((option) =>
    option.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <View ref={wrapper} collapsable={false} style={{ gap: spacing.sm }}>
        <Text style={s.fieldLabel}>{label}</Text>
        <Pressable
          ref={control}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value || "Choose"}`}
          accessibilityHint={error ?? help}
          accessibilityState={{ expanded: open, disabled }}
          disabled={disabled}
          onPress={() => {
            Keyboard.dismiss();
            setQuery("");
            setOpen(true);
          }}
          style={({ pressed }) => [
            s.input,
            s.row,
            { gap: 10 },
            pressed && { backgroundColor: C.blueSoft },
            disabled && { opacity: 0.5 },
            error && { borderColor: C.red, borderWidth: 1.5 },
          ]}
        >
          <Text
            style={{
              flex: 1,
              fontSize: 16,
              lineHeight: 23,
              color: value ? C.navy : C.muted,
            }}
          >
            {value || "Choose…"}
          </Text>
          <Icon name="chevron-down" size={18} color={C.muted} />
        </Pressable>
        {help && !error && <Text style={s.small}>{help}</Text>}
        <FieldError error={error} />
      </View>
      <Sheet visible={open} title={label} onClose={() => setOpen(false)}>
        {searchable && (
          <Field
            label="Search"
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCapitalize="none"
            textContentType={searchTextContentType}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        )}
        {!matches.length && (
          <Body muted>No matching options. Try another name.</Body>
        )}
        {matches.map((option) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={option}
            accessibilityState={{ selected: value === option }}
            key={option}
            onPress={() => {
              onChange(option);
              setOpen(false);
            }}
            style={({ pressed }) => [
              s.row,
              {
                minHeight: 52,
                paddingVertical: 14,
                paddingHorizontal: 12,
                borderRadius: radius.input,
                gap: 12,
                backgroundColor:
                  value === option
                    ? C.blueSoft
                    : pressed
                      ? C.white
                      : "transparent",
              },
            ]}
          >
            <Text style={[s.body, { flex: 1 }]}>{option}</Text>
            {value === option && (
              <Icon name="checkmark-circle" color={C.blue} />
            )}
          </Pressable>
        ))}
      </Sheet>
    </>
  );
}

/** Validation target for a composite control, such as adding a missing family member. */
export function FormAnchor({
  fieldId,
  error,
  label = "Needs your attention",
  children,
}: PropsWithChildren<{ fieldId: string; error?: string; label?: string }>) {
  const wrapper = useRef<View>(null);
  const errorLabel = useRef<Text>(null);
  useFormControl(fieldId, {
    node: () => wrapper.current,
    accessibilityNode: () => errorLabel.current,
    label: () => label,
    error: () => error,
    isTextInput: () => false,
  });
  return (
    <View
      ref={wrapper}
      collapsable={false}
      accessible={false}
      style={[
        { gap: spacing.sm },
        error && {
          borderWidth: 1.5,
          borderColor: C.red,
          padding: spacing.md,
          borderRadius: radius.input,
        },
      ]}
    >
      {children}
      {error && (
        <Text
          ref={errorLabel}
          accessibilityRole="alert"
          accessibilityLabel={`${label}. ${error}`}
          style={[s.small, { color: C.red }]}
        >
          {error}
        </Text>
      )}
    </View>
  );
}

export function Notice({
  title,
  children,
  icon = "information-circle-outline",
  tone = "warm",
}: PropsWithChildren<{
  title: string;
  icon?: IconName;
  tone?: "warm" | "blue" | "green" | "red";
}>) {
  const color =
    tone === "blue"
      ? C.blue
      : tone === "green"
        ? C.green
        : tone === "red"
          ? C.red
          : C.amber;
  const backgroundColor =
    tone === "blue"
      ? C.blueSoft
      : tone === "green"
        ? C.successBg
        : tone === "red"
          ? C.dangerSoft
          : C.warm;
  return (
    <View style={[s.notice, { backgroundColor }]}>
      <Icon name={icon} size={22} color={color} />
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={[s.fieldLabel, { color }]}>{title}</Text>
        <Text style={[s.small, { color }]}>{children}</Text>
      </View>
    </View>
  );
}
export function Empty({
  icon,
  title,
  children,
}: PropsWithChildren<{ icon: IconName; title: string }>) {
  return (
    <View
      style={{
        alignItems: "center",
        paddingVertical: spacing.xxl,
        gap: spacing.lg,
      }}
    >
      <View style={s.emptyIcon}>
        <Icon name={icon} size={32} color={C.blue} />
      </View>
      <Text
        accessibilityRole="header"
        style={[s.title, { textAlign: "center" }]}
      >
        {title}
      </Text>
      <Text
        style={[s.body, { textAlign: "center", color: C.muted, maxWidth: 350 }]}
      >
        {children}
      </Text>
    </View>
  );
}

export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label?: string;
}) {
  const reduced = useReducedMotion();
  const progress = useRef(
    new Animated.Value(Math.max(0, Math.min(1, value))),
  ).current;
  const normalized = Math.max(0, Math.min(1, value));
  useEffect(() => {
    Animated.timing(progress, {
      toValue: normalized,
      duration: reduced ? 0 : motion.standard,
      useNativeDriver: false,
    }).start();
  }, [progress, normalized, reduced]);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? "Preparation progress"}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(normalized * 100),
      }}
      style={{ gap: 8 }}
    >
      {label && (
        <Text style={[s.small, { fontWeight: "600", color: C.navy }]}>
          {label}
        </Text>
      )}
      <View
        style={{
          height: 6,
          backgroundColor: "#DCE5F3",
          borderRadius: radius.pill,
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={{
            width: progress.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "100%"],
            }),
            height: "100%",
            borderRadius: radius.pill,
            backgroundColor: normalized === 1 ? C.green : C.blue,
          }}
        />
      </View>
    </View>
  );
}
export function ProgressSteps({
  steps,
  current,
  completed = [],
  onSelect,
  testIDs,
  compact = false,
}: {
  steps: string[];
  current: number;
  completed?: number[];
  onSelect?: (index: number) => void;
  testIDs?: string[];
  compact?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {steps.map((step, index) => {
        const done = completed.includes(index);
        const selected = index === current;
        return (
          <Pressable
            key={`${index}-${step}`}
            accessibilityRole={onSelect ? "button" : "text"}
            testID={testIDs?.[index]}
            accessibilityLabel={`Step ${index + 1}: ${step}`}
            accessibilityHint={`${index + 1} of ${steps.length}, ${done ? "complete" : selected ? "current" : "upcoming"}`}
            accessibilityState={{ selected }}
            disabled={!onSelect}
            onPress={() => onSelect?.(index)}
            style={({ pressed }) => [
              {
                flex: 1,
                minHeight: compact ? 44 : 70,
                padding: compact ? 6 : 10,
                borderRadius: radius.input,
                flexDirection: compact ? "row" : "column",
                alignItems: compact ? "center" : "flex-start",
                gap: compact ? 6 : 8,
                backgroundColor: selected ? C.blueSoft : "transparent",
                borderColor: selected ? "#C7D9FF" : C.line,
                borderWidth: compact ? 0 : 1,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View
              style={{
                width: 25,
                height: 25,
                flexShrink: 0,
                borderRadius: 13,
                backgroundColor: done
                  ? C.successBg
                  : selected
                    ? C.blue
                    : C.white,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {done ? (
                <Icon name="checkmark" color={C.green} size={17} />
              ) : (
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: selected ? C.white : C.muted,
                  }}
                >
                  {index + 1}
                </Text>
              )}
            </View>
            <Text
              style={{
                fontSize: 12,
                lineHeight: 17,
                fontWeight: "600",
                flexShrink: 1,
                color: selected ? C.blue : done ? C.green : C.muted,
              }}
            >
              {step}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ScrollSurface({
  children,
  form,
  wide,
  footer,
  scrollRef,
  bottomInset = 0,
  sheet = false,
}: PropsWithChildren<{
  form: FormNavigation;
  wide?: boolean;
  footer?: React.ReactNode;
  scrollRef?: React.RefObject<ScrollView | null>;
  bottomInset?: number;
  sheet?: boolean;
}>) {
  return (
    <FormNavigationContext.Provider value={form}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View ref={form.viewportRef} collapsable={false} style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            ref={(node) => {
              form.scrollRef.current = node;
              if (scrollRef) scrollRef.current = node;
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            removeClippedSubviews={false}
            scrollEventThrottle={16}
            onScroll={(event) =>
              form.setScrollOffset(event.nativeEvent.contentOffset.y)
            }
            contentContainerStyle={{
              paddingHorizontal: spacing.xl,
              paddingTop: sheet ? spacing.sm : spacing.xxl,
              paddingBottom: spacing.section + (footer ? 0 : bottomInset),
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: "100%",
                maxWidth: wide ? 1080 : 720,
                gap: spacing.xxl,
              }}
            >
              {children}
            </View>
          </ScrollView>
        </View>
        {footer && (
          <View
            style={[
              s.stickyFooter,
              { paddingBottom: Math.max(bottomInset, spacing.md) },
            ]}
          >
            <View style={{ width: "100%", maxWidth: wide ? 1080 : 720 }}>
              {footer}
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </FormNavigationContext.Provider>
  );
}
export function Screen({
  children,
  wide = false,
  scrollRef,
  form,
  footer,
}: PropsWithChildren<{
  wide?: boolean;
  scrollRef?: React.RefObject<ScrollView | null>;
  form?: FormNavigation;
  footer?: React.ReactNode;
}>) {
  const localForm = useFormNavigation();
  return (
    <ScrollSurface
      form={form ?? localForm}
      wide={wide}
      scrollRef={scrollRef}
      footer={footer}
    >
      {children}
    </ScrollSurface>
  );
}
export function Sheet({
  visible,
  title,
  children,
  onClose,
  onDismiss,
  form,
  footer,
}: PropsWithChildren<{
  visible: boolean;
  title: string;
  onClose: () => void;
  onDismiss?: () => void;
  form?: FormNavigation;
  footer?: React.ReactNode;
}>) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const localForm = useFormNavigation();
  return (
    <Modal
      visible={visible}
      animationType={reduced ? "none" : "slide"}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onDismiss={onDismiss}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: C.bg,
          paddingTop: Platform.OS === "ios" ? 18 : insets.top,
        }}
      >
        <View
          style={[
            s.row,
            {
              paddingHorizontal: spacing.xl,
              paddingBottom: spacing.lg,
              gap: spacing.md,
            },
          ]}
        >
          <Text accessibilityRole="header" style={[s.title, { flex: 1 }]}>
            {title}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            hitSlop={4}
            style={s.close}
          >
            <Icon name="close" size={22} />
          </Pressable>
        </View>
        <ScrollSurface
          form={form ?? localForm}
          footer={footer}
          bottomInset={insets.bottom}
          sheet
        >
          {children}
        </ScrollSurface>
      </View>
    </Modal>
  );
}
export async function openOfficial(url: string) {
  try {
    await WebBrowser.openBrowserAsync(url, {
      toolbarColor: C.navy,
      controlsColor: C.white,
    });
  } catch {
    Alert.alert(
      "Could not open website",
      "Please check your connection and try again.",
    );
  }
}
export function LinkRow({
  title,
  detail,
  url,
  icon = "globe-outline",
}: {
  title: string;
  detail?: string;
  url: string;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={title}
      onPress={() => void openOfficial(url)}
      style={({ pressed }) => [
        s.row,
        {
          minHeight: 48,
          paddingVertical: 8,
          gap: 12,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Icon name={icon} color={C.blue} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.fieldLabel}>{title}</Text>
        {detail && <Text style={s.small}>{detail}</Text>}
      </View>
      <Icon name="open-outline" size={18} color={C.muted} />
    </Pressable>
  );
}
export const s = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: C.line,
    padding: spacing.xl,
    gap: spacing.xl,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { ...typography.title, color: C.navy },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 25,
    letterSpacing: -0.2,
    fontWeight: "700",
    color: C.navy,
  },
  body: { ...typography.body, color: C.navy },
  small: { ...typography.detail, color: C.muted },
  label: { ...typography.label, color: C.blue, textTransform: "uppercase" },
  fieldLabel: { ...typography.field, color: C.navy },
  input: {
    backgroundColor: C.white,
    borderColor: C.inputLine,
    borderWidth: 1,
    borderRadius: radius.input,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 16,
    lineHeight: 23,
    color: C.navy,
    minHeight: 54,
  },
  button: {
    minHeight: 54,
    borderRadius: radius.button,
    paddingHorizontal: spacing.lg,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  buttonText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "center",
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: C.warm,
    borderRadius: radius.button,
    padding: spacing.lg,
    gap: 10,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.card,
    backgroundColor: C.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  close: {
    width: 44,
    height: 44,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  stickyFooter: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.line,
    alignItems: "center",
  },
  keyboardToolbar: {
    backgroundColor: "#F7F9FC",
    borderTopWidth: 1,
    borderTopColor: C.line,
    alignItems: "flex-end",
  },
});
