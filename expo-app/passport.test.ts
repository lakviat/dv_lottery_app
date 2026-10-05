import test from "node:test";
import assert from "node:assert/strict";
import { applyPassport, mrzCheckDigit, parsePassport } from "./passport";
import { makeDraft, makePerson } from "./models";

// Public ICAO specimen: fictional Utopia passport, never a user's document.
const first = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<";
const second = "L898902C36UTO7408122F1204159ZE184226B<<<<<10";

test("TD3 specimen extracts names and passport fields with all check digits", () => {
  const p = parsePassport(["Unrelated heading", first, second], "2026-10-05");
  assert.deepEqual(p, {
    first: "ANNA",
    middle: "MARIA",
    last: "ERIKSSON",
    dob: "1974-08-12",
    sex: "Female",
    number: "L898902C3",
    issuer: "UTO",
    nationality: "UTO",
    expires: "2012-04-15",
  });
  assert.equal(mrzCheckDigit("L898902C3"), "6");
});
test("damaged, cropped, invalid dates and unsupported documents fail without partial autofill", () => {
  for (const lines of [
    [],
    [first],
    [first.slice(1), second],
    [first, second.slice(0, 43)],
    [first, second.replace("L898902C3", "L898902C4")],
    [first, second.slice(0, 43) + "1"],
    [first.replace(/^P/, "I"), second],
  ]) {
    assert.throws(() => parsePassport(lines), /couldn’t read/);
  }
  const invalidDate = "990230";
  let s =
    second.slice(0, 13) +
    invalidDate +
    mrzCheckDigit(invalidDate) +
    second.slice(20, 43);
  s += mrzCheckDigit(s.slice(0, 10) + s.slice(13, 20) + s.slice(21, 43));
  assert.throws(() => parsePassport([first, s]), /couldn’t read/);
});
test("OCR whitespace, duplicated lines, and numeric O confusion are handled conservatively", () => {
  assert.equal(
    parsePassport([first.replace("UTO", "UT0"), second.replace("UTO", "UT0")])
      .nationality,
    "UTO",
  );
  assert.equal(
    parsePassport([first, first, second.replace("7408122", "74O8122")]).dob,
    "1974-08-12",
  );
  assert.equal(parsePassport([first + "\n" + second]).number, "L898902C3");
  assert.throws(
    () => parsePassport([first.replace("ANNA", "4NNA"), second]),
    /couldn’t read/,
  );
  assert.throws(
    () => parsePassport([first, first.replace("ANNA", "JANE"), second]),
    /More than one/,
  );
});
test("confirmed import preserves birthplace, eligibility, family, photos readiness and contact", () => {
  const d = makeDraft();
  d.people[0].city = "Existing birthplace";
  d.people[0].country = "Canada";
  d.eligibilityCountry = "Canada";
  d.email = "example@example.com";
  d.people.push(makePerson("Child"));
  d.reviewed = true;
  const copy = structuredClone(d);
  const result = applyPassport(d, parsePassport([first, second]));
  assert.deepEqual(d, copy);
  assert.equal(result.people[0].country, "Canada");
  assert.equal(result.people[0].city, "Existing birthplace");
  assert.equal(result.eligibilityCountry, "Canada");
  assert.deepEqual(result.people[1], copy.people[1]);
  assert.equal(result.email, d.email);
  assert.equal(result.passport.number, "L898902C3");
  assert.equal(result.reviewed, false);
  assert.equal(result.passportReviewed, false);
  assert.equal(result.passportPlan, "");
});
