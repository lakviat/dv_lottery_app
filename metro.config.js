const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
const root = __dirname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Keep Xcode's generated products, result bundles, and native test sources out of Metro.
config.resolver.blockList = [
  new RegExp(`^${root}/build/.*$`),
  /\/DVLottery\.xcodeproj\/.*$/,
  /\/DVLotteryTests\/.*$/,
  /\/DVLotteryUITests\/.*$/,
];
module.exports = config;
