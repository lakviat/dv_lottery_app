import test from "node:test";
import assert from "node:assert/strict";
import type { NativePhotoObservations } from "../modules/passport-reader";
import type { PhotoCheckReport, PhotoCheckState } from "./photoCheckTypes";
import {
  createPhotoCheckReport,
  decodePhotoBase64,
  decodePhotoMetadata,
  failedPhotoCheckReport,
  hasTechnicalPhotoFailure,
  photoCheckSummary,
} from "./photoChecks";

const prepared = { width: 600, height: 600, bytes: 240000, format: "JPEG" as const, unreadable: false };
const confident: NativePhotoObservations = {
  faceCount: 1, confidentFaceCount: 1, faceConfidence: 0.99, faceCenterX: 0.5,
  yawDegrees: 0, rollDegrees: 0, pitchDegrees: 0,
  landmarksConfidence: 0.99, leftEyeAspectRatio: 0.25, rightEyeAspectRatio: 0.25,
  colorSampleCount: 16000, colorfulPixelFraction: 0.1,
  edgeSampleCount: 1500, edgeMean: 0.02, edgeStrongFraction: 0.1,
  backgroundSampleCount: 2000, backgroundWhiteFraction: 0.95, backgroundLuminanceDeviation: 0.03,
};
const report = (observations: NativePhotoObservations = confident) =>
  createPhotoCheckReport(prepared, { observations, nativeStatus: "available" });
const state = (value: PhotoCheckReport, id: string) => {
  const check = value.checks.find((item) => item.id === id);
  assert.ok(check, `Missing ${id}`);
  return check.state;
};
const jpegHeader = (width = 600, height = 600, marker = 0xc0) => Uint8Array.from([
  0xff, 0xd8,
  0xff, 0xe1, 0, 6, 69, 120, 105, 102,
  0xff, marker, 0, 17, 8,
  height >> 8, height & 255, width >> 8, width & 255,
  3, 1, 0x11, 0, 2, 0x11, 1, 3, 0x11, 1,
]);

test("base64 photo bytes decode without browser or third-party globals", () => {
  for (const length of [0, 1, 2, 3, 256, 240000]) {
    const data = Uint8Array.from({ length }, (_, index) => index & 255);
    const encoded = Buffer.from(data).toString("base64");
    assert.deepEqual(decodePhotoBase64(encoded), data);
    assert.deepEqual(decodePhotoBase64(` \n${encoded}\r\n`), data);
  }
  for (const invalid of ["a", "a===", "!!!!", "=AAA", "ab==", "AA=A"])
    assert.throws(() => decodePhotoBase64(invalid), /could not be read/);
  const original = jpegHeader();
  assert.deepEqual(decodePhotoMetadata(decodePhotoBase64(Buffer.from(original).toString("base64"))),
    decodePhotoMetadata(original));
});

test("JPEG dimensions come from encoded frame data, including progressive files", () => {
  for (const marker of [0xc0, 0xc1, 0xc2]) {
    const metadata = decodePhotoMetadata(jpegHeader(600, 600, marker), 240000);
    assert.deepEqual(metadata, { width: 600, height: 600, bytes: 240000, format: "JPEG" });
    assert.ok(createPhotoCheckReport({ ...metadata, unreadable: false }).checks
      .filter((check) => check.kind === "technical").every((check) => check.state === "pass"));
  }
});

test("JPEG header parser handles marker padding and standalone markers", () => {
  const normal = jpegHeader();
  const padded = Uint8Array.from([0xff, 0xd8, 0xff, 0xff, 0x01, ...normal.slice(2)]);
  assert.equal(decodePhotoMetadata(padded).width, 600);
});

