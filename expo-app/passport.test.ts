import test from "node:test";
import assert from "node:assert/strict";
import {
  applyPassport,
  mrzCheckDigit,
  parsePassport,
  passportFieldCount,
  passportScanErrorMessage,
  unresolvedPassportCountries,
} from "./passport";
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

test("confirmed import maps nationality and issuer without inferring birthplace or eligibility", () => {
  const reading = parsePassport([first.replace("UTO", "KGZ"), second.replace("UTO", "KGZ")]);
  assert.equal(reading.issuer, "KGZ", "Parser retains source code for review");
  assert.equal(reading.nationality, "KGZ");
  assert.equal(passportFieldCount(reading), 9);
  const draft = makeDraft();
  const result = applyPassport(draft, reading);
  assert.equal(result.passport.issuer, "Kyrgyzstan");
  assert.equal(result.passport.nationality, "Kyrgyzstan");
  assert.equal(result.people[0].country, "");
  assert.equal(result.eligibilityCountry, "");
  assert.equal(result.people[0].first, "ANNA");
  assert.equal(result.people[0].middle, "MARIA");
  assert.equal(result.people[0].last, "ERIKSSON");
  assert.equal(result.people[0].dob, "1974-08-12");
  assert.equal(result.people[0].sex, "Female");
  assert.equal(result.passport.number, "L898902C3");
  assert.equal(result.passport.expires, "2012-04-15");
});

test("unknown nationality/authority or sex never erases user values during confirmed import", () => {
  const draft = makeDraft();
  draft.passport.issuer = "Canada";
  draft.passport.nationality = "France";
  draft.people[0].sex = "Female";
  draft.people[0].city = "Toronto";
  draft.people[0].country = "Canada";
  draft.education = "Master’s degree";
  draft.address = "Example existing address";
  const reading = { ...parsePassport([first, second]), sex: "" };
  assert.equal(passportFieldCount(reading), 6);
  const result = applyPassport(draft, reading);
  assert.equal(result.passport.issuer, "Canada");
  assert.equal(result.passport.nationality, "France");
  assert.equal(result.people[0].sex, "Female");
  assert.equal(result.people[0].city, "Toronto");
  assert.equal(result.people[0].country, "Canada");
  assert.equal(result.education, draft.education);
  assert.equal(result.address, draft.address);
});

test("reviewed human-readable country values use the same canonical mapping", () => {
  const reading = { ...parsePassport([first, second]), issuer: "Kyrgyz Republic", nationality: "KG" };
  const result = applyPassport(makeDraft(), reading);
  assert.equal(result.passport.issuer, "Kyrgyzstan");
  assert.equal(result.passport.nationality, "Kyrgyzstan");
});

test("only unresolved country fields require explicit keep-unchanged confirmation", () => {
  const reading = parsePassport([first, second]);
  assert.deepEqual(unresolvedPassportCountries(reading), [
    "issuing country",
    "nationality",
  ]);
  assert.deepEqual(
    unresolvedPassportCountries({
      ...reading,
      issuer: "Kyrgyz Republic",
      nationality: "kg",
    }),
    [],
  );
  assert.deepEqual(
    unresolvedPassportCountries({
      ...reading,
      issuer: "Korea",
      nationality: "CAN",
    }),
    ["issuing country"],
  );
  assert.deepEqual(
    unresolvedPassportCountries({
      ...reading,
      issuer: "DEU",
      nationality: "",
    }),
    ["nationality"],
  );
});

test("ambiguous countries do not replace manually edited countries on confirmed import", () => {
  const draft = makeDraft();
  draft.passport.issuer = "Canada";
  draft.passport.nationality = "Germany";
  const before = structuredClone(draft);
  const reading = {
    ...parsePassport([first, second]),
    issuer: "Congo",
    nationality: "Korea",
  };
  const result = applyPassport(draft, reading);
  assert.equal(result.passport.issuer, before.passport.issuer);
  assert.equal(result.passport.nationality, before.passport.nationality);
  assert.equal(passportFieldCount(reading), 7);
  assert.deepEqual(draft, before);
});

test("scan failures show actionable guidance without exposing native error details", () => {
  const fallback = passportScanErrorMessage(undefined);
  assert.match(fallback, /clear photo/);
  assert.match(fallback, /manually/);
  for (const error of [
    new Error("Native recognizer failure: internal diagnostic"),
    { message: "Native recognizer failure: internal diagnostic" },
    "Native recognizer failure: internal diagnostic",
    null,
  ]) {
    assert.equal(passportScanErrorMessage(error), fallback);
  }
  for (const [lines, message] of [
    [[], /both passport lines/],
    [[first, first.replace("ANNA", "JANE"), second], /More than one passport/],
  ] as [string[], RegExp][]) {
    assert.throws(
      () => parsePassport(lines),
      (error: unknown) => {
        assert.match(passportScanErrorMessage(error), message);
        return true;
      },
    );
  }
});
