import type { NativePhotoObservations } from "../modules/passport-reader";
import type { PhotoCheck, PhotoCheckReport, PhotoCheckState } from "./photoCheckTypes";

export type PreparedPhotoMetadata = {
  width?: number;
  height?: number;
  bytes?: number;
  format?: "JPEG" | "PNG" | "GIF" | "Unknown";
  unreadable?: boolean;
};

export type PhotoAnalysisOptions = {
  observations?: NativePhotoObservations;
  nativeStatus?: "available" | "unsupported" | "failed";
};

const retryMessage = "Photo analysis could not finish. Retry analysis or choose another original photo. Review all unverified checks yourself.";
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const unit = (value: unknown): value is number => finite(value) && value >= 0 && value <= 1;
const positiveInteger = (value: unknown): value is number => finite(value) && Number.isInteger(value) && value > 0;
const count = (value: unknown): value is number => finite(value) && Number.isInteger(value) && value >= 0;

// React Native does not guarantee the browser atob global.
export function decodePhotoBase64(encoded: string): Uint8Array {
  const text = encoded.replace(/\s/g, "");
  if (text.length % 4 !== 0) throw new Error("Photo bytes could not be read.");
  const padding = text.endsWith("==") ? 2 : text.endsWith("=") ? 1 : 0;
  const data = new Uint8Array(text.length / 4 * 3 - padding);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let buffer = 0, bits = 0, offset = 0;
  for (let index = 0; index < text.length - padding; index++) {
    const value = alphabet.indexOf(text[index]);
    if (value < 0) throw new Error("Photo bytes could not be read.");
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      data[offset++] = (buffer >> bits) & 255;
    }
  }
  if ((buffer & ((1 << bits) - 1)) !== 0 || offset !== data.length)
    throw new Error("Photo bytes could not be read.");
  return data;
}

// Read encoded dimensions, not picker metadata, file extensions, or resize intentions.
// This is a header parser, not a substitute for decoding the photo or official review.
export function decodePhotoMetadata(data: Uint8Array, bytes = data.length): PreparedPhotoMetadata {
  const metadata: PreparedPhotoMetadata = { bytes, format: "Unknown" };
  const u16 = (at: number) => data[at] * 256 + data[at + 1];
  const u32 = (at: number) => data[at] * 16777216 + data[at + 1] * 65536 + data[at + 2] * 256 + data[at + 3];
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    metadata.format = "JPEG";
    let offset = 2;
    while (offset < data.length) {
      if (data[offset++] !== 0xff) break;
      while (offset < data.length && data[offset] === 0xff) offset++;
      if (offset >= data.length) break;
      const marker = data[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (marker === 0x00 || marker === 0xd8 || offset + 2 > data.length) break;
      const length = u16(offset);
      if (length < 2 || offset + length > data.length) break;
      const isFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isFrame) {
        if (length < 8) break;
        const components = data[offset + 7];
        if (components < 1 || length !== 8 + 3 * components) break;
        const height = u16(offset + 3);
        const width = u16(offset + 5);
        if (!width || !height) break;
        metadata.width = width;
        metadata.height = height;
        return metadata;
      }
      offset += length;
    }
    return { ...metadata, unreadable: true };
  }
  if (data.length >= 24 &&
      [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => data[index] === value) &&
      u32(8) === 13 && [73, 72, 68, 82].every((value, index) => data[12 + index] === value)) {
    return { ...metadata, format: "PNG", width: u32(16), height: u32(20) };
  }
  if (data.length >= 10 && data[0] === 71 && data[1] === 73 && data[2] === 70 &&
      data[3] === 56 && (data[4] === 55 || data[4] === 57) && data[5] === 97) {
    return { ...metadata, format: "GIF", width: data[6] + 256 * data[7], height: data[8] + 256 * data[9] };
  }
  return { ...metadata, unreadable: true };
}

