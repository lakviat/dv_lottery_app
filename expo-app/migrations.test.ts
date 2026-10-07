import test from "node:test";
import assert from "node:assert/strict";
import { migrateRecords } from "./migrations";
import {
  makeRecords,
  makePerson,
  personErrors,
  personPhotoComplete,
  selectedPhotoForPerson,
  today,
  type Photo,
  type Person,
} from "./models";

function legacyPerson(relationship: Person["relationship"] = "Primary") {
  const { oneLegalName, selectedPhotoId, ...person } = makePerson(relationship);
  return { ...person, noFirst: false, noLast: false };
}

const legacyPhoto = (personId: string, id: string): Omit<Photo, "notAltered"> => ({
  id, personId, name: "Example", uri: `file:///${id}.jpg`,
  takenOn: today(), bytes: 12000, composition: true, notReused: true,
});

test("six-step drafts migrate without losing saved data or applying migration twice", () => {
  for (let step = 0; step <= 5; step++) {
    const current = makeRecords();
    const { passport, detailsSection, ...draft } = current.draft;
    draft.step = step;
    draft.people[0].dob = "02/04/1987";
    draft.people[0].first = "Example";
    const legacy = { ...current, version: 1, draft };
    const result = migrateRecords(legacy);
    assert.equal(result.version, 3);
    assert.equal(result.draft.step, step >= 4 ? step - 3 : 0);
    assert.equal(
      result.draft.detailsSection,
      step === 2 ? "contact" : step === 3 ? "family" : "personal",
    );
    assert.equal(result.draft.people[0].dob, "1987-02-04");
    assert.equal(result.draft.people[0].first, "Example");
    assert.equal(result.draft.people[0].last, "");
    assert.equal(result.draft.people[0].oneLegalName, false);
    assert.deepEqual(result.photos, legacy.photos);
    assert.deepEqual(result.entries, legacy.entries);
    assert.deepEqual(result.draft.passport, passport);
    assert.deepEqual(migrateRecords(result), result);
    assert.equal(legacy.draft.people[0].dob, "02/04/1987");
  }
});

test("legacy names preserve all tokens and only explicit no-family-name records are moved", () => {
  for (const version of [1, 2]) {
    const legacy = {
      ...makeRecords(),
      version,
      draft: {
        ...makeRecords().draft,
        people: [
          { ...legacyPerson(), first: "ALPHA BETA", middle: "GAMMA", noLast: true },
          { ...legacyPerson("Spouse"), first: "ANNA", middle: "MARIA", last: "ERIKSSON" },
          { ...legacyPerson("Child"), last: "MONONYM", noFirst: true },
          { ...legacyPerson("Child"), first: "INCOMPLETE" },
          { ...legacyPerson("Child"), first: "KEEP", middle: "ALL", last: "TOKENS", noLast: true },
          { ...legacyPerson("Child"), last: "INCOMPLETE" },
        ],
      },
    };
    const before = structuredClone(legacy);
    const result = migrateRecords(legacy);
    const [single, separate, lastOnly, incomplete, hiddenLast, incompleteFirst] = result.draft.people;
    assert.equal(single.first, "");
    assert.equal(single.middle, "");
    assert.equal(single.last, "ALPHA BETA GAMMA");
    assert.equal(single.oneLegalName, true);
    assert.equal(personErrors(single).last, undefined);
    assert.equal(personErrors(single).first, undefined);
    assert.equal(separate.first, "ANNA");
    assert.equal(separate.middle, "MARIA");
    assert.equal(separate.last, "ERIKSSON");
    assert.equal(separate.oneLegalName, false);
    assert.equal(lastOnly.last, "MONONYM");
    assert.equal(lastOnly.oneLegalName, true);
    assert.equal(incomplete.first, "INCOMPLETE");
    assert.equal(incomplete.last, "");
    assert.equal(incomplete.oneLegalName, false);
    assert.ok(personErrors(incomplete).last);
    assert.equal(hiddenLast.first, "KEEP");
    assert.equal(hiddenLast.middle, "ALL");
    assert.equal(hiddenLast.last, "TOKENS");
    assert.equal(hiddenLast.oneLegalName, false);
    assert.equal(incompleteFirst.first, "");
    assert.equal(incompleteFirst.last, "INCOMPLETE");
    assert.equal(incompleteFirst.oneLegalName, false);
    assert.ok(personErrors(incompleteFirst).first);
    for (const person of result.draft.people) {
      assert.equal("noFirst" in person, false);
      assert.equal("noLast" in person, false);
      assert.equal(person.selectedPhotoId, "");
    }
    assert.deepEqual(legacy, before);
    assert.deepEqual(migrateRecords(result), result);
  }
});

