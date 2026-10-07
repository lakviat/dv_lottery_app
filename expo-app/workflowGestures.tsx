import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AccessibilityInfo,
  GestureResponderEvent,
  GestureResponderHandlers,
  Keyboard,
  PanResponder,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { adjacentStep, createStepSwipe } from "./stepSwipe";

const WorkflowGestureContext = createContext<{
  block: () => void;
  handlers: GestureResponderHandlers;
} | null>(null);
export const useBlockWorkflowSwipe = () => useContext(WorkflowGestureContext)?.block;
export const useWorkflowGestureHandlers = () => useContext(WorkflowGestureContext)?.handlers;

export function SwipeBlock({ children }: PropsWithChildren) {
  const block = useBlockWorkflowSwipe();
  return <View onTouchStart={block}>{children}</View>;
}

export function WorkflowSwipe({
  current,
  count,
  onSelect,
  children,
}: PropsWithChildren<{
  current: number;
  count: number;
  onSelect: (step: number) => void;
}>) {
  const { width } = useWindowDimensions();
  const [screenReader, setScreenReader] = useState(true);
  const latest = useRef({ current, count, onSelect, width, screenReader });
  latest.current = { current, count, onSelect, width, screenReader };
  const startingStep = useRef(current);
  const origin = useRef({ x: 0, y: 0 });
  const swipe = useMemo(createStepSwipe, []);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (mounted) setScreenReader(enabled);
    }).catch(() => {
      if (__DEV__) console.warn("Workflow swipes disabled: screen reader preference unavailable.");
    });
    const listener = AccessibilityInfo.addEventListener("screenReaderChanged", setScreenReader);
    return () => {
      mounted = false;
      listener.remove();
    };
  }, []);
  const responder = useMemo(() => {
    // PanResponder resets its dx/dy on grant; keep measuring from the original touch.
    const movement = (event: GestureResponderEvent) => ({
      dx: event.nativeEvent.pageX - origin.current.x,
      dy: event.nativeEvent.pageY - origin.current.y,
    });
    const editing = () => Keyboard.isVisible() || TextInput.State.currentlyFocusedInput() !== null;
    return PanResponder.create({
      onStartShouldSetPanResponderCapture: (event) => {
        const state = latest.current;
        startingStep.current = state.current;
        origin.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
        swipe.begin({
          x: event.nativeEvent.pageX,
          width: state.width,
          editing: editing(),
          screenReader: state.screenReader,
          touches: event.nativeEvent.touches.length,
        });
        return false;
      },
      onMoveShouldSetPanResponderCapture: (event, gesture) => {
        const state = latest.current;
        if (state.screenReader || editing())
          swipe.block();
        const delta = movement(event);
        return swipe.shouldClaim({ ...delta, numberActiveTouches: gesture.numberActiveTouches }) &&
          adjacentStep(state.current, state.count, delta.dx) !== undefined;
      },
      onPanResponderStart: (_event, gesture) => {
        if (gesture.numberActiveTouches !== 1) swipe.block();
      },
      onPanResponderMove: (event, gesture) => {
        swipe.shouldClaim({ ...movement(event), numberActiveTouches: gesture.numberActiveTouches });
      },
      onPanResponderRelease: (event, gesture) => {
        const state = latest.current;
        if (state.current !== startingStep.current || state.screenReader || editing()) swipe.block();
        const target = swipe.finish(state.current, state.count, {
          ...movement(event),
          vx: gesture.vx,
        });
        if (target !== undefined) state.onSelect(target);
      },
      onPanResponderReject: () => swipe.block(),
      onPanResponderTerminationRequest: () => true,
      onPanResponderTerminate: () => swipe.block(),
      onShouldBlockNativeResponder: () => false,
    });
  }, [swipe]);
  const context = useMemo(() => ({ block: swipe.block, handlers: responder.panHandlers }), [swipe, responder]);
  return (
    <WorkflowGestureContext.Provider value={context}>
      {children}
    </WorkflowGestureContext.Provider>
  );
}
