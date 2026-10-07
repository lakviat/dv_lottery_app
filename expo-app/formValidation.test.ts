import test from "node:test";
import assert from "node:assert/strict";
import { firstInvalidField } from "./formValidation";

test("first invalid field follows screen order after conditional controls remount", () => {
  const registered = new Set(["education", "last", "first"]);
  assert.equal(
    firstInvalidField({ first: "Required", last: "Required", education: "Choose" }, registered),
    "first",
  );
});

test("correcting earlier fields guides the next attempt to education", () => {
  assert.equal(
    firstInvalidField({ first: undefined, education: "Choose education" }, new Set(["first", "education"])),
    "education",
  );
});

test("unmounted controls are not focused and valid forms have no target", () => {
  assert.equal(
    firstInvalidField({ removedChild: "Required", education: "Choose" }, new Set(["education"])),
    "education",
  );
  assert.equal(firstInvalidField({ education: undefined }, new Set(["education"])), undefined);
});
