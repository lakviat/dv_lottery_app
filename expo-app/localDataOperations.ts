/** Coordinate owned photo files with exclusive whole-store deletion. */
export function createLocalDataOperations() {
  let photoOperations = 0;
  let clearing = false;
  return {
    isClearing: () => clearing,
    hasPhotoOperations: () => photoOperations > 0,
    beginPhotoOperation() {
      if (clearing) throw new Error("Local data is being cleared.");
      photoOperations += 1;
      let finished = false;
      return () => {
        if (!finished) {
          finished = true;
          photoOperations -= 1;
        }
      };
    },
    beginClear() {
      if (clearing || photoOperations > 0) return false;
      clearing = true;
      return true;
    },
    finishClear() {
      clearing = false;
    },
  };
}
