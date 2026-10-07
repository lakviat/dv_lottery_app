import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Button, C, Icon, IconName, typography } from "./ui";
import { APP_NAME, BrandMark } from "./Brand";

const pages = [
  {
    eyebrow: `WELCOME TO ${APP_NAME.toUpperCase()}`,
    title: "Your DV journey,\nsimplified.",
    body: "Prepare your entry and keep your history together. No sign-up, no password. Start whenever you’re ready.",
    note: "A quick look around. Go at your own pace, or skip straight to the app.",
    icon: "sparkles-outline" as IconName,
  },
  {
    eyebrow: "PREPARE AT YOUR OWN PACE",
    title: "One small step\nat a time.",
    body: "Add your details, include your family, and get a photo ready for each person. Your draft saves as you go.",
    note: "You can leave and come back to your preparation anytime.",
    icon: "document-text-outline" as IconName,
  },
  {
    eyebrow: "KEEP YOUR JOURNEY TOGETHER",
    title: "Prepare. Submit.\nKeep track.",
    body: "Complete your entry on the official website, then save your confirmation here. Check official results and record your updates.",
    note: "Saving a draft is not an official submission. Updates in the app are recorded by you.",
    icon: "albums-outline" as IconName,
  },
  {
    eyebrow: "PRIVATE BY DEFAULT",
    title: "Your information.\nYour control.",
    body: "Your draft, photos and saved entries stay on this device unless you choose to share them. No account needed.",
    note: "Official websites handle information you enter there. Optional email alerts share only your email and consent. Keep a separate copy of your official confirmation.",
    icon: "shield-checkmark-outline" as IconName,
  },
];

function PreviewRow({
  icon,
  title,
  detail,
  complete = false,
}: {
  icon: IconName;
  title: string;
  detail: string;
  complete?: boolean;
}) {
  return (
    <View style={styles.previewRow}>
      <View style={styles.smallIcon}>
        <Icon name={icon} size={20} color={C.blue} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.previewTitle}>{title}</Text>
        <Text style={styles.previewDetail}>{detail}</Text>
      </View>
      <Icon
        name={complete ? "checkmark-circle" : "chevron-forward"}
        size={complete ? 21 : 17}
        color={complete ? C.green : C.muted}
      />
    </View>
  );
}

function Illustration({ page, compact }: { page: number; compact: boolean }) {
  if (compact)
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.compactArt}
      >
        {page === 0 ? (
          <BrandMark size={44} />
        ) : (
          <Icon name={pages[page].icon} size={38} color={C.blue} />
        )}
        <Text style={styles.compactText}>
          {
            [
              "No sign-up required",
              "Details · Family · Photos",
              "Your confirmation, close by",
              "Stored on this device",
            ][page]
          }
        </Text>
      </View>
    );
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.art}
    >
      <View style={styles.orbit} />
      {page === 0 && (
        <LinearGradient colors={["#1C3E65", C.navy]} style={styles.welcomeArt}>
          <BrandMark size={78} />
          <Text style={styles.welcomeName}>{APP_NAME}</Text>
          <View style={styles.welcomePill}>
            <Icon name="checkmark-circle" size={17} color="#BFDCD6" />
            <Text style={styles.welcomePillText}>No sign-up required</Text>
          </View>
        </LinearGradient>
      )}
      {page === 1 && (
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewLabel}>YOUR PREPARATION</Text>
            <Text style={styles.example}>PREVIEW</Text>
          </View>
          <PreviewRow
            icon="person-outline"
            title="Your details"
            detail="A little about you"
            complete
          />
          <PreviewRow
            icon="people-outline"
            title="Your family"
            detail="Everyone who belongs"
            complete
          />
          <PreviewRow
            icon="camera-outline"
            title="Your photos"
            detail="One for each person"
          />
        </View>
      )}
      {page === 2 && (
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewLabel}>MY ENTRIES</Text>
            <Text style={styles.example}>PREVIEW</Text>
          </View>
          <View style={styles.confirmation}>
            <Icon name="bookmark-outline" size={28} color={C.blue} />
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={styles.previewTitle}>Confirmation saved</Text>
              <Text style={styles.previewDetail}>•••• •••• •••• ••••</Text>
            </View>
          </View>
          <PreviewRow
            icon="globe-outline"
            title="Check official results"
            detail="On the government website"
          />
          <PreviewRow
            icon="create-outline"
            title="Record your update"
            detail="Keep your own timeline"
          />
        </View>
      )}
      {page === 3 && (
        <View style={styles.privacyArt}>
          <View style={styles.shield}>
            <Icon name="shield-checkmark-outline" size={72} color={C.navy} />
          </View>
          <View style={styles.privacyPill}>
            <Icon name="phone-portrait-outline" size={20} color={C.green} />
            <Text style={styles.previewTitle}>Stored on this device</Text>
          </View>
          <Text style={styles.previewDetail}>You choose what to share.</Text>
        </View>
      )}
    </View>
  );
}

