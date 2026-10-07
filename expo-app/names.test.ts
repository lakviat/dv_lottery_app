import test from "node:test";
import assert from "node:assert/strict";
import { canonicalPersonName } from "./names";

test("a name without a separate family name retains every token in the family field", () => {
  const name = { first: "  ALPHA BETA ", middle: " GAMMA DELTA ", last: " " };
  const before = structuredClone(name);
  const result = canonicalPersonName(name);
  assert.deepEqual(result, {
    first: "", middle: "", last: "ALPHA BETA GAMMA DELTA", oneLegalName: true,
  });
  assert.deepEqual(name, before);
  assert.deepEqual(canonicalPersonName(result), result);
});

test("canonical single names and separate family names are not rearranged", () => {
  assert.deepEqual(canonicalPersonName({ first: "", middle: "", last: "ALPHA BETA" }), {
    first: "", middle: "", last: "ALPHA BETA", oneLegalName: true,
  });
  const name = { first: "ALPHA BETA", middle: "GAMMA", last: "DELTA EPSILON" };
  assert.deepEqual(canonicalPersonName(name), { ...name, oneLegalName: false });
});

test("empty name fields do not create a legal name", () => {
  assert.deepEqual(canonicalPersonName({ first: " ", middle: "", last: "" }), {
    first: "", middle: "", last: "", oneLegalName: false,
  });
});
