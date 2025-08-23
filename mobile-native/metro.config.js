const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const withStorybook = require("@storybook/react-native/metro/withStorybook");
const path = require("path");

const config = getDefaultConfig(__dirname);

module.exports = withStorybook(
  withNativeWind(config, { input: "./global.css" }),
  {
    enabled: true,
    configPath: path.resolve(__dirname, "./.rnstorybook"),
  }
);
