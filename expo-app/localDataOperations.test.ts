import test from "node:test";
import assert from "node:assert/strict";
import { createLocalDataOperations } from "./localDataOperations";

test("clear waits for every import, analysis, save and cleanup lease", () => {
  const operations = createLocalDataOperations();
  const finishImport = operations.beginPhotoOperation();
  const finishCheck = operations.beginPhotoOperation();
  assert.equal(operations.beginClear(), false);
  finishCheck();
  assert.equal(operations.beginClear(), false);
  finishImport();
  assert.equal(operations.beginClear(), true);
});

test("exclusive deletion rejects new photo work until cleanup is finished", () => {
  const operations = createLocalDataOperations();
  assert.equal(operations.beginClear(), true);
  assert.equal(operations.isClearing(), true);
  assert.throws(() => operations.beginPhotoOperation(), /being cleared/);
  assert.equal(operations.beginClear(), false);
  operations.finishClear();
  const finish = operations.beginPhotoOperation();
  assert.equal(operations.hasPhotoOperations(), true);
  finish();
  assert.equal(operations.hasPhotoOperations(), false);
});

test("completion and unmount can release the same lease without unlocking another operation", () => {
  const operations = createLocalDataOperations();
  const first = operations.beginPhotoOperation();
  const second = operations.beginPhotoOperation();
  first();
  first();
  assert.equal(operations.beginClear(), false);
  second();
  assert.equal(operations.beginClear(), true);
});