export function WelcomeTour({ onExit }: { onExit: () => void }) {
  const [page, setPage] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const { height, fontScale } = useWindowDimensions();
  const content = pages[page];
  const last = page === pages.length - 1;
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    AccessibilityInfo.announceForAccessibility(
      `Page ${page + 1} of ${pages.length}. ${pages[page].title.replace("\n", " ")}`,
    );
  }, [page]);

  return (
    <Modal
      visible
      presentationStyle="fullScreen"
      supportedOrientations={[
        "portrait",
        "portrait-upside-down",
        "landscape-left",
        "landscape-right",
      ]}
      animationType="none"
      onRequestClose={onExit}
    >
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable
            testID="tour-skip"
            accessibilityRole="button"
            accessibilityLabel={last ? "End tour" : "Skip tour"}
            onPress={onExit}
            style={({ pressed }) => [
              styles.skip,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Icon name="close" size={19} color={C.blue} />
            <Text style={styles.skipText}>
              {last ? "End tour" : "Skip tour"}
            </Text>
          </Pressable>
          <Text
            testID={`tour-page-${page + 1}`}
            accessibilityLabel={`Page ${page + 1} of ${pages.length}`}
            style={styles.pageCount}
          >
            {page + 1} of {pages.length}
          </Text>
        </View>
        <ScrollView
          ref={scroll}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Illustration
              page={page}
              compact={height < 700 || fontScale > 1.4}
            />
            <View style={styles.copy}>
              <Text style={styles.eyebrow}>{content.eyebrow}</Text>
              <Text accessibilityRole="header" style={styles.title}>
                {content.title}
              </Text>
              <Text style={styles.body}>{content.body}</Text>
              <Text style={styles.note}>{content.note}</Text>
            </View>
          </View>
        </ScrollView>
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <View style={styles.footerContent}>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={styles.dots}
            >
              {pages.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === page && styles.activeDot]}
                />
              ))}
            </View>
            <View style={styles.actions}>
              {page > 0 && (
                <Pressable
                  testID="tour-back"
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                  onPress={() => setPage((p) => Math.max(0, p - 1))}
                  style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}
                >
                  <Icon name="chevron-back" size={18} />
                  <Text style={styles.backText}>Back</Text>
                </Pressable>
              )}
              <View style={{ flex: 1 }}>
                <Button
                  testID="tour-next"
                  title={last ? "Get started" : "Next"}
                  icon={last ? "checkmark" : "arrow-forward"}
                  onPress={() =>
                    last
                      ? onExit()
                      : setPage((p) => Math.min(pages.length - 1, p + 1))
                  }
                />
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: {
    width: "100%",
    maxWidth: 660,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
  },
  skip: {
    minHeight: 44,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  skipText: { fontSize: 15, fontWeight: "600", color: C.blue },
  pageCount: { ...typography.detail, color: C.muted, paddingRight: 8 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 26,
    paddingVertical: 18,
  },
  content: { width: "100%", maxWidth: 500, gap: 30 },
  art: {
    minHeight: 242,
    width: "100%",
    maxWidth: 355,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  orbit: {
    position: "absolute",
    width: 224,
    height: 224,
    borderRadius: 112,
    backgroundColor: "#E5ECF5",
    borderWidth: 1,
    borderColor: "#DCE5F0",
  },
  welcomeArt: {
    width: "100%",
    alignItems: "center",
    padding: 24,
    gap: 12,
    borderRadius: 25,
  },
  welcomeName: {
    fontSize: 24,
    textAlign: "center",
    fontWeight: "700",
    letterSpacing: -0.5,
    color: C.white,
  },
  welcomePill: {
    borderRadius: 20,
    backgroundColor: "#2D4A6B",
    paddingHorizontal: 13,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  welcomePillText: { fontSize: 13, fontWeight: "600", color: C.white },
  previewCard: {
    width: "100%",
    borderRadius: 22,
    backgroundColor: C.white,
    padding: 20,
    gap: 17,
    borderWidth: 1,
    borderColor: C.line,
    boxShadow: "0 8px 24px rgba(16, 41, 74, 0.06)",
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
    color: C.muted,
  },
  example: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.8,
    color: C.blue,
    backgroundColor: "#ECF1F7",
    padding: 5,
    borderRadius: 5,
  },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  smallIcon: {
    width: 37,
    height: 37,
    borderRadius: 11,
    backgroundColor: "#EDF2F8",
    alignItems: "center",
    justifyContent: "center",
  },
  previewTitle: { fontSize: 14, fontWeight: "600", color: C.navy },
  previewDetail: { fontSize: 12, color: C.muted, lineHeight: 17 },
  confirmation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  privacyArt: { alignItems: "center", gap: 17, paddingVertical: 15 },
  shield: {
    width: 118,
    height: 118,
    borderRadius: 38,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  privacyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: C.white,
  },
  compactArt: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    padding: 18,
    backgroundColor: "#E8EEF6",
    borderRadius: 20,
    width: "100%",
  },
  compactText: { flex: 1, fontSize: 15, fontWeight: "600", color: C.navy },
  copy: { gap: 15, alignItems: "center" },
  eyebrow: {
    ...typography.label,
    textAlign: "center",
    color: C.blue,
  },
  title: {
    ...typography.page,
    color: C.navy,
    textAlign: "center",
  },
  body: { fontSize: 17, lineHeight: 25, color: C.navy, textAlign: "center" },
  note: { ...typography.detail, color: C.muted, textAlign: "center" },
  footer: { paddingHorizontal: 26, paddingTop: 15, backgroundColor: C.bg },
  footerContent: { maxWidth: 500, width: "100%", alignSelf: "center", gap: 21 },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#CFD9E7" },
  activeDot: { width: 25, backgroundColor: C.blue },
  actions: { flexDirection: "row", alignItems: "center", gap: 15 },
  back: {
    minHeight: 50,
    paddingRight: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  backText: { fontSize: 15, fontWeight: "600", color: C.navy },
});
