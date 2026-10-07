import test from "node:test";
import assert from "node:assert/strict";
import { isOwnedPhotoURI, orphanPhotoURIs, ownedPhotoAssets } from "./photoFilePaths";

const directory = "file:///documents/dv-lottery-photos/";
test("photo cleanup owns only generated image paths in its directory", () => {
  assert.equal(isOwnedPhotoURI(`${directory}abc-123.jpg`, directory), true);
  assert.equal(isOwnedPhotoURI(`${directory}abc-123-source.PNG`, directory), true);
  for (const uri of [
    "file:///photos/abc-123.jpg",
    `${directory}../abc-123.jpg`,
    `${directory}nested/abc-123.jpg`,
    `${directory}abc-123.jpg?other`,
    `${directory}notes.txt`,
  ]) assert.equal(isOwnedPhotoURI(uri, directory), false);
});

test("deleting one photo includes only its owned prepared and source copies", () => {
  const photo = { uri: `${directory}abc-123.jpg`, sourceUri: `${directory}abc-123-source.jpg` };
  assert.deepEqual(ownedPhotoAssets(photo, directory), [photo.uri, photo.sourceUri]);
  assert.deepEqual(ownedPhotoAssets({ ...photo, sourceUri: "file:///Photos/original.jpg" }, directory), [photo.uri]);
  assert.deepEqual(ownedPhotoAssets({ ...photo, sourceUri: photo.uri }, directory), [photo.uri]);
});

test("startup cleanup preserves every referenced source and prepared copy", () => {
  const photos = [{ uri: `${directory}abc-123.jpg`, sourceUri: `${directory}abc-123-source.jpg` }];
  const files = ["abc-123.jpg", "abc-123-source.jpg", "old-456.jpg", "old-456-source.png", "notes.txt"];
  assert.deepEqual(orphanPhotoURIs(directory, files, photos), [
    `${directory}old-456.jpg`, `${directory}old-456-source.png`,
  ]);
  assert.equal(orphanPhotoURIs(directory, files, []).length, 4);
});
