import test from "node:test";
import assert from "node:assert/strict";
import { makePerson, makeRecords, selectedPhotoForPerson, type Photo } from "./models";
import { deletePhoto, reassignPhoto, resetPreparation, selectPhoto } from "./photoState";

function fixture() {
  const records = makeRecords();
  const primary = records.draft.people[0];
  const child = makePerson("Child");
  child.first = "Child";
  child.last = "Applicant";
  records.draft.people.push(child);
  records.draft.started = true;
  records.draft.reviewed = true;
  records.photos = [
    ["primary-first", primary.id],
    ["primary-second", primary.id],
    ["child-first", child.id],
    ["child-second", child.id],
    ["unassigned", ""],
  ].map(([id, personId]): Photo => ({
    id, personId, name: "Example", uri: `file:///${id}.jpg`,
    sourceUri: `file:///${id}-source.jpg`,
    takenOn: "2026-10-01", bytes: 12000,
    composition: false, notReused: false, notAltered: false,
    analysis: { version: 1, checkedAt: "2026-10-06T12:00:00.000Z", checks: [] },
  }));
  primary.selectedPhotoId = "primary-first";
  child.selectedPhotoId = "child-first";
  records.entries.push({
    id: "entry", year: "2026", name: "Example Applicant", surname: "Applicant",
    birthYear: "1990", confirmation: "2026ABC123DEF456", caseNumber: "",
    submitted: "2025-10-05", events: [],
  });
  return records;
}

test("selecting replaces one person's selection independently of compliance", () => {
  const records = fixture();
  const before = structuredClone(records);
  const selected = selectPhoto(records, "primary-second");
  assert.equal(selected.draft.people[0].selectedPhotoId, "primary-second");
  assert.equal(selected.draft.people[1].selectedPhotoId, "child-first");
  assert.equal(selected.draft.reviewed, false);
  assert.deepEqual(selected.photos, before.photos);
  assert.deepEqual(selected.entries, before.entries);
  const switched = selectPhoto(selected, "child-second");
  assert.equal(switched.draft.people[0].selectedPhotoId, "primary-second");
  assert.equal(switched.draft.people[1].selectedPhotoId, "child-second");
  assert.equal(selectPhoto(switched, "primary-first").draft.people[0].selectedPhotoId, "primary-first");
  assert.deepEqual(records, before);
});

test("selecting the already-selected photo preserves the existing preparation review", () => {
  for (const reviewed of [true, false]) {
    const records = fixture();
    records.draft.reviewed = reviewed;
    const before = structuredClone(records);
    const result = selectPhoto(records, "primary-first");
    assert.equal(result, records);
    assert.equal(result.draft.reviewed, reviewed);
    assert.deepEqual(result, before);
  }
});

test("deleting selected photos clears references without picking a replacement", () => {
  const records = fixture();
  const before = structuredClone(records);
  const result = deletePhoto(records, "primary-first");
  assert.equal(result.photos.length, before.photos.length - 1);
  assert.ok(result.photos.some((photo) => photo.id === "primary-second"));
  assert.equal(result.draft.people[0].selectedPhotoId, "");
  assert.equal(selectedPhotoForPerson(result.draft.people[0], result.photos), undefined);
  assert.equal(result.draft.people[1].selectedPhotoId, "child-first");
  assert.equal(result.draft.reviewed, false);
  assert.deepEqual(result.entries, before.entries);
  assert.deepEqual(records, before);
});

test("deleting an unselected photo keeps both current selections", () => {
  const records = fixture();
  const before = structuredClone(records);
  const result = deletePhoto(records, "primary-second");
  assert.deepEqual(
    result.draft.people.map((person) => person.selectedPhotoId),
    ["primary-first", "child-first"],
  );
  assert.ok(!result.photos.some((photo) => photo.id === "primary-second"));
  assert.equal(result.draft, records.draft);
  assert.equal(result.draft.reviewed, true);
  assert.deepEqual(records, before);
});