test("JPEG truncated or malformed headers do not invent dimensions", () => {
  const input = jpegHeader();
  for (const length of [3, 4, 7, 14, input.length - 1]) {
    const metadata = decodePhotoMetadata(input.slice(0, length));
    assert.equal(metadata.unreadable, true);
    assert.equal(metadata.width, undefined);
    assert.equal(metadata.height, undefined);
    assert.ok(createPhotoCheckReport(metadata).error);
  }
  for (const length of [0, 1, 7, 18, 255]) {
    const malformed = jpegHeader();
    malformed[13] = length;
    assert.equal(decodePhotoMetadata(malformed).unreadable, true);
  }
  const noFrame = Uint8Array.from([0xff, 0xd8, 0xff, 0xda, 0, 8, 0, 0, 0, 0, 0, 0]);
  assert.equal(decodePhotoMetadata(noFrame).unreadable, true);
});

test("JPEG zero dimensions and inconsistent component counts remain unknown", () => {
  assert.equal(decodePhotoMetadata(jpegHeader(0, 600)).unreadable, true);
  assert.equal(decodePhotoMetadata(jpegHeader(600, 0)).unreadable, true);
  const malformed = jpegHeader();
  malformed[19] = 4;
  assert.equal(decodePhotoMetadata(malformed).unreadable, true);
});

test("file signatures override extensions and retain known non-JPEG dimensions", () => {
  const png = Uint8Array.from([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
    0, 0, 2, 88, 0, 0, 2, 88,
  ]);
  const pngReport = createPhotoCheckReport(decodePhotoMetadata(png));
  assert.equal(pngReport.format, "PNG");
  assert.equal(state(pngReport, "jpeg"), "attention");
  assert.equal(state(pngReport, "dimensions"), "pass");
  assert.equal(hasTechnicalPhotoFailure(pngReport), true);
  const gif = Uint8Array.from([71, 73, 70, 56, 57, 97, 88, 2, 88, 2]);
  assert.equal(decodePhotoMetadata(gif).format, "GIF");
  assert.equal(decodePhotoMetadata(gif).width, 600);
  assert.equal(decodePhotoMetadata(Uint8Array.from([0, 1, 2])).format, "Unknown");
});

test("600 × 600 and the decimal byte ceiling are exact technical requirements", () => {
  for (const bytes of [1, 239999, 240000])
    assert.equal(state(createPhotoCheckReport({ ...prepared, bytes }), "file-size"), "pass");
  for (const bytes of [0, 240001, 245760])
    assert.equal(state(createPhotoCheckReport({ ...prepared, bytes }), "file-size"), "attention");
  for (const [width, height, dimensions, square] of [
    [600, 600, "pass", "pass"],
    [599, 599, "attention", "pass"],
    [1200, 1200, "attention", "pass"],
    [600, 601, "attention", "attention"],
  ] as const) {
    const value = createPhotoCheckReport({ ...prepared, width, height });
    assert.equal(state(value, "dimensions"), dimensions);
    assert.equal(state(value, "square"), square);
  }
});

test("missing or invalid numeric metadata is unverified, never a fabricated pass", () => {
  for (const value of [undefined, NaN, Infinity, -1, 600.5]) {
    const result = createPhotoCheckReport({ width: value, height: value, bytes: value });
    assert.equal(state(result, "dimensions"), "unverified");
    assert.equal(state(result, "square"), "unverified");
    assert.equal(state(result, "file-size"), "unverified");
    assert.equal(photoCheckSummary(result).label, "Unable to verify");
  }
  assert.equal(state(createPhotoCheckReport({}), "jpeg"), "unverified");
});

test("not checked is distinct from unavailable, empty, and manual-only reports", () => {
  assert.deepEqual(photoCheckSummary(), {
    label: "Not checked", tone: "neutral", passed: 0, attention: 0, unverified: 0,
  });
  const value = report();
  assert.equal(photoCheckSummary({ ...value, checks: [] }).label, "Unable to verify");
  assert.equal(photoCheckSummary({ ...value, checks: value.checks.filter((check) => check.kind === "manual") }).tone, "neutral");
  assert.equal(hasTechnicalPhotoFailure(), false);
});