function technicalChecks(metadata: PreparedPhotoMetadata): PhotoCheck[] {
  const dimensionsKnown = positiveInteger(metadata.width) && positiveInteger(metadata.height);
  const bytesKnown = count(metadata.bytes);
  const result = (known: boolean, passes: boolean): PhotoCheckState =>
    known ? (passes ? "pass" : "attention") : "unverified";
  return [
    {
      id: "readable-file", label: "Readable saved photo", kind: "technical",
      state: metadata.unreadable === true ? "attention" : metadata.unreadable === false ? "pass" : "unverified",
      detail: metadata.unreadable === true
        ? "The saved photo is missing or could not be opened as an image. Retry analysis or choose another original photo."
        : metadata.unreadable === false ? "The saved photo was opened successfully on this device."
          : "The saved photo's readability has not been verified.",
    },
    {
      id: "jpeg", label: "JPEG file signature", kind: "technical",
      state: result(metadata.format !== undefined, metadata.format === "JPEG"),
      detail: metadata.format === "JPEG" ? "The saved file has a JPEG signature."
        : metadata.format ? "The saved file is not identified as JPEG. Prepare a new JPEG photo."
          : "The saved file's JPEG signature could not be read. Retry analysis.",
    },
    {
      id: "dimensions", label: "Exactly 600 × 600 pixels", kind: "technical",
      state: result(dimensionsKnown, metadata.width === 600 && metadata.height === 600),
      detail: dimensionsKnown ? `The encoded image is ${metadata.width} × ${metadata.height} pixels.`
        : "Encoded image dimensions could not be read. Retry analysis.",
    },
    {
      id: "square", label: "Square image", kind: "technical",
      state: result(dimensionsKnown, metadata.width === metadata.height),
      detail: dimensionsKnown ? (metadata.width === metadata.height
        ? "Encoded width and height are equal." : "The saved image is not square. Prepare a new square crop.")
        : "The saved image's proportions could not be verified.",
    },
    {
      id: "file-size", label: "No more than 240,000 bytes", kind: "technical",
      state: result(bytesKnown, (metadata.bytes ?? 0) > 0 && (metadata.bytes ?? 0) <= 240000),
      detail: bytesKnown ? `The saved file contains ${metadata.bytes!.toLocaleString("en-US")} bytes.`
        : "The saved file's size could not be read. Retry analysis.",
    },
  ];
}

