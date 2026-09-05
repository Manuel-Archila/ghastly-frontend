module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Permite `import m from "./0000_....sql"` para las migraciones de Drizzle.
    plugins: [["inline-import", { extensions: [".sql"] }]],
  };
};
