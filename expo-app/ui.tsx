import React, { PropsWithChildren, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

export const C = {
  navy: "#10294A",
  blue: "#315E97",
  red: "#C53E49",
  bg: "#F4F6FA",
  muted: "#67778B",
  line: "#E3E8F0",
  white: "#FFFFFF",
  green: "#287564",
  warm: "#FCF5E6",
};
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
  return <Ionicons name={name} size={size} color={color} />;
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
  return <Text style={s.title}>{children}</Text>;
}
export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Stack({
  children,
  gap = 16,
}: PropsWithChildren<{ gap?: number }>) {
  return <View style={{ gap }}>{children}</View>;
}
export function Row({ children }: PropsWithChildren) {
  return <View style={s.row}>{children}</View>;
}
export function Badge({
  children,
  tone = "blue",
}: PropsWithChildren<{ tone?: "blue" | "green" | "warm" }>) {
  return (
    <View
      style={[
        s.badge,
        {
          backgroundColor:
            tone === "green" ? "#E6F2ED" : tone === "warm" ? C.warm : "#EAF0F8",
        },
      ]}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: tone === "green" ? C.green : C.blue,
        }}
      >
        {children}
      </Text>
    </View>
  );
}
export function Button({
  title,
  onPress,
  icon,
  secondary = false,
  danger = false,
  disabled = false,
  busy = false,
  testID,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  busy?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      testID={testID}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor: secondary ? "#EDF2F8" : danger ? C.red : C.navy,
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? C.navy : C.white} />
      ) : (
        icon && (
          <Icon name={icon} size={19} color={secondary ? C.navy : C.white} />
        )
      )}
      <Text style={[s.buttonText, { color: secondary ? C.navy : C.white }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  help,
  ...props
}: TextInputProps & { label: string; help?: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#8793A4"
        style={[
          s.input,
          props.multiline && { minHeight: 92, textAlignVertical: "top" },
        ]}
        autoCorrect={false}
        {...props}
      />
      {help && <Text style={s.small}>{help}</Text>}
    </View>
  );
}
export function Toggle({
  title,
  detail,
  value,
  onChange,
}: {
  title: string;
  detail?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={[s.row, { alignItems: "flex-start", gap: 14 }]}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.body}>{title}</Text>
        {detail && <Text style={s.small}>{detail}</Text>}
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: C.blue }}
      />
    </View>
  );
}
export function Select({
  label,
  value,
  options,
  onChange,
  searchable = false,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  return (
    <>
      <View style={{ gap: 7 }}>
        <Text style={s.fieldLabel}>{label}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value || "Choose"}`}
          onPress={() => {
            setQuery("");
            setOpen(true);
          }}
          style={[s.input, s.row]}
        >
          <Text
            style={{ flex: 1, fontSize: 16, color: value ? C.navy : C.muted }}
          >
            {value || "Choose…"}
          </Text>
          <Icon name="chevron-down" size={18} />
        </Pressable>
      </View>
      <Sheet visible={open} title={label} onClose={() => setOpen(false)}>
        {searchable && (
          <Field
            label="Search"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        )}
        {options
          .filter((o) => o.toLowerCase().includes(query.toLowerCase()))
          .map((option) => (
            <Pressable
              accessibilityRole="button"
              key={option}
              onPress={() => {
                onChange(option);
                setOpen(false);
              }}
              style={[
                s.row,
                {
                  paddingVertical: 15,
                  borderBottomWidth: 1,
                  borderBottomColor: C.line,
                },
              ]}
            >
              <Text style={[s.body, { flex: 1 }]}>{option}</Text>
              {value === option && (
                <Icon name="checkmark-circle" color={C.green} />
              )}
            </Pressable>
          ))}
      </Sheet>
    </>
  );
}
export function Notice({
  title,
  children,
  icon = "information-circle-outline",
}: PropsWithChildren<{ title: string; icon?: IconName }>) {
  return (
    <View style={s.notice}>
      <Icon name={icon} size={22} color="#8F6B26" />
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={[s.fieldLabel, { color: "#6B511E" }]}>{title}</Text>
        <Text style={[s.small, { color: "#796239" }]}>{children}</Text>
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
    <View style={{ alignItems: "center", paddingVertical: 22, gap: 14 }}>
      <View style={s.emptyIcon}>
        <Icon name={icon} size={32} color={C.blue} />
      </View>
      <Title>{title}</Title>
      <Text
        style={[s.body, { textAlign: "center", color: C.muted, maxWidth: 350 }]}
      >
        {children}
      </Text>
    </View>
  );
}
export function Screen({
  children,
  wide = false,
}: PropsWithChildren<{ wide?: boolean }>) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 32,
          alignItems: "center",
        }}
      >
        <View style={{ width: "100%", maxWidth: wide ? 1080 : 720, gap: 20 }}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export function Sheet({
  visible,
  title,
  children,
  onClose,
}: PropsWithChildren<{
  visible: boolean;
  title: string;
  onClose: () => void;
}>) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: C.bg,
          paddingTop: Platform.OS === "ios" ? 18 : insets.top,
        }}
      >
        <View style={[s.row, { paddingHorizontal: 22, paddingBottom: 18 }]}>
          <Text accessibilityRole="header" style={[s.title, { flex: 1 }]}>
            {title}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            hitSlop={12}
            style={s.close}
          >
            <Icon name="close" size={22} />
          </Pressable>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              padding: 22,
              paddingTop: 4,
              paddingBottom: insets.bottom + 30,
              alignItems: "center",
            }}
          >
            <View style={{ width: "100%", maxWidth: 720, gap: 18 }}>
              {children}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
      style={[s.row, { paddingVertical: 8, gap: 12 }]}
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
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.line,
    padding: 20,
    gap: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 21,
    fontWeight: "700",
    color: C.navy,
    letterSpacing: -0.4,
  },
  body: { fontSize: 15, lineHeight: 22, color: C.navy },
  small: { fontSize: 13, lineHeight: 19, color: C.muted },
  label: {
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: "800",
    color: C.muted,
    textTransform: "uppercase",
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
    color: C.navy,
  },
  input: {
    backgroundColor: "#F7F9FC",
    borderColor: C.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: C.navy,
    minHeight: 48,
  },
  button: {
    minHeight: 50,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "center",
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: C.warm,
    borderRadius: 15,
    padding: 16,
    gap: 10,
  },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 23,
    backgroundColor: "#EDF2F8",
    alignItems: "center",
    justifyContent: "center",
  },
  close: {
    width: 34,
    height: 34,
    backgroundColor: "#E9EEF5",
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
});