test("legacy migration preserves photos and entries while selecting the formerly preferred photo", () => {
  for (const version of [1, 2]) {
    const primary = legacyPerson();
    const child = legacyPerson("Child");
    const spouse = legacyPerson("Spouse");
    const firstAssigned = {
      ...legacyPhoto(primary.id, "first"), composition: false,
    };
    const oldPreferred = legacyPhoto(primary.id, "preferred");
    const laterReviewed = legacyPhoto(primary.id, "later");
    const expired = { ...legacyPhoto(child.id, "expired"), takenOn: "2000-01-01" };
    const unassigned = { ...legacyPhoto("", "unassigned"), sourceUri: "file:///source.jpg" };
    const current = makeRecords();
    const legacy = {
      ...current,
      version,
      draft: {
        ...current.draft, reviewed: true, people: [primary, child, spouse],
        email: "example@example.com",
      },
      photos: [firstAssigned, expired, oldPreferred, laterReviewed, unassigned],
      entries: [{
        id: "entry", year: "2026", name: "Example Applicant", surname: "Applicant",
        birthYear: "1990", confirmation: "2026ABC123DEF456", caseNumber: "",
        submitted: "2025-10-05", events: [],
      }],
    };
    const before = structuredClone(legacy);
    const result = migrateRecords(legacy);
    assert.deepEqual(result.photos, legacy.photos.map((photo) => ({ ...photo, notAltered: false })));
    assert.deepEqual(result.entries, legacy.entries);
    assert.equal(result.draft.email, legacy.draft.email);
    assert.equal(result.draft.people[0].selectedPhotoId, "preferred");
    assert.equal(result.draft.people[1].selectedPhotoId, "expired");
    assert.equal(result.draft.people[2].selectedPhotoId, "");
    assert.equal(personPhotoComplete(result.draft.people[0], result.photos), false);
    assert.equal(selectedPhotoForPerson(result.draft.people[0], result.photos)?.id, "preferred");
    assert.deepEqual(migrateRecords(result), result);
    assert.deepEqual(legacy, before);
  }
});

test("current records never infer a selection and preserve attestations, sources and cached analysis", () => {
  const records = makeRecords();
  records.photos.push({
    ...legacyPhoto(records.draft.people[0].id, "reviewed"),
    notAltered: true,
    sourceUri: "file:///original.jpg",
    analysis: {
      version: 1, checkedAt: "2026-10-06T12:00:00.000Z",
      checks: [{
        id: "dimensions", label: "Dimensions", kind: "technical",
        state: "pass", detail: "600 × 600 pixels.",
      }],
    },
  });
  for (const selectedPhotoId of ["", "deleted", "reviewed"]) {
    records.draft.people[0].selectedPhotoId = selectedPhotoId;
    const before = structuredClone(records);
    const result = migrateRecords(records);
    assert.equal(result.draft.people[0].selectedPhotoId, selectedPhotoId);
    assert.deepEqual(result, before);
    assert.deepEqual(migrateRecords(result), before);
    assert.deepEqual(records, before);
  }
});