test("Expo Go and old native builds retain technical results and unknown visual checks", () => {
  const value = createPhotoCheckReport(prepared, { nativeStatus: "unsupported" });
  assert.equal(value.checks.filter((check) => check.state === "pass").length, 5);
  assert.ok(value.checks.filter((check) => check.kind === "heuristic")
    .every((check) => check.state === "unverified" && check.detail.includes("unavailable")));
  assert.equal(value.error, undefined);
  assert.equal(photoCheckSummary(value).label, "Unable to verify");
  assert.equal(photoCheckSummary(value).tone, "neutral");
  assert.equal(hasTechnicalPhotoFailure(value), false);
});

test("unsupported manual reviews coexist with passing automated checks", () => {
  const value = report();
  assert.equal(photoCheckSummary(value).label, "Passes automated checks");
  assert.equal(photoCheckSummary(value).tone, "green");
  assert.equal(photoCheckSummary(value).passed, 12);
  assert.equal(photoCheckSummary(value).unverified, 7);
  assert.ok(value.checks.filter((check) => check.kind === "manual").every((check) => check.state === "unverified"));
});

test("technical and heuristic unknowns are not green, even when all other checks pass", () => {
  for (const id of ["dimensions", "frontal-pose"]) {
    const value = report();
    value.checks = value.checks.map((check) => check.id === id ? { ...check, state: "unverified" } : check);
    assert.equal(photoCheckSummary(value).label, "Unable to verify");
    assert.equal(photoCheckSummary(value).tone, "neutral");
  }
});

test("only deterministic technical attention blocks photo completion", () => {
  const warning = report({ ...confident, yawDegrees: 30, colorfulPixelFraction: 0 });
  assert.equal(photoCheckSummary(warning).label, "Needs attention");
  assert.equal(photoCheckSummary(warning).tone, "warm");
  assert.equal(hasTechnicalPhotoFailure(warning), false);
  const technical = createPhotoCheckReport({ ...prepared, bytes: 240001 }, { observations: confident });
  assert.equal(hasTechnicalPhotoFailure(technical), true);
  assert.equal(photoCheckSummary(technical).attention, 1);
});

test("failed analysis has explicit retry copy and preserves known technical checks", () => {
  const failed = failedPhotoCheckReport();
  assert.match(failed.error!, /Retry analysis/);
  assert.equal(failed.version, 1);
  assert.ok(Number.isFinite(Date.parse(failed.checkedAt)));
  assert.equal(failed.checks.filter((check) => check.kind === "technical").length, 5);
  assert.ok(failed.checks.every((check) => check.state === "unverified"));
  assert.equal(photoCheckSummary(failed).label, "Unable to verify");
  assert.equal(hasTechnicalPhotoFailure(failed), false);
  const partial = createPhotoCheckReport({ bytes: 240001 }, { nativeStatus: "failed" });
  assert.equal(partial.bytes, 240001);
  assert.equal(state(partial, "file-size"), "attention");
  assert.equal(state(partial, "dimensions"), "unverified");
  assert.equal(hasTechnicalPhotoFailure(partial), true);
  assert.equal(photoCheckSummary(partial).label, "Needs attention");
  const nativeFailure = createPhotoCheckReport(prepared, { nativeStatus: "failed" });
  assert.equal(nativeFailure.checks.filter((check) => check.state === "pass").length, 5);
  assert.equal(photoCheckSummary(nativeFailure).label, "Unable to verify");
  assert.equal(photoCheckSummary({ ...report(), error: "Retry analysis." }).tone, "neutral");
});

