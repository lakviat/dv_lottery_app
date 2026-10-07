import test from "node:test";
import assert from "node:assert/strict";
import {
  makeRecords,
  detailsIssues,
  draftIssues,
  today,
  makePerson,
} from "./models";
import {
  detailsFieldErrors,
  familyAddOptions,
  personFieldID,
  photoFieldErrors,
  preparationCompletion,
  preparationProgress,
  reviewFieldErrors,
} from "./preparation";

const validPersonal = () => {
  const r = makeRecords();
  Object.assign(r.draft.people[0], {
    first: "Test",
    last: "Applicant",
    dob: "02/04/1987",
    sex: "Male",
    city: "Example",
    country: "Kyrgyzstan",
  });
  r.draft.education = "High school degree";
  return r;
};
test("missing education is the precise first actionable error after complete personal fields", () => {
  const r = validPersonal();
  r.draft.education = "";
  assert.deepEqual(detailsFieldErrors(r.draft, "personal"), {
    education: "Please select your highest level of education.",
  });
  r.draft.education = "Master’s degree";
  assert.deepEqual(detailsFieldErrors(r.draft, "personal"), {});
});
test("errors retain form order and distinct IDs for each family member", () => {
  const r = makeRecords();
  const e = detailsFieldErrors(r.draft, "personal");
  assert.equal(Object.keys(e)[0], personFieldID(r.draft.people[0].id, "first"));
  r.draft.people.push(makePerson("Child"), makePerson("Child"));
  const family = detailsFieldErrors(r.draft, "family");
  assert.ok(family[personFieldID(r.draft.people[1].id, "dob")]);
  assert.ok(family[personFieldID(r.draft.people[2].id, "dob")]);
});
test("contact errors target the actual field, clear on correction, and honor no postal code", () => {
  const r = validPersonal();
  Object.assign(r.draft, {
    email: "test@example.com",
    address: "1 Test Street",
    city: "Testville",
    province: "NY",
    country: "United States",
    residence: "United States",
    noPostal: true,
  });
  assert.deepEqual(detailsFieldErrors(r.draft, "contact"), {});
  r.draft.province = "";
  assert.deepEqual(detailsFieldErrors(r.draft, "contact"), {
    province: "Enter your district, province or state.",
  });
  assert.equal(detailsIssues(r.draft, "contact").length > 0, true);
});
test("contact validation follows the visible order including postal code before country", () => {
  assert.deepEqual(Object.keys(detailsFieldErrors(makeRecords().draft, "contact")), [
    "email", "address", "city", "province", "postal", "country", "residence",
  ]);
});
test("family details precede the missing-spouse action in validation order", () => {
  const r = validPersonal();
  r.draft.marital = "Married — spouse is not a U.S. citizen / LPR";
  const child = makePerson("Child");
  r.draft.people.push(child);
  const keys = Object.keys(detailsFieldErrors(r.draft, "family"));
  assert.equal(keys[0], personFieldID(child.id, "first"));
  assert.ok(keys.indexOf("familyMembers") > keys.indexOf(personFieldID(child.id, "country")));
});
test("Home next action follows actual checklist completeness including expiry", () => {
  const r = validPersonal();
  assert.equal(preparationProgress(r).section, "contact");
  Object.assign(r.draft, {
    email: "test@example.com",
    address: "1 Test St",
    city: "Example",
    province: "NY",
    country: "United States",
    residence: "United States",
    noPostal: true,
    marital: "Unmarried",
    familyReviewed: true,
  });
  assert.equal(preparationProgress(r).step, 1);
  r.photos.push({
    id: "photo",
    personId: r.draft.people[0].id,
    name: "Test",
    uri: "",
    takenOn: today(),
    bytes: 1200,
    composition: true,
    notReused: true,
    notAltered: true,
  });
  r.draft.people[0].selectedPhotoId = "photo";
  assert.equal(preparationProgress(r).step, 2);
  Object.assign(r.draft, {
    eligibilityCountry: "Kyrgyzstan",
    qualification: "High school education or equivalent",
    eligibilityReviewed: true,
    passportPlan: "Passport and required page scans are ready",
    passportReviewed: true,
    reviewed: true,
  });

  assert.deepEqual(reviewFieldErrors(r.draft), {});
  assert.equal(preparationProgress(r).ready, true);
  assert.deepEqual(preparationCompletion(r.draft, r.photos), [true, true, true]);
  r.draft.education = "";
  r.draft.reviewed = false;
  assert.deepEqual(preparationCompletion(r.draft, r.photos), [false, true, false]);
  assert.deepEqual(preparationProgress(r).completed, preparationCompletion(r.draft, r.photos));
  r.draft.education = "High school degree";
  r.draft.reviewed = true;
  r.photos[0].takenOn = "2000-01-01";
  assert.deepEqual(preparationCompletion(r.draft, r.photos), [true, false, true]);
  assert.equal(preparationProgress(r).ready, false);
  assert.equal(preparationProgress(r).step, 1);
});

test("photo errors and checklist use selection rather than a reviewed library alternative", () => {
  const r = validPersonal();
  const person = r.draft.people[0];
  r.photos.push({
    id: "ready", personId: person.id, name: "Example", uri: "file:///photo.jpg",
    takenOn: today(), bytes: 12000,
    composition: true, notReused: true, notAltered: true,
  });
  r.photos.push({ ...r.photos[0], id: "unreviewed", notAltered: false });
  for (const selectedPhotoId of ["", "missing", "unreviewed"]) {
    person.selectedPhotoId = selectedPhotoId;
    assert.deepEqual(Object.keys(photoFieldErrors(r.draft, r.photos)), [`photo-${person.id}`]);
    assert.equal(draftIssues(r.draft, r.photos, 1).length, 1);
  }
  person.selectedPhotoId = "ready";
  assert.deepEqual(photoFieldErrors(r.draft, r.photos), {});
  assert.deepEqual(draftIssues(r.draft, r.photos, 1), []);
  r.photos[0].analysis = {
    version: 1, checkedAt: "2026-10-06T12:00:00.000Z",
    checks: [{
      id: "dimensions", label: "Dimensions", kind: "technical",
      state: "attention", detail: "Too small.",
    }],
  };
  assert.equal(Object.keys(photoFieldErrors(r.draft, r.photos)).length, 1);
  assert.equal(draftIssues(r.draft, r.photos, 1).length, 1);
  r.photos[0].analysis.checks[0].kind = "heuristic";
  assert.deepEqual(photoFieldErrors(r.draft, r.photos), {});
  assert.deepEqual(draftIssues(r.draft, r.photos, 1), []);
});
test("field errors agree with existing checklist requirements", () => {
  const r = validPersonal();
  for (const section of ["personal", "contact", "family"] as const)
    assert.equal(
      Object.keys(detailsFieldErrors(r.draft, section)).length > 0,
      detailsIssues(r.draft, section).length > 0,
    );
  assert.equal(
    Object.keys(reviewFieldErrors(r.draft)).length > 0,
    draftIssues(r.draft, [], 2).length > 0,
  );
  r.draft.marital = "Married — spouse is not a U.S. citizen / LPR";
  assert.deepEqual(
    familyAddOptions(r.draft).map((x) => x.relationship),
    ["Spouse", "Child"],
  );
  r.draft.people.push(makePerson("Spouse"));
  assert.deepEqual(
    familyAddOptions(r.draft).map((x) => x.relationship),
    ["Child"],
  );
});