test("current migration rejects malformed cached reports without changing saved data", () => {
  const records = makeRecords();
  const photo = { ...legacyPhoto(records.draft.people[0].id, "photo"), notAltered: true };
  const check = {
    id: "dimensions", label: "Dimensions", kind: "technical",
    state: "pass", detail: "600 × 600 pixels.",
  };
  const report = {
    version: 1, checkedAt: "2026-10-06T12:00:00.000Z", checks: [check],
  };
  const malformed: unknown[] = [
    null, true, "report", [], {},
    { ...report, version: 2 },
    { ...report, checkedAt: null },
    { ...report, checkedAt: "" },
    { ...report, checkedAt: "not a date" },
    { ...report, checks: null },
    { ...report, checks: {} },
    { ...report, checks: [null] },
    { ...report, checks: [[]] },
    { ...report, checks: [{ ...check, id: 1 }] },
    { ...report, checks: [{ ...check, label: {} }] },
    { ...report, checks: [{ ...check, detail: null }] },
    { ...report, checks: [{ ...check, kind: "unknown" }] },
    { ...report, checks: [{ ...check, state: "approved" }] },
    { ...report, width: "600" },
    { ...report, width: 0 },
    { ...report, height: -1 },
    { ...report, height: 1.5 },
    { ...report, width: NaN },
    { ...report, width: Infinity },
    { ...report, bytes: -1 },
    { ...report, bytes: null },
    { ...report, format: {} },
    { ...report, error: [] },
  ];
  for (const analysis of malformed) {
    const raw = { ...records, photos: [{ ...photo, analysis }] };
    const before = structuredClone(raw);
    assert.throws(() => migrateRecords(raw), /invalid format.*not been overwritten/);
    assert.deepEqual(raw, before);
  }
});

test("malformed stored URI fields are rejected rather than discarded before cleanup", () => {
  const records = makeRecords();
  const photo = { ...legacyPhoto(records.draft.people[0].id, "photo"), notAltered: true };
  for (const key of ["uri", "sourceUri"]) {
    for (const value of [null, 42, false, [], {}, "", "   "]) {
      const raw = { ...records, photos: [{ ...photo, [key]: value }] };
      const before = structuredClone(raw);
      assert.throws(() => migrateRecords(raw), /invalid format.*not been overwritten/);
      assert.deepEqual(raw, before);
    }
  }
  assert.throws(
    () => migrateRecords({ ...records, photos: [{ ...photo, uri: undefined }] }),
    /invalid format/,
  );
});

test("valid optional report fields, zero-byte failure evidence and absent extras survive migration", () => {
  const records = makeRecords();
  records.photos = [
    { ...legacyPhoto(records.draft.people[0].id, "without-extras"), notAltered: false },
    {
      ...legacyPhoto("", "failed"), notAltered: false, sourceUri: "file:///source.jpg",
      analysis: {
        version: 1, checkedAt: "2026-10-06T12:00:00.000Z",
        width: 600, height: 600, bytes: 0, format: "Unknown", error: "Try again.",
        checks: [
          { id: "readable-file", label: "Readable file", kind: "technical", state: "attention", detail: "Could not read." },
          { id: "pose", label: "Pose", kind: "heuristic", state: "unverified", detail: "Review yourself." },
          { id: "alterations", label: "Alterations", kind: "manual", state: "unverified", detail: "Review yourself." },
        ],
      },
    },
    {
      ...legacyPhoto("", "unknown"), notAltered: false, uri: "blob:existing-image",
      analysis: { version: 1, checkedAt: "2026-10-06T12:00:00.000Z", checks: [] },
    },
  ];
  const before = structuredClone(records);
  const result = migrateRecords(records);
  assert.deepEqual(result, before);
  assert.deepEqual(migrateRecords(result), before);
  assert.deepEqual(records, before);
});

test("unknown or incomplete storage is rejected instead of being silently reset", () => {
  assert.throws(() => migrateRecords(null));
  assert.throws(() => migrateRecords({ ...makeRecords(), version: 99 }));
  assert.throws(() =>
    migrateRecords({
      ...makeRecords(),
      draft: { ...makeRecords().draft, people: [] },
    }),
  );
  assert.throws(() =>
    migrateRecords({
      ...makeRecords(),
      draft: { ...makeRecords().draft, step: 4 },
    }),
  );
});
