const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Los archivos .sql de migración de Drizzle se importan como texto.
config.resolver.sourceExts.push("sql");

module.exports = config;
