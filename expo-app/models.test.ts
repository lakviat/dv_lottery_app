import test from "node:test";
import assert from "node:assert/strict";
import {
  draftIssues,
  detailsIssues,
  personErrors,
  normalizeBirthDate,
  displayBirthDate,
  entryError,
  makeDraft,
  makePerson,
  parseDate,
  Photo,
  photoReviewed,
  today,
  type Entry,
} from "./models";

test("strict dates reject impossible and incomplete dates", () => {
  assert.equal(parseDate("2026-02-30"), null);
  assert.equal(parseDate("2026-1-01"), null);
  assert.ok(parseDate("2024-02-29"));
});
test("draft flags required fields and a missing spouse", () => {
  const d = makeDraft();
  assert.ok(detailsIssues(d, "personal").length > 0);
  d.marital = "Married — spouse is not a U.S. citizen / LPR";
  d.familyReviewed = true;
  assert.match(detailsIssues(d, "family").join(" "), /spouse/);
  d.people.push(makePerson("Spouse"));
  assert.match(detailsIssues(d, "family").join(" "), /details/);
});
test("each person needs a separately reviewed recent photo", () => {
  const d = makeDraft();
  d.people.push(makePerson("Child"));
  const p: Photo = {
    id: "1",
    personId: d.people[0].id,
    name: "Test",
    uri: "",
    takenOn: today(),
    bytes: 2000,
    composition: true,
    notReused: true,
  };
  assert.equal(draftIssues(d, [p], 1).length, 1);
  assert.equal(photoReviewed({ ...p, composition: false }), false);
  assert.equal(photoReviewed({ ...p, takenOn: "2000-01-01" }), false);
  assert.equal(photoReviewed({ ...p, takenOn: "2099-01-01" }), false);
});
test("confirmation, program year, and duplicates are validated", () => {
  const e: Entry = {
    id: "test",
    name: "Test Applicant",
    surname: "Applicant",
    birthYear: "1990",
    year: "2026",
    confirmation: "2026ABC123DEF456",
    submitted: today(),
    caseNumber: "",
    events: [],
  };
  assert.equal(entryError(e, []), null);
  assert.match(
    entryError({ ...e, confirmation: "2025ABC123DEF456" }, [])!,
    /starting with/,
  );
  assert.match(entryError(e, [e])!, /already saved/);
  assert.match(
    entryError({ ...e, submitted: "2026-02-30" }, [])!,
    /submission date/,
  );
});

test("personal Continue accepts month/day/year and ISO, with precise errors", () => {
  const d = makeDraft();
  Object.assign(d.people[0], {
    first: "Test",
    middle: "M",
    last: "Applicant",
    dob: "02/04/1987",
    sex: "Male",
    city: "Example",
    country: "Kyrgyzstan",
  });
  d.education = "Master’s degree";
  assert.deepEqual(detailsIssues(d, "personal"), []);
  assert.equal(normalizeBirthDate("02/04/1987"), "1987-02-04");
  assert.equal(displayBirthDate("1987-02-04"), "02/04/1987");
  d.people[0].dob = "1987-02-04";
  assert.deepEqual(detailsIssues(d, "personal"), []);
  for (const dob of [
    "02/30/1987",
    "13/04/1987",
    "02/29/2023",
    "02/04/2099",
    "02/04/",
    "1987-02-30",
  ]) {
    d.people[0].dob = dob;
    assert.deepEqual(Object.keys(personErrors(d.people[0])), ["dob"]);
  }
  d.people[0].dob = "02/29/2024";
  assert.deepEqual(detailsIssues(d, "personal"), []);
});
