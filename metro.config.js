const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Bundle .pdf as a static asset (S94 offline DFO Documents) — 'pdf' is not a default assetExt.
config.resolver.assetExts.push('pdf');

module.exports = config;