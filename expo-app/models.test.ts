import test from "node:test";
import assert from "node:assert/strict";
import {
  draftIssues,
  detailsIssues,
  personErrors,
  personName,
  personPhotoComplete,
  selectedPhotoForPerson,
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
import type { PhotoCheckReport } from "./photoCheckTypes";

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
    notAltered: true,
  };
  d.people[0].selectedPhotoId = p.id;
  assert.equal(draftIssues(d, [p], 1).length, 1);
  assert.equal(photoReviewed({ ...p, composition: false }), false);
  assert.equal(photoReviewed({ ...p, notReused: false }), false);
  assert.equal(photoReviewed({ ...p, notAltered: false }), false);
  assert.equal(photoReviewed({ ...p, takenOn: "2000-01-01" }), false);
  assert.equal(photoReviewed({ ...p, takenOn: "2099-01-01" }), false);
});

test("a single legal name belongs in the required family-name field", () => {
  const person = {
    ...makePerson(), last: "EXAMPLE NAME", oneLegalName: true,
    dob: "1987-02-04", sex: "Male", city: "Example", country: "Canada",
  };
  assert.deepEqual(personErrors(person), {});
  assert.equal(personName(person), "EXAMPLE NAME");
  assert.ok(personErrors({ ...person, oneLegalName: false }).first);
  const incorrectlyPlaced = { ...person, first: person.last, last: "" };
  assert.ok(personErrors(incorrectlyPlaced).last);
  assert.ok(personErrors({ ...person, last: "" }).last);
});

test("only the assigned selected photo can complete a person's photo step", () => {
  const d = makeDraft();
  const person = d.people[0];
  const photo: Photo = {
    id: "complete", personId: person.id, name: "Example",
    uri: "file:///portrait.jpg", takenOn: today(), bytes: 12000,
    composition: true, notReused: true, notAltered: true,
  };
  const unreviewed = { ...photo, id: "unreviewed", composition: false };
  const photos = [photo, unreviewed];
  assert.equal(selectedPhotoForPerson(person, photos), undefined);
  assert.equal(personPhotoComplete(person, photos), false);
  assert.equal(draftIssues(d, photos, 1).length, 1);
  for (const selectedPhotoId of ["unreviewed", "deleted"]) {
    person.selectedPhotoId = selectedPhotoId;
    assert.equal(personPhotoComplete(person, photos), false);
    assert.equal(draftIssues(d, photos, 1).length, 1);
  }
  person.selectedPhotoId = photo.id;
  assert.equal(selectedPhotoForPerson(person, photos), photo);
  assert.equal(personPhotoComplete(person, photos), true);
  assert.deepEqual(draftIssues(d, photos, 1), []);
  assert.equal(
    selectedPhotoForPerson(person, [{ ...photo, personId: "someone-else" }]),
    undefined,
  );
});

test("technical failures block completion while heuristics and unverified checks remain advisory", () => {
  const person = { ...makePerson(), selectedPhotoId: "photo" };
  const photo: Photo = {
    id: "photo", personId: person.id, name: "Example", uri: "file:///photo.jpg",
    takenOn: "2026-10-01", bytes: 12000,
    composition: true, notReused: true, notAltered: true,
  };
  const now = new Date(2026, 9, 6);
  for (const [kind, state, complete] of [
    ["technical", "attention", false],
    ["technical", "unverified", true],
    ["technical", "pass", true],
    ["heuristic", "attention", true],
    ["manual", "unverified", true],
  ] as const) {
    const analysis: PhotoCheckReport = {
      version: 1, checkedAt: "2026-10-06T12:00:00.000Z",
      checks: [{ id: "test", label: "Test", kind, state, detail: "Test result." }],
    };
    assert.equal(personPhotoComplete(person, [{ ...photo, analysis }], now), complete);
    assert.equal(photoReviewed({ ...photo, analysis }, now), complete);
  }
  assert.equal(personPhotoComplete(person, [photo], now), true);
  assert.equal(personPhotoComplete(person, [{ ...photo, notAltered: false }], now), false);
  assert.equal(personPhotoComplete(person, [{ ...photo, takenOn: "2026-04-05" }], now), false);
  assert.equal(personPhotoComplete(person, [{ ...photo, takenOn: "2026-04-06" }], now), true);
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
