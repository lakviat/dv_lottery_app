import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useReducedMotion } from "./motion";
import { colors, motion, radius, spacing, typography } from "./theme";
import { Icon } from "./ui";

type PreparationStepperProps = {
  steps: string[];
  current: number;
  completed: number[];
  onSelect: (index: number) => void;
};

function Connector({
  completed,
  index,
  reduced,
}: {
  completed: boolean;
  index: number;
  reduced: boolean;
}) {
  const progress = useRef(new Animated.Value(completed ? 1 : 0)).current;
  const previouslyCompleted = useRef(completed);

  useEffect(() => {
    const changed = completed !== previouslyCompleted.current;
    previouslyCompleted.current = completed;
    if (reduced || !changed) {
      progress.setValue(completed ? 1 : 0);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: completed ? 1 : 0,
      duration: motion.standard,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [completed, progress, reduced]);

  return (
    <View testID={`prepare-connector-${index}`} style={styles.connector}>
      <Animated.View
        testID={`prepare-connector-${index}-fill`}
        style={[
          StyleSheet.absoluteFill,
          styles.connectorFill,
          { transform: [{ scaleX: progress }] },
        ]}
      />
    </View>
  );
}

function Step({
  label,
  index,
  count,
  selected,
  completed,
  reduced,
  nodeSize,
  nodeRowHeight,
  onSelect,
}: {
  label: string;
  index: number;
  count: number;
  selected: boolean;
  completed: boolean;
  reduced: boolean;
  nodeSize: number;
  nodeRowHeight: number;
  onSelect: (index: number) => void;
}) {
  const checkAppearance = useRef(new Animated.Value(1)).current;
  const previouslyCompleted = useRef(completed);
  const activeAppearance = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    const animation = Animated.timing(activeAppearance, {
      toValue: selected ? 1 : 0,
      duration: reduced ? 0 : motion.short,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [activeAppearance, selected, reduced]);

  useEffect(() => {
    const justCompleted = completed && !previouslyCompleted.current;
    previouslyCompleted.current = completed;
    checkAppearance.setValue(1);
    if (reduced || !justCompleted) return;

    checkAppearance.setValue(0);
    const animation = Animated.timing(checkAppearance, {
      toValue: 1,
      duration: motion.short,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [checkAppearance, completed, reduced]);

  return (
    <Pressable
      testID={`prepare-step-${index}`}
      accessibilityRole="button"
      accessibilityLabel={`Step ${index + 1} of ${count}, ${label}, ${selected ? "current, " : ""}${completed ? "completed" : "not completed"}`}
      accessibilityState={{ selected }}
      accessibilityHint="Opens this step for editing."
      onPress={() => onSelect(index)}
      style={({ pressed }) => [
        styles.step,
        pressed && { opacity: 0.8 },
      ]}
    >
      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.nodeRow, { height: nodeRowHeight }]}
      >
        <Animated.View
          style={[
            styles.nodeRing,
            { width: nodeSize, height: nodeSize },
            selected && styles.selectedRing,
            { transform: [{ scale: activeAppearance.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }] },
          ]}
        >
          <View
            style={[
              styles.node,
              completed && styles.completedNode,
              selected && styles.selectedNode,
            ]}
          >
            {completed ? (
              <Animated.View
                testID={`prepare-step-${index}-checkmark`}
                style={{
                  opacity: checkAppearance.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.65, 1],
                  }),
                  transform: [
                    {
                      scale: checkAppearance.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.88, 1],
                      }),
                    },
                  ],
                }}
              >
                <Icon name="checkmark" size={20} color={colors.green} />
              </Animated.View>
            ) : (
              <Text style={[styles.number, selected && styles.selectedLabel]}>
                {index + 1}
              </Text>
            )}
          </View>
        </Animated.View>
      </View>
      <Text
        style={[
          styles.label,
          completed && styles.completedLabel,
          selected && styles.selectedLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function PreparationStepper({
  steps,
  current,
  completed,
  onSelect,
}: PreparationStepperProps) {
  const reduced = useReducedMotion();
  const { fontScale } = useWindowDimensions();
  const nodeSize = Math.max(
    36,
    Math.ceil(typography.detail.lineHeight * fontScale + spacing.lg),
  );
  const nodeRowHeight = Math.max(44, nodeSize + spacing.xs);

  if (steps.length === 0) return null;

  return (
    <View style={styles.container}>
      {steps.length > 1 && (
        <View
          testID="prepare-step-track"
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.trackRow, { top: nodeRowHeight / 2 - 1 }]}
        >
          <View style={styles.trackInset} />
          <View style={[styles.track, { flex: steps.length - 1 }]}>
            {steps.slice(0, -1).map((_, index) => (
              <Connector
                key={index}
                index={index}
                completed={completed.includes(index)}
                reduced={reduced}
              />
            ))}
          </View>
          <View style={styles.trackInset} />
        </View>
      )}
      <View style={styles.steps}>
        {steps.map((label, index) => (
          <Step
            key={index}
            label={label}
            index={index}
            count={steps.length}
            selected={current === index}
            completed={completed.includes(index)}
            reduced={reduced}
            nodeSize={nodeSize}
            nodeRowHeight={nodeRowHeight}
            onSelect={onSelect}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative" },
  steps: { flexDirection: "row" },
  trackRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
  },
  trackInset: { flex: 0.5 },
  track: {
    flexDirection: "row",
    height: 2,
    backgroundColor: colors.line,
  },
  connector: { flex: 1, overflow: "hidden" },
  connectorFill: {
    backgroundColor: colors.green,
    opacity: 0.6,
    transformOrigin: "left center",
  },
  step: {
    flex: 1,
    flexBasis: 0,
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
    borderRadius: radius.sm,
  },
  nodeRow: { alignItems: "center", justifyContent: "center" },
  nodeRing: {
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: radius.pill,
    padding: 2,
    backgroundColor: colors.white,
  },
  selectedRing: { borderColor: colors.blue },
  node: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
  },
  completedNode: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBg,
  },
  selectedNode: {
    backgroundColor: colors.blueSoft,
    borderColor: colors.blueBorder,
  },
  number: { ...typography.detail, color: colors.muted, fontWeight: "600" },
  label: {
    ...typography.detail,
    alignSelf: "stretch",
    textAlign: "center",
    color: colors.muted,
    fontWeight: "500",
  },
  completedLabel: { color: colors.navy },
  selectedLabel: { color: colors.blue, fontWeight: "700" },
});