test("missing, unreadable and invalid files block without inventing other technical results", () => {
  for (const metadata of [{ unreadable: true }, { bytes: 1400, unreadable: true }, { ...prepared, unreadable: true }]) {
    const value = createPhotoCheckReport(metadata, { nativeStatus: "failed" });
    assert.equal(state(value, "readable-file"), "attention");
    assert.equal(hasTechnicalPhotoFailure(value), true);
    assert.equal(photoCheckSummary(value).label, "Needs attention");
    assert.match(value.error!, /Retry analysis/);
  }
  const truncated = createPhotoCheckReport(decodePhotoMetadata(jpegHeader().slice(0, 14)));
  assert.equal(hasTechnicalPhotoFailure(truncated), true);
  assert.equal(state(truncated, "jpeg"), "pass");
  assert.equal(state(truncated, "dimensions"), "unverified");
  const decoderFailure = createPhotoCheckReport({ ...prepared, unreadable: true }, { nativeStatus: "failed" });
  for (const id of ["jpeg", "dimensions", "square", "file-size"])
    assert.equal(state(decoderFailure, id), "pass");
  const visionFailure = createPhotoCheckReport(prepared, { nativeStatus: "failed" });
  assert.equal(state(visionFailure, "readable-file"), "pass");
  assert.equal(hasTechnicalPhotoFailure(visionFailure), false);
  assert.equal(photoCheckSummary(visionFailure).label, "Unable to verify");
});

test("face counts require exactly one confident observation", () => {
  const cases: [NativePhotoObservations, PhotoCheckState][] = [
    [{ faceCount: 1, confidentFaceCount: 1, faceConfidence: 0.85 }, "pass"],
    [{ faceCount: 1, confidentFaceCount: 1, faceConfidence: 0.849 }, "unverified"],
    [{ faceCount: 0, confidentFaceCount: 0 }, "unverified"],
    [{ faceCount: 2, confidentFaceCount: 1 }, "unverified"],
    [{ faceCount: 2, confidentFaceCount: 2 }, "attention"],
    [{ faceCount: 1, confidentFaceCount: 2 }, "unverified"],
    [{ faceCount: NaN, confidentFaceCount: 1 }, "unverified"],
  ];
  for (const [change, expected] of cases) {
    const value = report({ ...confident, ...change });
    assert.equal(state(value, "face-count"), expected);
    if (expected !== "pass") {
      for (const id of ["face-centering", "frontal-pose", "eye-outline", "sharpness", "background"])
        assert.equal(state(value, id), "unverified");
    }
    assert.equal(hasTechnicalPhotoFailure(value), false);
  }
});

test("centering uses conservative pass, uncertain, and warning bands", () => {
  for (const [faceCenterX, expected] of [
    [0.42, "pass"], [0.58, "pass"], [0.4199, "unverified"], [0.65, "unverified"],
    [0.34, "attention"], [0.66, "attention"], [NaN, "unverified"], [1.1, "unverified"],
  ] as const)
    assert.equal(state(report({ ...confident, faceCenterX }), "face-centering"), expected);
});

test("pose includes guarded pitch and never passes on missing or invalid estimates", () => {
  const cases: [Partial<NativePhotoObservations>, PhotoCheckState][] = [
    [{ yawDegrees: 10, rollDegrees: -8, pitchDegrees: 12 }, "pass"],
    [{ yawDegrees: 10.01 }, "unverified"], [{ rollDegrees: 8.01 }, "unverified"],
    [{ pitchDegrees: 12.01 }, "unverified"], [{ pitchDegrees: undefined }, "unverified"],
    [{ yawDegrees: -20 }, "attention"], [{ rollDegrees: 15 }, "attention"],
    [{ pitchDegrees: -20 }, "attention"], [{ yawDegrees: Infinity }, "unverified"],
    [{ pitchDegrees: 91 }, "unverified"],
  ];
  for (const [change, expected] of cases)
    assert.equal(state(report({ ...confident, ...change }), "frontal-pose"), expected);
});

test("eye estimates require confident landmarks, frontal pose, and clear geometry", () => {
  const cases: [Partial<NativePhotoObservations>, PhotoCheckState][] = [
    [{ landmarksConfidence: 0.9, leftEyeAspectRatio: 0.18 }, "pass"],
    [{ landmarksConfidence: 0.899 }, "unverified"],
    [{ leftEyeAspectRatio: 0.179 }, "unverified"],
    [{ leftEyeAspectRatio: 0.08 }, "attention"],
    [{ rightEyeAspectRatio: 0 }, "attention"],
    [{ rightEyeAspectRatio: undefined }, "unverified"],
    [{ leftEyeAspectRatio: 0.6 }, "unverified"],
    [{ yawDegrees: 11, leftEyeAspectRatio: 0 }, "unverified"],
    [{ pitchDegrees: undefined }, "unverified"],
  ];
  for (const [change, expected] of cases)
    assert.equal(state(report({ ...confident, ...change }), "eye-outline"), expected);
});

