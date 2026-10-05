import test from "node:test";
import assert from "node:assert/strict";
import { migrateRecords } from "./migrations";
import { makeRecords } from "./models";

test("six-step drafts migrate without losing saved data or applying migration twice", () => {
  for (let step = 0; step <= 5; step++) {
    const current = makeRecords();
    const { passport, detailsSection, ...draft } = current.draft;
    draft.step = step;
    draft.people[0].dob = "02/04/1987";
    draft.people[0].first = "Example";
    const legacy = { ...current, version: 1, draft };
    const result = migrateRecords(legacy);
    assert.equal(result.version, 2);
    assert.equal(result.draft.step, step >= 4 ? step - 3 : 0);
    assert.equal(
      result.draft.detailsSection,
      step === 2 ? "contact" : step === 3 ? "family" : "personal",
    );
    assert.equal(result.draft.people[0].dob, "1987-02-04");
    assert.equal(result.draft.people[0].first, "Example");
    assert.deepEqual(result.photos, legacy.photos);
    assert.deepEqual(result.entries, legacy.entries);
    assert.deepEqual(result.draft.passport, passport);
    assert.deepEqual(migrateRecords(result), result);
    assert.equal(legacy.draft.people[0].dob, "02/04/1987");
  }
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
