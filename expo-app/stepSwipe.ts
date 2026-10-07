type Movement = { dx: number; dy: number; vx?: number };
type TouchMovement = Movement & { numberActiveTouches: number };

export function adjacentStep(current: number, count: number, dx: number) {
  const next = current + (dx < 0 ? 1 : -1);
  return dx !== 0 && next >= 0 && next < count ? next : undefined;
}

/** Lock out vertical/interactive gestures until the next touch sequence. */
export function createStepSwipe() {
  let blocked = true;
  return {
    begin({ x, width, editing, screenReader, touches }: {
      x: number;
      width: number;
      editing: boolean;
      screenReader: boolean;
      touches: number;
    }) {
      blocked = editing || screenReader || touches !== 1 || x <= 24 || x >= width - 24;
    },
    block() {
      blocked = true;
    },
    shouldClaim({ dx, dy, numberActiveTouches }: TouchMovement) {
      if (numberActiveTouches !== 1 || (Math.abs(dy) >= 12 && Math.abs(dx) < Math.abs(dy) * 2))
        blocked = true;
      return !blocked && Math.abs(dx) >= 22 && Math.abs(dx) > Math.abs(dy) * 2;
    },
    finish(current: number, count: number, { dx, dy, vx = 0 }: Movement) {
      const flick = Math.abs(dx) >= 24 && Math.abs(vx) >= 0.45 && Math.sign(vx) === Math.sign(dx);
      const deliberate = !blocked && (Math.abs(dx) >= 48 || flick) &&
        Math.abs(dy) <= 28 && Math.abs(dx) > Math.abs(dy) * 2;
      blocked = true;
      return deliberate ? adjacentStep(current, count, dx) : undefined;
    },
  };
}
