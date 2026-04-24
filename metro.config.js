const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Work around package-exports resolution issues on some Metro/Windows setups.
// Disabling exports forces Metro to use main/module field resolution which is more stable.
config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: false,
};

config.transformer = {
  ...config.transformer,
  minifierPath: 'metro-minify-terser',
};

module.exports = config;
