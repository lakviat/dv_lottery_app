import { requireOptionalNativeModule } from "expo";

// Expo Go does not contain this module. Keep the rest of the app usable there.
export default requireOptionalNativeModule<{
  recognize(uri: string): Promise<string[]>;
}>("PassportReader");