function heuristicChecks(observations: NativePhotoObservations | undefined, unavailable: string): PhotoCheck[] {
  const o = observations ?? {};
  const singleFace = o.faceCount === 1 && o.confidentFaceCount === 1 &&
    unit(o.faceConfidence) && o.faceConfidence >= 0.85;
  const knownCounts = count(o.faceCount) && count(o.confidentFaceCount) &&
    o.confidentFaceCount <= o.faceCount;
  const check = (id: string, label: string, state: PhotoCheckState, detail: string): PhotoCheck => ({
    id, label, kind: "heuristic", state,
    detail: !observations ? unavailable : detail,
  });
  const faceState = !knownCounts ? "unverified" : singleFace ? "pass"
    : o.confidentFaceCount! >= 2 ? "attention" : "unverified";
  const centerOffset = unit(o.faceCenterX) ? Math.abs(o.faceCenterX - 0.5) : undefined;
  const centerState = !singleFace || centerOffset === undefined ? "unverified"
    : centerOffset <= 0.08 + Number.EPSILON ? "pass"
      : centerOffset >= 0.16 - Number.EPSILON ? "attention" : "unverified";
  const yaw = finite(o.yawDegrees) && Math.abs(o.yawDegrees) <= 90 ? Math.abs(o.yawDegrees) : undefined;
  const roll = finite(o.rollDegrees) && Math.abs(o.rollDegrees) <= 180 ? Math.abs(o.rollDegrees) : undefined;
  const pitch = finite(o.pitchDegrees) && Math.abs(o.pitchDegrees) <= 90 ? Math.abs(o.pitchDegrees) : undefined;
  const poseWarning = (yaw !== undefined && yaw >= 20) || (roll !== undefined && roll >= 15) ||
    (pitch !== undefined && pitch >= 20);
  const poseState = !singleFace ? "unverified" : poseWarning ? "attention"
    : yaw !== undefined && yaw <= 10 && roll !== undefined && roll <= 8 && pitch !== undefined && pitch <= 12
      ? "pass" : "unverified";
  const eyesReliable = singleFace && unit(o.landmarksConfidence) && o.landmarksConfidence >= 0.9 &&
    yaw !== undefined && yaw <= 10 && roll !== undefined && roll <= 8 &&
    pitch !== undefined && pitch <= 12 &&
    unit(o.leftEyeAspectRatio) && unit(o.rightEyeAspectRatio) &&
    o.leftEyeAspectRatio <= 0.5 && o.rightEyeAspectRatio <= 0.5;
  const eyesState = !eyesReliable ? "unverified"
    : o.leftEyeAspectRatio! <= 0.08 || o.rightEyeAspectRatio! <= 0.08 ? "attention"
    : o.leftEyeAspectRatio! >= 0.18 && o.rightEyeAspectRatio! >= 0.18 ? "pass" : "unverified";
  const colorReliable = count(o.colorSampleCount) && o.colorSampleCount >= 1000 && unit(o.colorfulPixelFraction);
  const colorState = !colorReliable ? "unverified" : o.colorfulPixelFraction! >= 0.025 ? "pass"
    : o.colorfulPixelFraction! <= 0.001 ? "attention" : "unverified";
  const edgesReliable = singleFace && count(o.edgeSampleCount) && o.edgeSampleCount >= 400 &&
    unit(o.edgeMean) && unit(o.edgeStrongFraction);
  const edgesState = !edgesReliable ? "unverified"
    : o.edgeMean! >= 0.012 && o.edgeStrongFraction! >= 0.05 ? "pass"
    : o.edgeMean! <= 0.004 && o.edgeStrongFraction! <= 0.006 ? "attention" : "unverified";
  const backgroundReliable = singleFace && count(o.backgroundSampleCount) && o.backgroundSampleCount >= 300 &&
    unit(o.backgroundWhiteFraction) && unit(o.backgroundLuminanceDeviation);
  const backgroundState = !backgroundReliable ? "unverified"
    : o.backgroundWhiteFraction! >= 0.9 && o.backgroundLuminanceDeviation! <= 0.06 ? "pass"
    : o.backgroundWhiteFraction! <= 0.55 || o.backgroundLuminanceDeviation! >= 0.16 ? "attention" : "unverified";
  return [
    check("face-count", "One face detected", faceState,
      faceState === "pass" ? "One face was located confidently. Detection is an estimate, not identity verification."
        : faceState === "attention" ? "More than one face may be present. Review the photo or retake it."
          : "Exactly one face could not be located confidently. Review the photo yourself."),
    check("face-centering", "Approximate face centering", centerState,
      centerState === "pass" ? "The detected face appears horizontally centered; check the full head and crop yourself."
        : centerState === "attention" ? "The detected face may be too far to one side. Review the crop."
          : "Horizontal face position is uncertain; check that the full head is centered."),
    check("frontal-pose", "Approximate front-facing pose", poseState,
      poseState === "pass" ? "Estimated yaw, roll and pitch are near front-facing. Confirm a straight-ahead pose."
        : poseState === "attention" ? "The head may be turned or tilted. Review the pose."
          : "A front-facing pose could not be verified reliably; some pose estimates may be unavailable."),
    check("eye-outline", "Eye-outline estimate", eyesState,
      eyesState === "pass" ? "Both eye outlines appear open. Confirm eyes are fully visible and free of glare."
        : eyesState === "attention" ? "One or both eye outlines may be closed. Check eye visibility yourself."
          : "Eye openness or visibility could not be estimated reliably. Confirm both eyes are open and visible."),
    check("color", "Color evidence", colorState,
      colorState === "pass" ? "Sampled pixels contain color. This does not verify natural skin tones or originality."
        : colorState === "attention" ? "Very little color was found. Confirm this is an original color photograph."
          : "There is not enough reliable color evidence. Review the original color photo yourself."),
    check("sharpness", "Broad sharpness estimate", edgesState,
      edgesState === "pass" ? "Some facial detail edges are visible. Review fine detail; this is not a blur guarantee."
        : edgesState === "attention" ? "Very little facial edge detail was found. Check for blur or lost detail."
          : "Sharpness is uncertain. Enlarge the photo and inspect the eyes and facial detail."),
    check("background", "White / off-white background sample", backgroundState,
      backgroundState === "pass" ? "Sampled outer areas look light and fairly uniform. Check the entire background for shadows and objects."
        : backgroundState === "attention" ? "Sampled outer areas may be dark, colored or uneven. Review for a plain white or off-white background."
          : "The background sample is inconclusive. Review the whole background for color, shadows and objects."),
  ];
}

