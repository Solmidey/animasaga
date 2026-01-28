/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  webpack: (config) => {
    config.resolve.alias["@react-native-async-storage/async-storage"] = path.resolve(
      __dirname,
      "lib/stubs/async-storage.ts"
    );
    return config;
  },
};

module.exports = nextConfig;
