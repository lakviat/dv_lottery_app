import React from "react";
import { Image } from "react-native";
import appConfig from "../app.json";

export const APP_NAME = appConfig.expo.name;

/** Shared artwork for the header, welcome tour and opening state. */
export function BrandMark({ size = 43 }: { size?: number }) {
  return (
    <Image
      source={require("../assets/branding/mark.png")}
      style={{ width: size, height: size, flexShrink: 0 }}
      accessible={false}
      accessibilityIgnoresInvertColors
    />
  );
}