function manualChecks(): PhotoCheck[] {
  return [
    ["head-size", "Full head size: 50–69%", "Check chin to top of head, including hair, against the image height. A Vision face rectangle cannot measure this full-head requirement."],
    ["eye-height", "Eye height: 56–69%", "Review eye height measured from the bottom of the image. This official composition measurement is not verified automatically."],
    ["eyeglasses", "Eyeglasses review", "There is no reliable eyeglasses detector here. Review the official no-eyeglasses rule and any documented medical exception."],
    ["head-coverings", "Head coverings review", "Hats and head coverings are not detected automatically. Daily religious head coverings may be allowed; the full face must be visible without shadows."],
    ["objects", "Headphones and other objects", "There is no reliable detector for headphones, hands or other objects here. Review the photo yourself."],
    ["expression-lighting", "Expression, visibility and shadows", "Confirm a neutral expression, open eyes, closed mouth, and a fully visible face without harsh shadows. Automated estimates do not verify these details."],
    ["original-photo", "Original photo and date", "Confirm the photo is recent, not reused from an earlier entry, and not retouched or altered. File analysis cannot establish its date or authenticity."],
  ].map(([id, label, detail]) => ({ id, label, detail, kind: "manual", state: "unverified" }));
}

export function createPhotoCheckReport(
  metadata: PreparedPhotoMetadata,
  options: PhotoAnalysisOptions = {},
): PhotoCheckReport {
  const failed = metadata.unreadable || options.nativeStatus === "failed";
  const unavailable = failed ? retryMessage
    : "On-device visual analysis is unavailable in this app build. Review this check yourself; file checks still run.";
  const checks = [
    ...technicalChecks(metadata),
    ...heuristicChecks(options.observations, unavailable),
    ...manualChecks(),
  ];
  return {
    version: 1,
    checkedAt: new Date().toISOString(),
    checks,
    ...(positiveInteger(metadata.width) ? { width: metadata.width } : {}),
    ...(positiveInteger(metadata.height) ? { height: metadata.height } : {}),
    ...(count(metadata.bytes) ? { bytes: metadata.bytes } : {}),
    ...(metadata.format ? { format: metadata.format } : {}),
    ...(failed ? { error: retryMessage } : {}),
  };
}

export function failedPhotoCheckReport(): PhotoCheckReport {
  return createPhotoCheckReport({}, { nativeStatus: "failed" });
}

export function hasTechnicalPhotoFailure(report?: PhotoCheckReport): boolean {
  return report?.checks.some((check) => check.kind === "technical" && check.state === "attention") ?? false;
}

export function photoCheckSummary(report?: PhotoCheckReport): {
  label: string;
  tone: "green" | "warm" | "neutral";
  passed: number;
  attention: number;
  unverified: number;
} {
  const checks = report?.checks ?? [];
  const counts = {
    passed: checks.filter((check) => check.state === "pass").length,
    attention: checks.filter((check) => check.state === "attention").length,
    unverified: checks.filter((check) => check.state === "unverified").length,
  };
  if (!report) return { ...counts, label: "Not checked", tone: "neutral" };
  if (counts.attention) return { ...counts, label: "Needs attention", tone: "warm" };
  const supported = checks.filter((check) => check.kind !== "manual");
  if (report.error || !supported.length || supported.some((check) => check.state === "unverified"))
    return { ...counts, label: "Unable to verify", tone: "neutral" };
  return { ...counts, label: "Passes automated checks", tone: "green" };
}
