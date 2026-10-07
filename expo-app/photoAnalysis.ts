import * as FileSystem from "expo-file-system/legacy";
import { ImageManipulator, type ImageRef } from "expo-image-manipulator";
import PassportReader from "../modules/passport-reader";
import type { PhotoCheckReport } from "./photoCheckTypes";
import { createPhotoCheckReport, decodePhotoBase64, decodePhotoMetadata, type PreparedPhotoMetadata } from "./photoChecks";

const maxHeaderBytes = 1024 * 1024;

function ownedPhotoURI(uri: string): boolean {
  if (!FileSystem.documentDirectory) return false;
  try {
    const photo = new URL(uri);
    const directory = new URL(`${FileSystem.documentDirectory}dv-lottery-photos/`);
    const path = decodeURIComponent(photo.pathname);
    const root = decodeURIComponent(directory.pathname);
    return photo.protocol === "file:" && photo.host === directory.host &&
      !photo.search && !photo.hash && path.startsWith(root) &&
      path.length > root.length && !path.split("/").some((part) => part === "." || part === "..");
  } catch {
    return false;
  }
}

export async function analyzePhoto(uri: string): Promise<PhotoCheckReport> {
  let metadata: PreparedPhotoMetadata = {};
  let fileVerified = false;
  try {
    if (!ownedPhotoURI(uri)) return createPhotoCheckReport({ unreadable: true }, { nativeStatus: "failed" });
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists || info.isDirectory)
      return createPhotoCheckReport({ unreadable: true }, { nativeStatus: "failed" });
    metadata = { bytes: info.size };
    const encoded = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
      position: 0,
      length: Math.min(info.size, maxHeaderBytes),
    });
    const data = decodePhotoBase64(encoded);
    metadata = decodePhotoMetadata(data, info.size);
    if (metadata.unreadable) return createPhotoCheckReport(metadata, { nativeStatus: "failed" });
    // Oversized files already fail deterministic checks; don't allocate an unbounded decoded image.
    if (info.size > 8 * 1024 * 1024 || (metadata.width ?? 0) > 4096 || (metadata.height ?? 0) > 4096)
      return createPhotoCheckReport(metadata, { nativeStatus: "failed" });
    const context = ImageManipulator.manipulate(uri);
    let image: ImageRef | undefined;
    try {
      // Decode using the installed Expo framework. No edits, save, or replacement file.
      image = await context.renderAsync();
      if (image.width <= 0 || image.height <= 0) throw new Error("Photo could not be opened.");
    } finally {
      image?.release();
      context.release();
    }
    metadata = { ...metadata, unreadable: false };
    fileVerified = true;
    if (typeof PassportReader?.analyzePhoto !== "function")
      return createPhotoCheckReport(metadata, { nativeStatus: "unsupported" });
    const observations = await PassportReader.analyzePhoto(uri);
    return createPhotoCheckReport(metadata, { observations, nativeStatus: "available" });
  } catch {
    // Never expose native diagnostics, image data, or local file paths in persisted reports.
    return createPhotoCheckReport(
      fileVerified ? metadata : { ...metadata, unreadable: true },
      { nativeStatus: "failed" },
    );
  }
}
