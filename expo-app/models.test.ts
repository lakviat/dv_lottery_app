import test from "node:test";
import assert from "node:assert/strict";
import {
  draftIssues,
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
  assert.equal(draftIssues(d, [], 0).length, 3);
  d.marital = "Married — spouse is not a U.S. citizen / LPR";
  d.familyReviewed = true;
  assert.match(draftIssues(d, [], 3).join(" "), /spouse/);
  d.people.push(makePerson("Spouse"));
  assert.match(draftIssues(d, [], 3).join(" "), /details/);
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
  assert.equal(draftIssues(d, [p], 4).length, 1);
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