test("color samples distinguish evidence, very little color, and uncertainty", () => {
  const cases: [Partial<NativePhotoObservations>, PhotoCheckState][] = [
    [{ colorSampleCount: 1000, colorfulPixelFraction: 0.025 }, "pass"],
    [{ colorSampleCount: 999 }, "unverified"],
    [{ colorfulPixelFraction: 0.0249 }, "unverified"],
    [{ colorfulPixelFraction: 0.001 }, "attention"],
    [{ colorfulPixelFraction: -1 }, "unverified"],
    [{ colorfulPixelFraction: NaN }, "unverified"],
  ];
  for (const [change, expected] of cases)
    assert.equal(state(report({ ...confident, ...change }), "color"), expected);
});

test("broad sharpness needs sufficient facial samples and both edge measures", () => {
  const cases: [Partial<NativePhotoObservations>, PhotoCheckState][] = [
    [{ edgeSampleCount: 400, edgeMean: 0.012, edgeStrongFraction: 0.05 }, "pass"],
    [{ edgeSampleCount: 399 }, "unverified"],
    [{ edgeMean: 0.0119 }, "unverified"],
    [{ edgeMean: 0.004, edgeStrongFraction: 0.006 }, "attention"],
    [{ edgeMean: 0.004, edgeStrongFraction: 0.1 }, "unverified"],
    [{ edgeMean: NaN }, "unverified"],
  ];
  for (const [change, expected] of cases)
    assert.equal(state(report({ ...confident, ...change }), "sharpness"), expected);
});

test("outer background samples use conservative lightness and uniformity bands", () => {
  const cases: [Partial<NativePhotoObservations>, PhotoCheckState][] = [
    [{ backgroundSampleCount: 300, backgroundWhiteFraction: 0.9, backgroundLuminanceDeviation: 0.06 }, "pass"],
    [{ backgroundSampleCount: 299 }, "unverified"],
    [{ backgroundWhiteFraction: 0.899 }, "unverified"],
    [{ backgroundWhiteFraction: 0.55 }, "attention"],
    [{ backgroundLuminanceDeviation: 0.16 }, "attention"],
    [{ backgroundLuminanceDeviation: undefined }, "unverified"],
    [{ backgroundWhiteFraction: 2 }, "unverified"],
  ];
  for (const [change, expected] of cases)
    assert.equal(state(report({ ...confident, ...change }), "background"), expected);
});

test("reports persist only structured checks and file metadata, not raw observations", () => {
  const value = report();
  assert.deepEqual(Object.keys(value).sort(), ["bytes", "checkedAt", "checks", "format", "height", "version", "width"]);
  assert.ok(value.checks.every((check) =>
    Object.keys(check).sort().join(",") === "detail,id,kind,label,state"));
  assert.equal(new Set(value.checks.map((check) => check.id)).size, value.checks.length);
  for (const raw of ["faceConfidence", "faceCenterX", "yawDegrees", "AspectRatio", "landmarksConfidence"])
    assert.equal(JSON.stringify(value).includes(raw), false);
});

test("full head, accessories, religious coverings and originality are explicitly manual", () => {
  const value = report();
  for (const id of ["head-size", "eye-height", "eyeglasses", "head-coverings", "objects", "original-photo"]) {
    const check = value.checks.find((item) => item.id === id)!;
    assert.equal(check.kind, "manual");
    assert.equal(check.state, "unverified");
  }
  assert.match(value.checks.find((check) => check.id === "head-size")!.detail, /cannot measure/);
  assert.match(value.checks.find((check) => check.id === "head-coverings")!.detail, /religious head coverings may be allowed/);
});
