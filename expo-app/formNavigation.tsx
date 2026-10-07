import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  AccessibilityInfo,
  findNodeHandle,
  Keyboard,
  ScrollView,
  View,
} from "react-native";
import { firstInvalidField, FormErrors } from "./formValidation";

export type { FormErrors } from "./formValidation";
type Measurable = React.ElementRef<typeof View>;
type Control = {
  node: () => Measurable | null;
  accessibilityNode: () => Measurable | null;
  label: () => string;
  error: () => string | undefined;
  focus?: () => void;
  isTextInput: () => boolean;
};
export type FormNavigation = {
  scrollRef: React.RefObject<ScrollView | null>;
  viewportRef: React.RefObject<View | null>;
  setScrollOffset: (y: number) => void;
  register: (id: string, control: Control) => () => void;
  focusFirst: (errors?: FormErrors) => void;
  focusField: (id: string) => void;
  focusNext: (id: string, nextFieldId?: string) => void;
  hasNext: (id: string, nextFieldId?: string) => boolean;
  reveal: (id: string) => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => number;
};
export const FormNavigationContext = createContext<FormNavigation | null>(null);

/** One controller per scroll surface. Sheets always establish a new scope. */
export function useFormNavigation(): FormNavigation {
  const scrollRef = useRef<ScrollView>(null);
  const viewportRef = useRef<View>(null);
  const controls = useRef(new Map<string, Control>());
  const subscribers = useRef(new Set<() => void>());
  const registryVersion = useRef(0);
  const offset = useRef(0);
  const active = useRef<string | undefined>(undefined);
  const reducedMotion = useRef(true);
  const mounted = useRef(true);
  const scheduled = useRef<number | undefined>(undefined);
  const focusRequest = useRef(0);
  const controller = useMemo<FormNavigation>(() => {
    const notifyRegistry = () => {
      registryVersion.current += 1;
      subscribers.current.forEach((listener) => listener());
    };
    const revealControl = (id: string, alignToTop = false) => {
      const control = controls.current.get(id);
      const node = control?.node();
      const scroll = scrollRef.current;
      const viewport = viewportRef.current;
      if (!node || !scroll || !viewport) return;
      node.measureInWindow((_x, fieldY, _w, fieldHeight) => {
        viewport.measureInWindow((_sx, viewportY, _sw, viewportHeight) => {
          if (!mounted.current || active.current !== id || viewportHeight <= 0) return;
          const top = fieldY - viewportY;
          const bottom = top + fieldHeight;
          const inset = 18;
          const delta =
            alignToTop || top < inset
              ? top - inset
              : bottom > viewportHeight - inset
                ? Math.min(top - inset, bottom - viewportHeight + inset)
                : 0;
          if (delta)
            scroll.scrollTo({
              y: Math.max(0, offset.current + delta),
              animated: !reducedMotion.current,
            });
        });
      });
    };
    const focus = (id: string, error?: string) => {
      const control = controls.current.get(id);
      if (!control) return;
      active.current = id;
      revealControl(id, !!error);
      if (control.isTextInput()) control.focus?.();
      else {
        Keyboard.dismiss();
        const node = control.accessibilityNode();
        const handle = node ? findNodeHandle(node) : null;
        if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
      }
      if (error)
        AccessibilityInfo.announceForAccessibility(
          `${control.label()}. ${error}`,
        );
    };
    const nextControl = (id: string, nextFieldId?: string) => {
      if (nextFieldId && controls.current.has(nextFieldId)) return nextFieldId;
      const inputs = [...controls.current]
        .filter(([, value]) => value.isTextInput())
        .map(([key]) => key);
      const index = inputs.indexOf(id);
      return index >= 0 ? inputs[index + 1] : undefined;
    };
    return {
      scrollRef,
      viewportRef,
      setScrollOffset: (y) => {
        offset.current = y;
      },
      register: (id, control) => {
        controls.current.set(id, control);
        notifyRegistry();
        return () => {
          if (controls.current.get(id) === control) {
            controls.current.delete(id);
            notifyRegistry();
          }
          if (active.current === id) active.current = undefined;
        };
      },
      subscribe: (listener) => {
        subscribers.current.add(listener);
        return () => {
          subscribers.current.delete(listener);
        };
      },
      getSnapshot: () => registryVersion.current,
      reveal: (id) => {
        active.current = id;
        revealControl(id);
      },
      focusField: (id) => focus(id),
      hasNext: (id, next) => !!nextControl(id, next),
      focusNext: (id, next) => {
        const target = nextControl(id, next);
        if (target) focus(target);
        else {
          active.current = undefined;
          Keyboard.dismiss();
        }
      },
      focusFirst: (providedErrors) => {
        if (scheduled.current !== undefined) cancelAnimationFrame(scheduled.current);
        const request = ++focusRequest.current;
        // Commit inline errors first; don't wait for every offscreen native measure.
        scheduled.current = requestAnimationFrame(() => {
          scheduled.current = undefined;
          if (!mounted.current || request !== focusRequest.current) return;
          const errors =
            providedErrors ??
            Object.fromEntries(
              [...controls.current].map(([id, control]) => [id, control.error()]),
            );
          const first = firstInvalidField(errors, new Set(controls.current.keys()));
          if (first) {
            focus(first, errors[first]);
          } else {
            const firstError = Object.values(errors).find(Boolean);
            if (firstError)
              AccessibilityInfo.announceForAccessibility(firstError);
          }
        });
      },
    };
  }, []);
  useEffect(() => {
    mounted.current = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        reducedMotion.current = value;
      })
      .catch(() => {});
    const preference = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (value) => {
        reducedMotion.current = value;
      },
    );
    const keyboard = Keyboard.addListener("keyboardDidShow", () => {
      // KeyboardAvoidingView has resized the scroll area by the next frame.
      requestAnimationFrame(() => {
        if (active.current) controller.reveal(active.current);
      });
    });
    const keyboardFrame = Keyboard.addListener("keyboardDidChangeFrame", () => {
      requestAnimationFrame(() => {
        if (mounted.current && active.current) controller.reveal(active.current);
      });
    });
    return () => {
      mounted.current = false;
      focusRequest.current += 1;
      if (scheduled.current !== undefined) cancelAnimationFrame(scheduled.current);
      preference.remove();
      keyboard.remove();
      keyboardFrame.remove();
    };
  }, [controller]);
  return controller;
}

export function useFormControl(id: string, control: Control) {
  const form = useContext(FormNavigationContext);
  useSyncExternalStore(
    form?.subscribe ?? noSubscription,
    form?.getSnapshot ?? emptySnapshot,
    emptySnapshot,
  );
  const current = useRef(control);
  current.current = control;
  useEffect(
    () =>
      form?.register(id, {
        node: () => current.current.node(),
        accessibilityNode: () => current.current.accessibilityNode(),
        label: () => current.current.label(),
        error: () => current.current.error(),
        isTextInput: () => current.current.isTextInput(),
        focus: () => current.current.focus?.(),
      }),
    [id, form],
  );
  return form;
}

const noSubscription = (_listener: () => void) => () => {};
const emptySnapshot = () => 0;
