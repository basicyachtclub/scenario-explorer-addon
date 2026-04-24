/**
 * Masterportal webpack may not resolve addon dependencies from /masterportal/addons paths.
 * Pin packages to /masterportal/node_modules (installed in Dockerfile.dev).
 */
const fs = require("fs");
const path = require("path");

const webpackCommon = path.join("/masterportal", "devtools", "webpack.common.js");
let src = fs.readFileSync(webpackCommon, "utf8");
if (src.includes("ScenarioExplorerAddonAliases")) {
  process.exit(0);
}
const resolveOpen = `        resolve: {
            alias: {`;
if (!src.includes(resolveOpen)) {
  console.error("patch-webpack: resolve block not found");
  process.exit(1);
}
src = src.replace(
  resolveOpen,
  `        resolve: {
            modules: [
                path.resolve(__dirname, "..", "node_modules"),
                "node_modules"
            ],
            alias: {`
);

const needle = `"variables": path.resolve(__dirname, "..", "src", "assets", "css", "variables.scss")`;
if (!src.includes(needle)) {
  console.error("patch-webpack: variables alias needle not found");
  process.exit(1);
}
const insert = `${needle},
                "@vueform/slider": path.resolve(__dirname, "..", "node_modules", "@vueform", "slider") /* ScenarioExplorerAddonAliases */`;
fs.writeFileSync(webpackCommon, src.replace(needle, insert));
