const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs', 'mjs');
config.transformer = {
  ...config.transformer,
  minifierPath: 'metro-minify-terser',
};

module.exports = config;
