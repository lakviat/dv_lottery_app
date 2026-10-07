import React from "react";
import { Image } from "react-native";
import appConfig from "../app.json";

export const APP_NAME = appConfig.expo.name;
export const APP_VERSION = appConfig.expo.version;
export const BRAND_MARK = require("../assets/branding/mark.png");

/** Shared artwork for the header, welcome tour and opening state. */
export function BrandMark({ size = 43 }: { size?: number }) {
  return (
    <Image
      source={BRAND_MARK}
      style={{ width: size, height: size, flexShrink: 0 }}
      accessible={false}
      accessibilityIgnoresInvertColors
    />
  );
}
