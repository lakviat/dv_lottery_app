import test from "node:test";
import assert from "node:assert/strict";
import { Photo } from "./models";
import { photoForPerson, photoStatus } from "./photoPresentation";

const now = new Date(2026, 9, 6);
const photo: Photo = {
  id: "photo", personId: "applicant", name: "Test Applicant",
  uri: "file:///photo.jpg", takenOn: "2026-10-01", bytes: 12000,
  composition: true, notReused: true,
};

test("photo status distinguishes missing, unreviewed, reviewed and expired photos", () => {
  assert.equal(photoStatus(undefined, now).label, "Photo needed");
  assert.equal(photoStatus({ ...photo, composition: false }, now).label, "Needs review");
  assert.deepEqual(photoStatus(photo, now), { label: "Reviewed by you", tone: "green" });
  assert.equal(photoStatus({ ...photo, takenOn: "2025-01-01" }, now).label, "New photo needed");
});

test("preparation displays the photo supporting the actual completed checklist", () => {
  const recentUnreviewed = { ...photo, id: "new", composition: false };
  const otherPerson = { ...photo, id: "family", personId: "child" };
  assert.equal(photoForPerson([otherPerson, recentUnreviewed, photo], "applicant", now)?.id, "photo");
  assert.equal(photoForPerson([recentUnreviewed], "applicant", now)?.id, "new");
  assert.equal(photoForPerson([otherPerson], "applicant", now), undefined);
});