test("reassigning clears the old selection but never selects for the recipient", () => {
  const records = fixture();
  const before = structuredClone(records);
  const recipient = records.draft.people[1].id;
  const result = reassignPhoto(records, "primary-first", recipient);
  assert.equal(result.draft.people[0].selectedPhotoId, "");
  assert.equal(result.draft.people[1].selectedPhotoId, "child-first");
  assert.equal(result.photos[0].personId, recipient);
  assert.deepEqual(result.photos[0], {
    ...before.photos[0], personId: recipient, name: "Child Applicant",
  });
  assert.equal(result.draft.reviewed, false);
  const noSelection = deletePhoto(records, "child-first");
  assert.equal(
    reassignPhoto(noSelection, "primary-first", recipient).draft.people[1].selectedPhotoId,
    "",
  );
  const unassigned = reassignPhoto(records, "primary-first", "");
  assert.equal(unassigned.photos[0].personId, "");
  assert.equal(unassigned.photos[0].name, before.photos[0].name);
  assert.equal(unassigned.draft.people[0].selectedPhotoId, "");
  const samePerson = reassignPhoto(records, "primary-first", records.draft.people[0].id);
  assert.equal(samePerson.draft.people[0].selectedPhotoId, "primary-first");
  assert.equal(samePerson.draft.reviewed, true);
  assert.deepEqual(records, before);
});

test("reassigning an unselected photo preserves every current selection", () => {
  const records = fixture();
  const result = reassignPhoto(records, "primary-second", records.draft.people[1].id);
  assert.deepEqual(
    result.draft.people.map((person) => person.selectedPhotoId),
    ["primary-first", "child-first"],
  );
  assert.equal(result.draft, records.draft);
  assert.equal(result.draft.reviewed, true);
  assert.equal(result.photos[1].name, "Child Applicant");
  assert.equal(resetPreparation(result).photos[1].name, "Child Applicant");
});

test("unselected deletion and reassignment do not turn an unreviewed draft into a reviewed one", () => {
  const records = fixture();
  records.draft.reviewed = false;
  assert.equal(deletePhoto(records, "primary-second").draft.reviewed, false);
  assert.equal(reassignPhoto(records, "primary-second", "").draft.reviewed, false);
});

test("moving a photo clears stale selected references and invalidates their review", () => {
  const records = fixture();
  records.draft.people[0].selectedPhotoId = "";
  records.draft.people[1].selectedPhotoId = "primary-first";
  const result = reassignPhoto(records, "primary-first", "");
  assert.equal(result.draft.people[1].selectedPhotoId, "");
  assert.equal(result.draft.reviewed, false);
});

test("stale selected references do not resolve to someone else's photo and are cleared on deletion", () => {
  const records = fixture();
  records.draft.people[1].selectedPhotoId = "primary-first";
  assert.equal(selectedPhotoForPerson(records.draft.people[1], records.photos), undefined);
  const result = deletePhoto(records, "primary-first");
  assert.deepEqual(result.draft.people.map((person) => person.selectedPhotoId), ["", ""]);
  assert.equal(result.draft.reviewed, false);
  records.draft.people[0].selectedPhotoId = "missing";
  assert.equal(selectedPhotoForPerson(records.draft.people[0], records.photos), undefined);
});

test("invalid IDs fail explicitly without mutating records", () => {
  const records = fixture();
  records.photos.push({ ...records.photos[0], id: "orphan", personId: "removed-person" });
  const before = structuredClone(records);
  for (const photoId of ["", "missing"]) {
    assert.throws(() => selectPhoto(records, photoId), /Photo not found/);
    assert.throws(() => deletePhoto(records, photoId), /Photo not found/);
    assert.throws(() => reassignPhoto(records, photoId, records.draft.people[0].id), /Photo not found/);
  }
  assert.throws(() => selectPhoto(records, "unassigned"), /Assign this photo/);
  assert.throws(() => selectPhoto(records, "orphan"), /Assign this photo/);
  assert.throws(() => reassignPhoto(records, "primary-first", "missing-person"), /existing person/);
  assert.deepEqual(records, before);
});

test("reset clears the draft and associations while retaining the complete library and entries", () => {
  const records = fixture();
  records.draft.email = "example@example.com";
  records.draft.passport.number = "EXAMPLE";
  const before = structuredClone(records);
  const result = resetPreparation(records);
  assert.equal(result.version, 3);
  assert.equal(result.draft.started, false);
  assert.equal(result.draft.step, 0);
  assert.equal(result.draft.reviewed, false);
  assert.equal(result.draft.email, "");
  assert.equal(result.draft.passport.number, "");
  assert.equal(result.draft.people.length, 1);
  assert.equal(result.draft.people[0].first, "");
  assert.equal(result.draft.people[0].selectedPhotoId, "");
  assert.ok(before.draft.people.every((person) => person.id !== result.draft.people[0].id));
  assert.deepEqual(result.photos, before.photos.map((photo) => ({ ...photo, personId: "" })));
  assert.deepEqual(result.entries, before.entries);
  assert.deepEqual(records, before);
});
