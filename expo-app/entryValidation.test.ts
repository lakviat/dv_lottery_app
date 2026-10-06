import test from "node:test";
import assert from "node:assert/strict";
import { entryFieldErrors, timelineFieldErrors } from "./entryValidation";
import { Entry } from "./models";
const now = new Date(2026, 9, 6);
const input = {
  name: "Example Applicant",
  surname: "Applicant",
  birthYear: "1990",
  year: "2027",
  confirmation: "2027ABCDEFGH1234",
  submitted: "2025-10-15",
};

test("entry form identifies every missing field in visual order", () => {
  const errors = entryFieldErrors(
    {
      name: " ",
      surname: "",
      birthYear: "",
      year: "",
      confirmation: "",
      submitted: "2026-02-30",
    },
    [],
    false,
    now,
  );
  assert.deepEqual(Object.keys(errors), [
    "name",
    "surname",
    "birthYear",
    "year",
    "confirmation",
    "submitted",
    "attested",
  ]);
});
test("entry form clears corrected fields and preserves valid existing entry rules", () => {
  assert.deepEqual(entryFieldErrors(input, [], true, now), {});
  assert.equal(
    entryFieldErrors({ ...input, year: "2029" }, [], true, now).year,
    "Enter the DV program year shown on your confirmation.",
  );
  assert.ok(
    entryFieldErrors({ ...input, submitted: "2026-10-07" }, [], true, now)
      .submitted,
  );
  assert.ok(
    entryFieldErrors(
      { ...input, confirmation: "2028ABCDEFGH1234" },
      [],
      true,
      now,
    ).confirmation,
  );
  assert.ok(
    entryFieldErrors({ ...input, birthYear: "2027" }, [], true, now).birthYear,
  );
});
test("duplicate records point to the confirmation and year instead of a generic alert", () => {
  const existing: Entry = {
    ...input,
    id: "existing",
    caseNumber: "",
    events: [],
  };
  const errors = entryFieldErrors(
    { ...input, name: " example applicant ", confirmation: "2027abcdefgh1234" },
    [existing],
    true,
    now,
  );
  assert.ok(errors.confirmation?.includes("already saved"));
  assert.ok(errors.year?.includes("already saved"));
});
test("timeline validation keeps submission-date bounds and attestation independent", () => {
  assert.ok(
    timelineFieldErrors("2025-10-14", input.submitted, true, now).eventDate,
  );
  assert.ok(
    timelineFieldErrors("2026-10-07", input.submitted, true, now).eventDate,
  );
  assert.ok(
    timelineFieldErrors("2026-02-30", input.submitted, true, now).eventDate,
  );
  assert.equal(
    timelineFieldErrors(input.submitted, input.submitted, true, now).eventDate,
    undefined,
  );
  assert.ok(
    timelineFieldErrors(input.submitted, input.submitted, false, now).checked,
  );
});
