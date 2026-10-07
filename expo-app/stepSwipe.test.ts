import test from "node:test";
import assert from "node:assert/strict";
import { adjacentStep, createStepSwipe } from "./stepSwipe";

const start = { x: 180, width: 390, editing: false, screenReader: false, touches: 1 };
const left = { dx: -100, dy: 8, numberActiveTouches: 1 };

test("deliberate left and right swipes navigate exactly one neighboring step", () => {
  const swipe = createStepSwipe();
  swipe.begin(start);
  assert.equal(swipe.shouldClaim(left), true);
  assert.equal(swipe.finish(0, 3, left), 1);
  swipe.begin(start);
  const right = { ...left, dx: 100 };
  assert.equal(swipe.shouldClaim(right), true);
  assert.equal(swipe.finish(2, 3, right), 1);
  assert.equal(swipe.finish(1, 3, right), undefined);
});

test("taps, short drags, diagonal drags and boundaries do not navigate", () => {
  for (const movement of [{ dx: 0, dy: 0 }, { dx: -40, dy: 4 }, { dx: -100, dy: 50 }]) {
    const swipe = createStepSwipe();
    swipe.begin(start);
    swipe.shouldClaim({ ...movement, numberActiveTouches: 1 });
    assert.equal(swipe.finish(1, 3, movement), undefined);
  }
  assert.equal(adjacentStep(0, 3, 100), undefined);
  assert.equal(adjacentStep(2, 3, -100), undefined);
  assert.equal(adjacentStep(1, 3, 0), undefined);
});

test("a vertical scroll cannot turn into step navigation later in the gesture", () => {
  const swipe = createStepSwipe();
  swipe.begin(start);
  assert.equal(swipe.shouldClaim({ dx: 5, dy: 20, numberActiveTouches: 1 }), false);
  assert.equal(swipe.shouldClaim(left), false);
  assert.equal(swipe.finish(1, 3, left), undefined);
  swipe.begin(start);
  assert.equal(swipe.shouldClaim(left), true);
});

test("edge, keyboard, screen-reader and multi-touch gestures remain with native controls", () => {
  for (const overrides of [
    { x: 12 }, { x: 380 }, { editing: true }, { screenReader: true }, { touches: 2 },
  ]) {
    const swipe = createStepSwipe();
    swipe.begin({ ...start, ...overrides });
    assert.equal(swipe.shouldClaim(left), false);
    assert.equal(swipe.finish(1, 3, left), undefined);
  }
  const swipe = createStepSwipe();
  swipe.begin(start);
  swipe.shouldClaim({ ...left, numberActiveTouches: 2 });
  assert.equal(swipe.shouldClaim(left), false);
});

test("touches on inputs/actions and terminated gestures cannot change steps", () => {
  const swipe = createStepSwipe();
  swipe.begin(start);
  swipe.block();
  assert.equal(swipe.shouldClaim(left), false);
  assert.equal(swipe.finish(1, 3, left), undefined);
});

test("capture and release thresholds are enforced in both directions", () => {
  for (const direction of [-1, 1]) {
    const swipe = createStepSwipe();
    swipe.begin(start);
    assert.equal(swipe.shouldClaim({ dx: 21 * direction, dy: 0, numberActiveTouches: 1 }), false);
    assert.equal(swipe.shouldClaim({ dx: 22 * direction, dy: 0, numberActiveTouches: 1 }), true);
    assert.equal(swipe.finish(1, 3, { dx: 47 * direction, dy: 0 }), undefined);
    swipe.begin(start);
    swipe.shouldClaim({ dx: 48 * direction, dy: 0, numberActiveTouches: 1 });
    assert.equal(swipe.finish(1, 3, { dx: 48 * direction, dy: 0 }), direction < 0 ? 2 : 0);
  }
});

test("short horizontal flicks work in all four main-step directions", () => {
  for (const [current, dx, expected] of [[0, -28, 1], [1, 28, 0], [1, -28, 2], [2, 28, 1]]) {
    const swipe = createStepSwipe();
    swipe.begin(start);
    swipe.shouldClaim({ dx, dy: 3, numberActiveTouches: 1 });
    assert.equal(swipe.finish(current, 3, { dx, dy: 3, vx: Math.sign(dx) * 0.5 }), expected);
  }
});

test("velocity cannot override short, vertical, blocked or direction-reversing gestures", () => {
  for (const movement of [
    { dx: -23, dy: 0, vx: -1 },
    { dx: -28, dy: 3, vx: -0.44 },
    { dx: -28, dy: 3, vx: 1 },
    { dx: -28, dy: 20, vx: -2 },
  ]) {
    const swipe = createStepSwipe();
    swipe.begin(start);
    swipe.shouldClaim({ ...movement, numberActiveTouches: 1 });
    assert.equal(swipe.finish(1, 3, movement), undefined);
  }
});
