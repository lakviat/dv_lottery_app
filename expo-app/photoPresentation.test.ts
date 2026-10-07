import test from "node:test";
import assert from "node:assert/strict";
import { Photo, makePerson } from "./models";
import { photoForPerson, photoStatus } from "./photoPresentation";

const now = new Date(2026, 9, 6);
const photo: Photo = {
  id: "photo", personId: "applicant", name: "Test Applicant",
  uri: "file:///photo.jpg", takenOn: "2026-10-01", bytes: 12000,
  composition: true, notReused: true, notAltered: true,
  analysis: {
    version: 1,
    checkedAt: "2026-10-06T12:00:00.000Z",
    checks: [{ id: "jpeg", label: "JPEG", kind: "technical", state: "pass", detail: "JPEG signature." }],
  },
};

test("photo status distinguishes missing, unreviewed, reviewed and expired photos", () => {
  assert.equal(photoStatus(undefined, now).label, "Photo needed");
  assert.equal(photoStatus({ ...photo, composition: false }, now).label, "Confirm photo details");
  assert.equal(photoStatus({ ...photo, notAltered: false }, now).label, "Confirm photo details");
  assert.deepEqual(photoStatus(photo, now), { label: "Passes automated checks", tone: "green" });
  assert.deepEqual(photoStatus({ ...photo, analysis: undefined }, now), { label: "Not checked", tone: "neutral" });
  assert.equal(photoStatus({ ...photo, takenOn: "2025-01-01" }, now).label, "New photo needed");
});

test("preparation displays only the selected photo, even when another is reviewed", () => {
  const person = { ...makePerson(), id: "applicant", selectedPhotoId: "new" };
  const recentUnreviewed = { ...photo, id: "new", composition: false };
  const otherPerson = { ...photo, id: "family", personId: "child" };
  assert.equal(photoForPerson(person, [otherPerson, recentUnreviewed, photo])?.id, "new");
  assert.equal(photoForPerson(person, [photo]), undefined);
  assert.equal(photoForPerson({ ...person, selectedPhotoId: "" }, [photo]), undefined);
  assert.equal(photoForPerson({ ...person, selectedPhotoId: "family" }, [otherPerson]), undefined);
});

test("cached technical and heuristic warnings remain visible without claiming approval", () => {
  for (const kind of ["technical", "heuristic"] as const) {
    assert.deepEqual(photoStatus({
      ...photo,
      analysis: {
        version: 1, checkedAt: "2026-10-06T12:00:00.000Z",
        checks: [{
          id: "example", label: "Example", kind, state: "attention",
          detail: "Needs a closer look.",
        }],
      },
    }, now), { label: "Needs attention", tone: "warm" });
  }
});
