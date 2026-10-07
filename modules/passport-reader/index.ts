import { requireOptionalNativeModule } from "expo";

// Transient, on-device measurements only. Persist PhotoCheckReport, not these observations.
export type NativePhotoObservations = {
  faceCount?: number;
  confidentFaceCount?: number;
  faceConfidence?: number;
  faceCenterX?: number;
  yawDegrees?: number;
  rollDegrees?: number;
  pitchDegrees?: number;
  landmarksConfidence?: number;
  leftEyeAspectRatio?: number;
  rightEyeAspectRatio?: number;
  colorSampleCount?: number;
  colorfulPixelFraction?: number;
  edgeSampleCount?: number;
  edgeMean?: number;
  edgeStrongFraction?: number;
  backgroundSampleCount?: number;
  backgroundWhiteFraction?: number;
  backgroundLuminanceDeviation?: number;
};

export type PassportReaderModule = {
  recognize(uri: string): Promise<string[]>;
  // Older installed development builds may have recognize() without analyzePhoto().
  analyzePhoto?(uri: string): Promise<NativePhotoObservations>;
};

// Expo Go does not contain this module. Keep the rest of the app usable there.
export default requireOptionalNativeModule<PassportReaderModule>("PassportReader");
