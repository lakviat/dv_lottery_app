import * as FileSystem from "expo-file-system/legacy";
import type { Photo } from "./models";
import { isOwnedPhotoURI, orphanPhotoURIs, ownedPhotoAssets } from "./photoFilePaths";

export const photoDirectory = `${FileSystem.documentDirectory}dv-lottery-photos/`;

export async function removePhotoFile(uri: string) {
  if (isOwnedPhotoURI(uri, photoDirectory)) await FileSystem.deleteAsync(uri, { idempotent: true });
}

export async function removePhotoAssets(photo: Pick<Photo, "uri" | "sourceUri">) {
  await Promise.all(ownedPhotoAssets(photo, photoDirectory).map(removePhotoFile));
}

/** Run before exposing the loaded app, never alongside an in-progress import. */
export async function cleanupOrphanPhotoFiles(photos: Photo[]) {
  const directory = await FileSystem.getInfoAsync(photoDirectory);
  if (!directory.exists) return;
  const files = await FileSystem.readDirectoryAsync(photoDirectory);
  await Promise.all(orphanPhotoURIs(photoDirectory, files, photos).map(removePhotoFile));
}
